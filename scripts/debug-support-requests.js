// scripts/debug-manual-reviews.js
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function debugManualReviews() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    return;
  }
  
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Get all manual reviews
    const reviews = await db.collection('support_requests').find({}).toArray();
    console.log(`📊 Found ${reviews.length} manual reviews total`);
    
    if (reviews.length > 0) {
      console.log('\n📋 Manual Reviews:');
      reviews.forEach((review, index) => {
        console.log(`\n${index + 1}. Review ID: ${review._id}`);
        console.log(`   Organization ID: ${review.organizationId} (type: ${typeof review.organizationId})`);
        console.log(`   Widget ID: ${review.widgetId}`);
        console.log(`   Contact: ${review.contactInfo?.email}`);
        console.log(`   Submitted: ${review.submittedAt}`);
      });
    }
    
    // Get all organizations
    const organizations = await db.collection('organizations').find({}).toArray();
    console.log(`\n🏢 Found ${organizations.length} organizations`);
    
    if (organizations.length > 0) {
      console.log('\n📋 Organizations:');
      organizations.forEach((org, index) => {
        console.log(`\n${index + 1}. Organization ID: ${org._id}`);
        console.log(`   Name: ${org.name}`);
        console.log(`   Slug: ${org.slug}`);
      });
    }
    
    // Get all widgets
    const widgets = await db.collection('widgets').find({}).toArray();
    console.log(`\n🤖 Found ${widgets.length} widgets`);
    
    if (widgets.length > 0) {
      console.log('\n📋 Widgets:');
      widgets.forEach((widget, index) => {
        console.log(`\n${index + 1}. Widget ID: ${widget._id}`);
        console.log(`   Name: ${widget.name}`);
        console.log(`   Organization ID: ${widget.organizationId} (type: ${typeof widget.organizationId})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

debugManualReviews().catch(console.error);
