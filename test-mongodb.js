import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://konradkjems:LI,k8991qw!@cluster0.5sfswgr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    const client = await MongoClient.connect(uri);
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('elva-agents');
    console.log('✅ Connected to database: elva-agents');
    
    // Test conversations collection
    const conversations = await db.collection('conversations').findOne({});
    console.log('✅ Conversations collection accessible');
    
    // Test satisfaction_analytics collection
    const analytics = await db.collection('satisfaction_analytics').findOne({});
    console.log('✅ Satisfaction analytics collection accessible');
    
    await client.close();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
