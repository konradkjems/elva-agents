/**
 * Database Restore Script
 * 
 * Restores database from backup created by backup-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function restoreDatabase(backupDir) {
  if (!backupDir) {
    console.error('❌ Please specify backup directory');
    console.log('\nUsage: node scripts/restore-database.js <backup-directory>');
    console.log('Example: node scripts/restore-database.js ./backups/backup-2024-10-13');
    process.exit(1);
  }

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('elva-agents');
    
    console.log(`📂 Restoring from: ${backupDir}`);

    // Read metadata
    const metadataPath = path.join(backupDir, '_backup-metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.error('❌ Backup metadata not found');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log(`📋 Backup info:`);
    console.log(`   Date: ${metadata.backupDate}`);
    console.log(`   Collections: ${metadata.totalCollections}`);
    console.log(`   Documents: ${metadata.totalDocuments}`);

    // Warning
    console.log('\n⚠️  WARNING: This will OVERWRITE existing data!');
    console.log('   Press Ctrl+C in the next 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Restore each collection
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    
    let totalRestored = 0;

    for (const filename of files) {
      const collName = filename.replace('.json', '');
      console.log(`\n📦 Restoring collection: ${collName}`);
      
      const filePath = path.join(backupDir, filename);
      const documents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (documents.length === 0) {
        console.log(`   Skipping empty collection`);
        continue;
      }

      // Drop existing collection
      try {
        await db.collection(collName).drop();
        console.log(`   🗑️  Dropped existing collection`);
      } catch (error) {
        // Collection might not exist
      }

      // Insert documents
      await db.collection(collName).insertMany(documents);
      console.log(`   ✅ Restored ${documents.length} documents`);
      
      totalRestored += documents.length;
    }

    console.log('\n📊 Restore Summary:');
    console.log(`   Collections restored: ${files.length}`);
    console.log(`   Total documents: ${totalRestored}`);
    console.log('\n✅ Restore completed successfully!');

  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  const backupDir = process.argv[2];
  restoreDatabase(backupDir)
    .then(() => {
      console.log('\n🎉 Database restored successfully!');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { restoreDatabase };

