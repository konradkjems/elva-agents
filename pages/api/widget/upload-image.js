import { IncomingForm } from 'formidable';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { widgetLimiter, runMiddleware } from '../../../lib/rate-limit';

// Disable body parser for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  try {
    await runMiddleware(req, res, widgetLimiter);
  } catch (error) {
    return res.status(429).json({ 
      error: 'Too many requests, please slow down',
      retryAfter: '60 seconds'
    });
  }

  try {
    // Parse form data
    const form = new IncomingForm();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const widgetId = Array.isArray(fields.widgetId) ? fields.widgetId[0] : fields.widgetId;
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!widgetId || !imageFile) {
      return res.status(400).json({ error: 'Missing widgetId or image file' });
    }

    // Get widget configuration to check if image upload is enabled
    const client = await clientPromise;
    const db = client.db("elva-agents");
    
    let queryId = widgetId;
    if (ObjectId.isValid(widgetId)) {
      queryId = new ObjectId(widgetId);
    }
    
    const widget = await db.collection("widgets").findOne({ _id: queryId });
    
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Check if image upload is enabled for this widget (check multiple possible locations)
    const imageUploadEnabled = widget.settings?.imageUpload?.enabled || 
                              widget.settings?.imageupload?.enabled || 
                              widget.imageUpload?.enabled || 
                              widget.imageupload?.enabled;
    if (!imageUploadEnabled) {
      return res.status(403).json({ error: 'Image upload not enabled for this widget' });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return res.status(400).json({ error: 'Image size exceeds 5MB limit' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' });
    }

    console.log('📤 Uploading image to Cloudinary:', {
      widgetId,
      fileName: imageFile.originalFilename,
      fileSize: imageFile.size,
      mimeType: imageFile.mimetype
    });

    // Upload to Cloudinary with compression and optimization
    const result = await uploadToCloudinary(imageFile.filepath, {
      folder: 'elva-agents/chat-images',
      transformation: [
        { width: 1024, height: 1024, crop: 'limit' }, // Max 1024x1024 for OpenAI vision
        { quality: 'auto' }, // Auto-optimize quality
        { fetch_format: 'auto' } // Convert to most efficient format
      ],
      resource_type: 'image'
    });

    if (!result.success) {
      console.error('Cloudinary upload failed:', result.error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    console.log('✅ Image uploaded successfully:', {
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format
    });

    res.json({
      success: true,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      public_id: result.public_id
    });

  } catch (error) {
    console.error('Error in /api/widget/upload-image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

