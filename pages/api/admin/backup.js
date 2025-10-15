import clientPromise from '../../../lib/mongodb.js';
import { withAdmin } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const backups = db.collection('backups');

    // Create backup of all collections
    const collections = ['widgets', 'conversations', 'settings'];
    const backupData = {};

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const data = await collection.find({}).toArray();
      backupData[collectionName] = data;
    }

    // Store backup
    const backup = {
      _id: `backup_${Date.now()}`,
      timestamp: new Date(),
      collections: backupData,
      size: JSON.stringify(backupData).length,
      createdAt: new Date()
    };

    await backups.insertOne(backup);

    return res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      backupId: backup._id,
      size: backup.size
    });

  } catch (error) {
    console.error('Backup error:', error);
    return res.status(500).json({ error: 'Failed to create backup' });
  }
}

export default withAdmin(handler);
