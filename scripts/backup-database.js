/**
 * Database Backup Script
 * 
 * Alternative to mongodump for MongoDB Atlas users
 * Creates a JSON export of all collections
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully');

    const db = client.db('elva-agents');
    
    // Create backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`📁 Backup directory: ${backupDir}`);

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections to backup`);

    let totalDocuments = 0;

    // Backup each collection
    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`\n📦 Backing up collection: ${collName}`);
      
      const collection = db.collection(collName);
      const documents = await collection.find({}).toArray();
      
      console.log(`   Documents: ${documents.length}`);
      totalDocuments += documents.length;

      // Write to JSON file
      const filename = path.join(backupDir, `${collName}.json`);
      fs.writeFileSync(filename, JSON.stringify(documents, null, 2));
      
      console.log(`   ✅ Saved to ${collName}.json`);
    }

    // Create metadata file
    const metadata = {
      backupDate: new Date().toISOString(),
      database: 'elva-agents',
      totalCollections: collections.length,
      totalDocuments: totalDocuments,
      collections: collections.map(c => ({
        name: c.name,
        documents: 0 // Will be filled during restore if needed
      })),
      mongodbUri: uri.split('@')[1] || 'hidden' // Hide credentials
    };

    fs.writeFileSync(
      path.join(backupDir, '_backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n📊 Backup Summary:');
    console.log(`   Collections: ${collections.length}`);
    console.log(`   Total Documents: ${totalDocuments}`);
    console.log(`   Location: ${backupDir}`);
    console.log('\n✅ Backup completed successfully!');

    return backupDir;

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  backupDatabase()
    .then((backupDir) => {
      console.log(`\n🎉 Success! Backup saved to:`);
      console.log(`   ${backupDir}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup failed');
      process.exit(1);
    });
}

module.exports = { backupDatabase };

