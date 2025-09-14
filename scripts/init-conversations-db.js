require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function initConversationsDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('chatwidgets');
    
    // Create conversations collection with indexes
    const conversationsCollection = db.collection('conversations');
    
    // Create indexes for better performance
    await conversationsCollection.createIndex({ widgetId: 1 });
    await conversationsCollection.createIndex({ sessionId: 1 });
    await conversationsCollection.createIndex({ startTime: -1 });
    await conversationsCollection.createIndex({ 'metadata.country': 1 });
    await conversationsCollection.createIndex({ 
      widgetId: 1, 
      startTime: -1 
    });
    
    console.log('✅ Conversations collection created with indexes');
    
    // Create analytics collection for aggregated data
    const analyticsCollection = db.collection('analytics');
    
    await analyticsCollection.createIndex({ date: 1 });
    await analyticsCollection.createIndex({ widgetId: 1, date: 1 });
    
    console.log('✅ Analytics collection created with indexes');
    
  } catch (error) {
    console.error('❌ Error initializing conversations database:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  initConversationsDB();
}

module.exports = initConversationsDB;
