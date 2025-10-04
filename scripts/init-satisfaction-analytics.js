require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function initSatisfactionAnalytics() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Create satisfaction_analytics collection with indexes
    const satisfactionAnalyticsCollection = db.collection('satisfaction_analytics');
    
    // Create indexes for better performance
    await satisfactionAnalyticsCollection.createIndex({ widgetId: 1 });
    await satisfactionAnalyticsCollection.createIndex({ date: 1 });
    await satisfactionAnalyticsCollection.createIndex({ 
      widgetId: 1, 
      date: 1 
    });
    
    console.log('✅ Satisfaction analytics collection created with indexes');
    
    // Create manual_reviews collection with indexes (for future manual review system)
    const manualReviewsCollection = db.collection('manual_reviews');
    
    await manualReviewsCollection.createIndex({ widgetId: 1 });
    await manualReviewsCollection.createIndex({ conversationId: 1 });
    await manualReviewsCollection.createIndex({ status: 1 });
    await manualReviewsCollection.createIndex({ submittedAt: -1 });
    await manualReviewsCollection.createIndex({ 
      widgetId: 1, 
      status: 1 
    });
    
    console.log('✅ Manual reviews collection created with indexes');
    
    // Update existing conversations to ensure satisfaction field exists
    const conversationsCollection = db.collection('conversations');
    
    const updateResult = await conversationsCollection.updateMany(
      { satisfaction: { $exists: false } },
      { 
        $set: { 
          satisfaction: null 
        } 
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} conversations with satisfaction field`);
    
  } catch (error) {
    console.error('❌ Error initializing satisfaction analytics:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  initSatisfactionAnalytics();
}

module.exports = { initSatisfactionAnalytics };
