import { uploadToCloudinary } from '../../../lib/cloudinary';
import formidable from 'formidable';
import fs from 'fs';
import { withAdmin } from '../../../lib/auth';

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Allow images and common file types
        return mimetype && (
          mimetype.startsWith('image/') ||
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain'
        );
      }
    });

    const [fields, files] = await form.parse(req);
    
    // Get the uploaded file
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary using file path
    const uploadResult = await uploadToCloudinary(file.filepath, {
      public_id: `elva-agents/${Date.now()}-${file.originalFilename}`,
      resource_type: 'auto'
    });

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    if (!uploadResult.success) {
      return res.status(500).json({ 
        error: 'Upload failed', 
        details: uploadResult.error 
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up temporary file if it exists
    try {
      if (files?.file?.[0]?.filepath) {
        fs.unlinkSync(files.file[0].filepath);
      }
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
