import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { uploadToStorage, deleteFromStorage, resizeImage } from '../../../lib/supabase/storage';
import puppeteer from 'puppeteer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve a demo by its embed id (legacy_id), falling back to uuid, across the
// demos table and demo-mode widgets.
async function findDemoRow(demoId) {
  let { data } = await admin.from('demos').select('id, demo_settings').eq('legacy_id', String(demoId)).maybeSingle();
  if (data) return { table: 'demos', row: data };
  if (UUID_RE.test(demoId)) {
    ({ data } = await admin.from('demos').select('id, demo_settings').eq('id', demoId).maybeSingle());
    if (data) return { table: 'demos', row: data };
  }
  ({ data } = await admin.from('widgets').select('id, demo_settings').eq('legacy_id', String(demoId)).eq('is_demo_mode', true).maybeSingle());
  if (data) return { table: 'widgets', row: data };
  if (UUID_RE.test(demoId)) {
    ({ data } = await admin.from('widgets').select('id, demo_settings').eq('id', demoId).eq('is_demo_mode', true).maybeSingle());
    if (data) return { table: 'widgets', row: data };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Admin-only (this drives a headless browser against arbitrary URLs).
  const session = await getSessionContext(req, res);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'POST') {
      const { url, demoId } = req.body;

      if (!url || !demoId) {
        return res.status(400).json({ message: 'URL and demo ID are required' });
      }
      try { new URL(url); } catch { return res.status(400).json({ message: 'Invalid URL format' }); }

      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

        console.log(`📸 Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📸 Taking screenshot...');
        const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
        await browser.close();
        browser = null;

        // Re-encode to webp to cut size; upload to a timestamped path.
        const { buffer, contentType, ext } = await resizeImage(screenshotBuffer, { format: 'webp', quality: 80 });
        const path = `${String(demoId)}/${Date.now()}.${ext}`;
        const result = await uploadToStorage('demo-screenshots', path, buffer, contentType);
        if (!result.success) throw new Error(`Storage upload failed: ${result.error}`);
        console.log(`📸 Screenshot uploaded: ${result.url}`);

        const found = await findDemoRow(demoId);
        if (!found) {
          // Clean up the just-uploaded object since there's nowhere to record it.
          await deleteFromStorage('demo-screenshots', path);
          return res.status(404).json({ message: 'Demo not found' });
        }

        const prevPath = found.row.demo_settings?.screenshotPath || null;
        const newSettings = {
          ...(found.row.demo_settings || {}),
          screenshotUrl: result.url,
          screenshotPath: result.path,
          screenshotCapturedAt: new Date().toISOString(),
        };
        // screenshotPublicId is a Cloudinary leftover — drop it.
        delete newSettings.screenshotPublicId;

        const { error: updErr } = await admin.from(found.table)
          .update({ demo_settings: newSettings }).eq('id', found.row.id);
        if (updErr) throw updErr;

        // Remove the previous screenshot object (best effort).
        if (prevPath && prevPath !== result.path) {
          await deleteFromStorage('demo-screenshots', prevPath);
        }

        return res.status(200).json({
          message: 'Screenshot captured successfully',
          screenshot: {
            url, demoId,
            screenshotUrl: result.url,
            screenshotPath: result.path,
            capturedAt: newSettings.screenshotCapturedAt,
            status: 'captured',
          }
        });

      } catch (error) {
        if (browser) await browser.close();
        throw error;
      }

    } else if (req.method === 'DELETE') {
      const { demoId } = req.body;
      if (!demoId) {
        return res.status(400).json({ message: 'Demo ID is required' });
      }

      const found = await findDemoRow(demoId);
      if (!found) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      // Delete the stored screenshot (path preferred; URL fallback for legacy).
      const settings = found.row.demo_settings || {};
      if (settings.screenshotPath) {
        await deleteFromStorage('demo-screenshots', settings.screenshotPath);
      }

      const cleared = { ...settings };
      delete cleared.screenshotUrl;
      delete cleared.screenshotPath;
      delete cleared.screenshotPublicId;
      delete cleared.screenshotCapturedAt;

      const { error: updErr } = await admin.from(found.table)
        .update({ demo_settings: cleared }).eq('id', found.row.id);
      if (updErr) throw updErr;

      return res.status(200).json({ message: 'Screenshot reset successfully' });
    }

  } catch (error) {
    console.error('Screenshot API error:', error);
    return res.status(500).json({ message: 'Screenshot operation failed', error: error.message });
  }
}
