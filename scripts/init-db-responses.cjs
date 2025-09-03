
/**
 * Database initialization script for Responses API
 * Run this script to create sample widget configurations using OpenAI prompt IDs
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
    _id: "demo-widget-123",
    name: "Demo Chat Widget (Responses API)",
    description: "General purpose demo widget - configure with your own prompt ID",
    openai: {
      promptId: "pmpt_REPLACE_WITH_YOUR_PROMPT_ID", // Replace with your actual prompt ID
      version: null // Use latest version, or specify version number like "19"
    },
    theme: {
      buttonColor: "#4f46e5",
      chatBg: "#ffffff"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "cottonshoppen-widget-456",
    name: "Cottonshoppen.dk Assistant",
    description: "Customer service widget for Cottonshoppen.dk",
    openai: {
      promptId: "pmpt_68aee2cd8bd881958ad99778533d3d750e3642c07a43035a", // Your Cottonshoppen prompt
      version: "19" // Lock to specific version for production stability
    },
    theme: {
      buttonColor: "#059669",
      chatBg: "#f0fdf4"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "support-widget-789",
    name: "Generic Support Widget",
    description: "General customer support widget - configure with your own prompt ID",
    openai: {
      promptId: "pmpt_REPLACE_WITH_YOUR_SUPPORT_PROMPT_ID", // Replace with support prompt ID
      version: null // Use latest version
    },
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
    
    const db = client.db("chatwidgets");
    
    // Create widgets collection and insert sample data
    console.log('📝 Migrating to Responses API configuration...');
    const widgetsCollection = db.collection("widgets");
    
    // Check if widgets already exist
    const existingWidgets = await widgetsCollection.find({}).toArray();
    if (existingWidgets.length > 0) {
      console.log('⚠️  Existing widgets found. Migrating to Responses API format...');
      
      // Update existing widgets to new format
      for (const widget of sampleWidgets) {
        await widgetsCollection.replaceOne(
          { _id: widget._id },
          widget,
          { upsert: true }
        );
        console.log(`   ✅ Migrated widget: ${widget._id} - ${widget.name}`);
      }
    } else {
      await widgetsCollection.insertMany(sampleWidgets);
      console.log('✅ Sample widgets created successfully!');
    }
    
    // Update conversations collection schema for Responses API
    console.log('📝 Updating conversations collection for Responses API...');
    const conversationsCollection = db.collection("conversations");
    
    // Add indexes for OpenAI response tracking
    try {
      await conversationsCollection.createIndex({ "openai.lastResponseId": 1 });
      console.log('   ✅ OpenAI response ID index created');
    } catch (error) {
      if (error.code !== 85) {
        throw error;
      }
      console.log('   ⚠️  OpenAI response ID index already exists');
    }
    
    // Create standard indexes
    const indexesToCreate = [
      { field: { "_id": 1 }, name: "Widget _id index" },
      { field: { "widgetId": 1 }, name: "Conversation widgetId index" },
      { field: { "userId": 1 }, name: "Conversation userId index" },
      { field: { "createdAt": 1 }, name: "Conversation createdAt index" }
    ];
    
    for (const index of indexesToCreate) {
      try {
        if (index.name.includes("Widget")) {
          await widgetsCollection.createIndex(index.field);
        } else {
          await conversationsCollection.createIndex(index.field);
        }
        console.log(`   ✅ ${index.name} created`);
      } catch (error) {
        if (error.code !== 85) {
          throw error;
        }
        console.log(`   ⚠️  ${index.name} already exists`);
      }
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
    
    console.log('✅ Database migration to Responses API complete!');
    console.log('');
    console.log('📋 Available widgets (Responses API):');
    for (const widget of sampleWidgets) {
      console.log(`   • ${widget._id}: ${widget.name}`);
      console.log(`     Description: ${widget.description}`);
      console.log(`     Prompt ID: ${widget.openai.promptId}`);
      console.log(`     Version: ${widget.openai.version || 'latest'}`);
      console.log('');
    }
    console.log('🔧 Next steps:');
    console.log('   1. Replace "pmpt_REPLACE_WITH_YOUR_PROMPT_ID" with your actual prompt IDs');
    console.log('   2. Create prompts at https://platform.openai.com/prompts');
    console.log('   3. Update the widget configurations with your prompt IDs');
    console.log('   4. Run npm run dev to test the Responses API integration');
    console.log('');
    console.log('🚀 Ready to use Responses API!');
    
  } catch (error) {
    console.error('❌ Error migrating database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 Database connection closed.');
    }
  }
}

// Run the migration
initializeDatabase();
