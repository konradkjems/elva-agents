const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkConversation() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('elva-agents');
    const conversationId = '68ecc44dbf28d0bf5007ad2e';
    
    console.log('\n🔍 Looking for conversation:', conversationId);
    
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId)
    });
    
    if (conversation) {
      console.log('\n✅ Conversation found:');
      console.log('- ID:', conversation._id);
      console.log('- Widget ID:', conversation.widgetId);
      console.log('- Messages:', conversation.messages?.length || 0);
      console.log('- Created:', conversation.createdAt);
      console.log('- Satisfaction:', conversation.satisfaction);
    } else {
      console.log('\n❌ Conversation NOT found in elva-agents database');
      
      // Check if it exists in old database
      const oldDb = client.db('chatwidgets');
      const oldConversation = await oldDb.collection('conversations').findOne({
        _id: new ObjectId(conversationId)
      });
      
      if (oldConversation) {
        console.log('\n⚠️ Found in OLD database (chatwidgets)!');
        console.log('- ID:', oldConversation._id);
        console.log('- Widget ID:', oldConversation.widgetId);
        console.log('- Messages:', oldConversation.messages?.length || 0);
      } else {
        console.log('\n❌ Not found in chatwidgets database either');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkConversation();

