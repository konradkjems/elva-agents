import clientPromise from '../../../lib/mongodb.js';
import { withAdmin } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('chatwidgets');
    const backups = db.collection('backups');

    // Get the latest backup
    const latestBackup = await backups.findOne(
      {},
      { sort: { timestamp: -1 } }
    );

    if (!latestBackup) {
      return res.status(404).json({ error: 'No backup found' });
    }

    // Restore each collection
    const collections = ['widgets', 'conversations', 'settings'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const backupData = latestBackup.collections[collectionName] || [];
      
      if (backupData.length > 0) {
        // Clear existing data
        await collection.deleteMany({});
        
        // Insert backup data
        await collection.insertMany(backupData);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Database restored successfully',
      backupId: latestBackup._id,
      restoredAt: new Date()
    });

  } catch (error) {
    console.error('Restore error:', error);
    return res.status(500).json({ error: 'Failed to restore database' });
  }
}

export default withAdmin(handler);
