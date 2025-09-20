import clientPromise from '../../../lib/mongodb';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { url, demoId } = req.body;

    if (!url || !demoId) {
      return res.status(400).json({ 
        message: 'URL and demo ID are required' 
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        message: 'Invalid URL format' 
      });
    }

    let browser;
    try {
      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent screenshots
      await page.setViewport({ 
        width: 1920, 
        height: 1080,
        deviceScaleFactor: 1
      });
      
      // Navigate to the URL with timeout
      console.log(`📸 Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log(`📸 Page loaded, waiting for dynamic content...`);
      // Wait a bit more for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take full page screenshot
      console.log(`📸 Taking screenshot...`);
      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png'
      });
      
      console.log(`📸 Screenshot taken, uploading to Cloudinary...`);
      
      // Convert buffer to base64 for Cloudinary upload
      const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
      
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(screenshotBase64, {
        public_id: `elva-agents/demo-screenshots/demo-${demoId}`,
        folder: 'elva-agents/demo-screenshots',
        resource_type: 'image',
        format: 'png'
      });
      
      if (!uploadResult.success) {
        throw new Error(`Cloudinary upload failed: ${uploadResult.error}`);
      }
      
      console.log(`📸 Screenshot uploaded to Cloudinary: ${uploadResult.url}`);
      
      const screenshotData = {
        url,
        demoId,
        screenshotUrl: uploadResult.url,
        screenshotPublicId: uploadResult.public_id,
        capturedAt: new Date().toISOString(),
        status: 'captured'
      };

      // Store screenshot info in database
      const client = await clientPromise;
      const db = client.db('chatwidgets');

      // Update demo widget with screenshot info
      await db.collection('widgets').updateOne(
        { _id: demoId, isDemoMode: true },
        { 
          $set: { 
            'demoSettings.screenshotUrl': screenshotData.screenshotUrl,
            'demoSettings.screenshotPublicId': screenshotData.screenshotPublicId,
            'demoSettings.screenshotCapturedAt': screenshotData.capturedAt,
            updatedAt: new Date()
          }
        }
      );
      
      await browser.close();
      
      return res.status(200).json({
        message: 'Screenshot captured successfully',
        screenshot: screenshotData
      });
      
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw error;
    }

  } catch (error) {
    console.error('Screenshot capture error:', error);
    return res.status(500).json({ 
      message: 'Screenshot capture failed',
      error: error.message 
    });
  }
}
