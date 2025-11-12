require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function initLiveChat() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Create indexes for live chat on conversations collection
    const conversationsCollection = db.collection('conversations');
    
    await conversationsCollection.createIndex({ 'liveChat.status': 1 });
    await conversationsCollection.createIndex({ 'liveChat.requestedAt': -1 });
    await conversationsCollection.createIndex({ 'liveChat.acceptedBy': 1 });
    await conversationsCollection.createIndex({ 
      'liveChat.status': 1, 
      'liveChat.requestedAt': -1 
    });
    
    console.log('✅ Live chat indexes created on conversations collection');
    
    // Initialize default agentProfile for existing users
    const usersCollection = db.collection('users');
    const result = await usersCollection.updateMany(
      { agentProfile: { $exists: false } },
      {
        $set: {
          'agentProfile': {
            displayName: null,
            title: null,
            avatarUrl: null,
            isAvailable: false,
            currentActiveChats: []
          }
        }
      }
    );
    
    console.log(`✅ Initialized agentProfile for ${result.modifiedCount} users`);
    
  } catch (error) {
    console.error('❌ Error initializing live chat:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  initLiveChat()
    .then(() => {
      console.log('✅ Live chat initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to initialize live chat:', error);
      process.exit(1);
    });
}

module.exports = initLiveChat;

