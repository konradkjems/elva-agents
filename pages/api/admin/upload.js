export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, return a mock response since we don't have Cloudinary configured
    // In production, you would implement actual file upload logic here
    
    const mockUrl = `https://via.placeholder.com/400x400/3b82f6/ffffff?text=Upload+Image`;
    
    res.status(200).json({
      url: mockUrl,
      public_id: 'mock-id',
      width: 400,
      height: 400
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}

