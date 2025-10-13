require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function anonymizeExistingIPs() {
  if (process.argv[2] !== '--confirm') {
    console.error('⚠️  IMPORTANT: This will remove all stored IP addresses from conversations');
    console.log('\nThis is for GDPR compliance (Artikel 5, 32)');
    console.log('\nIf you are sure you want to proceed, run:');
    console.log('   node scripts/anonymize-existing-ips.js --confirm');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    // Check both databases
    const databases = ['elva-agents', 'chatwidgets'];
    
    for (const dbName of databases) {
      const db = client.db(dbName);
      
      console.log(`\n📝 Processing database: ${dbName}`);
      
      // Remove IP field from all conversations
      const result = await db.collection('conversations').updateMany(
        { 'metadata.ip': { $exists: true } },
        { $unset: { 'metadata.ip': '' } }
      );

      console.log(`✅ Removed IP addresses from ${result.modifiedCount} conversations in ${dbName}`);
      
      // Also check for any other IP fields that might exist
      const ipResult = await db.collection('conversations').updateMany(
        { 'metadata.ipAddress': { $exists: true } },
        { $unset: { 'metadata.ipAddress': '' } }
      );
      
      if (ipResult.modifiedCount > 0) {
        console.log(`✅ Also removed ${ipResult.modifiedCount} ipAddress fields in ${dbName}`);
      }
    }

    console.log('\n✅ IP anonymization completed successfully!');
    console.log('ℹ️  Future conversations will only store country-level data.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

anonymizeExistingIPs();

module.exports = { anonymizeExistingIPs };

