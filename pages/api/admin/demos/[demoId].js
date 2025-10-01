import clientPromise from '../../../../lib/mongodb';
import { withAdmin } from '../../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Authentication - Check for platform admin
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // IMPORTANT: Only platform admins can access demos
  if (session.user?.platformRole !== 'platform_admin') {
    return res.status(403).json({ 
      error: 'Access denied. Demos are only available to platform administrators.' 
    });
  }

  const client = await clientPromise;
  const db = client.db('elva-agents'); // Use new database
  const { demoId } = req.query;

  if (req.method === 'GET') {
    try {
      const demo = await db.collection('demos').findOne({ _id: demoId });
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }
      return res.status(200).json(demo);
    } catch (error) {
      console.error('Error fetching demo:', error);
      return res.status(500).json({ message: 'Failed to fetch demo' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      updateData.updatedAt = new Date();

      const result = await db.collection('demos').updateOne(
        { _id: demoId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      return res.status(200).json({ message: 'Demo updated successfully' });
    } catch (error) {
      console.error('Error updating demo:', error);
      return res.status(500).json({ message: 'Failed to update demo' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await db.collection('demos').deleteOne({ _id: demoId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      return res.status(200).json({ message: 'Demo deleted successfully' });
    } catch (error) {
      console.error('Error deleting demo:', error);
      return res.status(500).json({ message: 'Failed to delete demo' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}



