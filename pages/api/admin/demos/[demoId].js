import clientPromise from '../../../../lib/mongodb';
import { withAdmin } from '../../../../lib/auth';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('chatwidgets');
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



