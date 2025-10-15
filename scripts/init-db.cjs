/**
 * Database initialization script
 * Run this script to create sample widget configurations in MongoDB
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const sampleWidgets = [
  {
    _id: "test-widget-123",
    name: "Demo Chat Widget",
    prompt: "You are a helpful AI assistant for website visitors. You should be friendly, professional, and helpful. Answer questions clearly and concisely. If you don't know something, admit it honestly.",
    theme: {
      buttonColor: "#4f46e5",
      chatBg: "#ffffff"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "support-widget-456",
    name: "Customer Support Widget",
    prompt: "You are a customer support assistant. Help users with their questions about products, orders, and services. Be empathetic, solution-oriented, and always try to resolve issues. If you can't help with something, politely explain that they should contact human support.",
    theme: {
      buttonColor: "#059669",
      chatBg: "#f0fdf4"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "sales-widget-789",
    name: "Sales Assistant Widget",
    prompt: "You are a sales assistant that helps potential customers learn about our products and services. Be enthusiastic, knowledgeable, and helpful. Focus on understanding customer needs and explaining how our solutions can help them. Always be honest about capabilities and limitations.",
    theme: {
      buttonColor: "#dc2626",
      chatBg: "#fef2f2"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function initializeDatabase() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(uri, {
      tls: true,
      tlsAllowInvalidCertificates: true // For development/testing
    });
    await client.connect();
    
    const db = client.db("elva-agents");
    
    // Create widgets collection and insert sample data
    console.log('📝 Creating widgets collection...');
    const widgetsCollection = db.collection("widgets");
    
    // Check if widgets already exist
    const existingWidgets = await widgetsCollection.find({}).toArray();
    if (existingWidgets.length > 0) {
      console.log('⚠️  Widgets already exist. Skipping widget creation.');
    } else {
      await widgetsCollection.insertMany(sampleWidgets);
      console.log('✅ Sample widgets created successfully!');
    }
    
    // Create conversations collection (empty for now)
    console.log('📝 Creating conversations collection...');
    const conversationsCollection = db.collection("conversations");
    
    // Create indexes for better performance
    console.log('📝 Creating database indexes...');
    
    try {
      await widgetsCollection.createIndex({ "_id": 1 });
      console.log('   ✅ Widget _id index created');
    } catch (error) {
      if (error.code !== 85) { // Not IndexOptionsConflict
        throw error;
      }
      console.log('   ⚠️  Widget _id index already exists');
    }
    
    try {
      await conversationsCollection.createIndex({ "widgetId": 1 });
      console.log('   ✅ Conversation widgetId index created');
    } catch (error) {
      if (error.code !== 85) {
        throw error;
      }
      console.log('   ⚠️  Conversation widgetId index already exists');
    }
    
    try {
      await conversationsCollection.createIndex({ "userId": 1 });
      console.log('   ✅ Conversation userId index created');
    } catch (error) {
      if (error.code !== 85) {
        throw error;
      }
      console.log('   ⚠️  Conversation userId index already exists');
    }
    
    try {
      await conversationsCollection.createIndex({ "createdAt": 1 });
      console.log('   ✅ Conversation createdAt index created');
    } catch (error) {
      if (error.code !== 85) {
        throw error;
      }
      console.log('   ⚠️  Conversation createdAt index already exists');
    }
    
    // Create TTL index for automatic conversation cleanup (30 days)
    try {
      await conversationsCollection.createIndex(
        { "createdAt": 1 }, 
        { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days in seconds
      );
      console.log('   ✅ TTL index for conversation cleanup created');
    } catch (error) {
      if (error.code !== 85) {
        throw error;
      }
      console.log('   ⚠️  TTL index already exists (this is normal)');
    }
    
    console.log('✅ Database initialization complete!');
    console.log('');
    console.log('📋 Available widgets:');
    for (const widget of sampleWidgets) {
      console.log(`   • ${widget._id}: ${widget.name}`);
    }
    console.log('');
    console.log('🚀 You can now start the development server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 Database connection closed.');
    }
  }
}

// Run the initialization
initializeDatabase();
