import fs from 'fs';
import { IncomingForm } from 'formidable';
import { uploadToStorage, resizeImage } from '../../lib/supabase/storage';
import { admin } from '../../lib/supabase/admin';
import { fromRow } from '../../lib/supabase/transform';
import { widgetLimiter, runMiddleware } from '../../lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Disable body parser for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
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
    // (looked up by the embed id stored as legacy_id, falling back to uuid)
    let { data: widgetRow } = await admin.from('widgets').select('*').eq('legacy_id', String(widgetId)).maybeSingle();
    if (!widgetRow && UUID_RE.test(widgetId)) {
      ({ data: widgetRow } = await admin.from('widgets').select('*').eq('id', widgetId).maybeSingle());
    }

    if (!widgetRow) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    const widget = fromRow(widgetRow);

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

    console.log('📤 Uploading chat image to Supabase Storage:', {
      widgetId,
      fileName: imageFile.originalFilename,
      fileSize: imageFile.size,
      mimeType: imageFile.mimetype
    });

    // Resize to max 1024x1024 for OpenAI vision, re-encode to webp.
    const raw = fs.readFileSync(imageFile.filepath);
    const { buffer, contentType, ext } = await resizeImage(raw, {
      width: 1024, height: 1024, fit: 'inside', format: 'webp'
    });

    // Path: {org}/{widget}/{ts}.webp so chat uploads are scoped per widget.
    const orgSeg = widget.organizationId || 'no-org';
    const path = `${orgSeg}/${String(widgetId)}/${Date.now()}.${ext}`;
    const result = await uploadToStorage('chat-uploads', path, buffer, contentType);

    try { fs.unlinkSync(imageFile.filepath); } catch (_) {}

    if (!result.success) {
      console.error('Storage upload failed:', result.error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    console.log('✅ Image uploaded successfully:', result.url);

    res.json({
      success: true,
      url: result.url,
      format: ext,
      path: result.path
    });

  } catch (error) {
    console.error('Error in /api/upload-image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}