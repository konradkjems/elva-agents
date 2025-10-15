import clientPromise from '../../../lib/mongodb';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (req.method === 'POST') {
      // Screenshot capture logic
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
        const db = client.db('elva-agents');

        // Update demo with screenshot info (try new demos collection first, then fallback to widgets)
        let updateResult = await db.collection('demos').updateOne(
          { _id: demoId },
          { 
            $set: { 
              'demoSettings.screenshotUrl': screenshotData.screenshotUrl,
              'demoSettings.screenshotPublicId': screenshotData.screenshotPublicId,
              'demoSettings.screenshotCapturedAt': screenshotData.capturedAt,
              updatedAt: new Date()
            }
          }
        );

        // If not found in demos collection, try widgets collection (for backward compatibility)
        if (updateResult.matchedCount === 0) {
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
        }
        
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

    } else if (req.method === 'DELETE') {
      // Screenshot reset logic
      const { demoId } = req.body;

      if (!demoId) {
        return res.status(400).json({ 
          message: 'Demo ID is required' 
        });
      }

      const client = await clientPromise;
      const db = client.db('elva-agents');

      // Get demo to find screenshot info
      const demo = await db.collection('demos').findOne({ _id: demoId });
      
      if (!demo) {
        return res.status(404).json({ 
          message: 'Demo not found' 
        });
      }

      // Delete screenshot from Cloudinary if it exists
      if (demo.demoSettings?.screenshotPublicId) {
        try {
          const { deleteFromCloudinary } = await import('../../../lib/cloudinary');
          await deleteFromCloudinary(demo.demoSettings.screenshotPublicId);
          console.log(`📸 Screenshot deleted from Cloudinary: ${demo.demoSettings.screenshotPublicId}`);
        } catch (error) {
          console.error('Failed to delete screenshot from Cloudinary:', error);
          // Continue even if Cloudinary deletion fails
        }
      }

      // Remove screenshot info from database
      await db.collection('demos').updateOne(
        { _id: demoId },
        { 
          $unset: { 
            'demoSettings.screenshotUrl': "",
            'demoSettings.screenshotPublicId': "",
            'demoSettings.screenshotCapturedAt': ""
          },
          $set: {
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({
        message: 'Screenshot reset successfully'
      });
    }

  } catch (error) {
    console.error('Screenshot API error:', error);
    return res.status(500).json({ 
      message: 'Screenshot operation failed',
      error: error.message 
    });
  }
}
