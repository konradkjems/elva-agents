import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Get user
    const user = await db.collection('users').findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Return agent profile
      const agentProfile = user.agentProfile || {
        displayName: null,
        title: null,
        avatarUrl: null,
        isAvailable: false,
        currentActiveChats: []
      };

      return res.status(200).json({
        success: true,
        agentProfile
      });
    }

    if (req.method === 'PUT') {
      const { displayName, title, avatarUrl, isAvailable } = req.body;

      // Update agent profile
      const updateData = {
        'agentProfile.displayName': displayName || null,
        'agentProfile.title': title || null,
        'agentProfile.avatarUrl': avatarUrl || null,
        'agentProfile.isAvailable': isAvailable !== undefined ? isAvailable : false
      };

      // Remove null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null) {
          delete updateData[key];
        }
      });

      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: updateData
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Agent profile updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error managing agent profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

