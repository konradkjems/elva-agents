// scripts/migrate-manual-reviews-orgid.js
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrateManualReviews() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    console.log('Please make sure .env.local file exists with MONGODB_URI');
    return;
  }
  
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Find alle manual reviews hvor organizationId er string
    const reviews = await db.collection('support_requests').find({
      organizationId: { $type: 'string' }
    }).toArray();
    
    console.log(`📊 Found ${reviews.length} reviews to migrate`);
    
    if (reviews.length === 0) {
      console.log('✅ No reviews need migration - all organizationId fields are already ObjectId');
      return;
    }
    
    let migrated = 0;
    let failed = 0;
    
    for (const review of reviews) {
      try {
        await db.collection('support_requests').updateOne(
          { _id: review._id },
          { $set: { organizationId: new ObjectId(review.organizationId) } }
        );
        console.log(`✅ Migrated review ${review._id}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Failed to migrate review ${review._id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed migrations: ${failed}`);
    console.log(`📊 Total processed: ${migrated + failed}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

migrateManualReviews().catch(console.error);