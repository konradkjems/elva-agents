import { uploadToStorage, resizeImage } from '../../../lib/supabase/storage';
import formidable from 'formidable';
import fs from 'fs';
import { withAdmin } from '../../../lib/auth';

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

function sanitizeName(name) {
  return (name || 'file').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let files;
  try {
    // Parse the form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return mimetype && (
          mimetype.startsWith('image/') ||
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain'
        );
      }
    });

    let fields;
    [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const raw = fs.readFileSync(file.filepath);
    const mime = file.mimetype || 'application/octet-stream';
    const isRasterImage = mime.startsWith('image/') && mime !== 'image/svg+xml';

    let body, contentType, ext;
    if (isRasterImage) {
      // Normalize + cap dimensions, re-encode to webp.
      const r = await resizeImage(raw, { width: 1024, height: 1024, fit: 'inside', format: 'webp' });
      body = r.buffer; contentType = r.contentType; ext = r.ext;
    } else {
      // SVG / pdf / text: store as-is.
      body = raw; contentType = mime;
      ext = (file.originalFilename?.split('.').pop() || 'bin').toLowerCase();
    }

    const path = `${Date.now()}-${sanitizeName(file.originalFilename).replace(/\.[^.]+$/, '')}.${ext}`;
    const result = await uploadToStorage('widget-assets', path, body, contentType);

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    if (!result.success) {
      return res.status(500).json({ error: 'Upload failed', details: result.error });
    }

    res.status(200).json({
      success: true,
      url: result.url,
      path: result.path,
      bucket: result.bucket,
      format: ext,
    });

  } catch (error) {
    console.error('Upload error:', error);
    try {
      if (files?.file?.[0]?.filepath) fs.unlinkSync(files.file[0].filepath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    res.status(500).json({
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
  }
}

export default withAdmin(handler);
