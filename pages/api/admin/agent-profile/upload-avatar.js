import { uploadToCloudinary } from '../../../lib/cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../../lib/mongodb';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(image, {
      folder: 'elva-agents/avatars',
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    if (!uploadResult.success) {
      return res.status(500).json({ 
        error: 'Failed to upload image',
        details: uploadResult.error
      });
    }

    // Update user's agent profile with avatar URL
    const client = await clientPromise;
    const db = client.db('elva-agents');

    const user = await db.collection('users').findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          'agentProfile.avatarUrl': uploadResult.url
        }
      }
    );

    return res.status(200).json({
      success: true,
      avatarUrl: uploadResult.url
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

