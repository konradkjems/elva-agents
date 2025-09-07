const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  console.log('🔗 Testing MongoDB connection...');
  console.log('URI:', uri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials

  const options = {
    retryWrites: true,
    w: 'majority',
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000
  };

  let client;
  
  try {
    client = new MongoClient(uri, options);
    await client.connect();
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database operations
    const db = client.db('elva-agents');
    
    // Check if widgets collection exists
    const collections = await db.listCollections().toArray();
    const widgetsCollection = collections.find(c => c.name === 'widgets');
    
    if (widgetsCollection) {
      console.log('✅ Widgets collection exists');
      
      // Count documents
      const count = await db.collection('widgets').countDocuments();
      console.log(`📊 Found ${count} widgets in the collection`);
      
      if (count > 0) {
        // Show sample widget
        const sampleWidget = await db.collection('widgets').findOne();
        console.log('📄 Sample widget:', {
          id: sampleWidget._id,
          name: sampleWidget.name,
          status: sampleWidget.status
        });
      }
    } else {
      console.log('⚠️  Widgets collection does not exist');
      console.log('💡 Creating widgets collection with sample data...');
      
      // Create collection with sample data
      const sampleWidget = {
        _id: '1',
        name: 'Elva Kundeservice Widget',
        description: 'Hovedkundeservice widget for Elva Solutions',
        status: 'active',
        openai: {
          promptId: 'pmpt_123456789',
          version: '26',
          model: 'gpt-4o-mini'
        },
        appearance: {
          theme: 'light',
          themeColor: '#3b82f6',
          secondaryColor: '#8b5cf6',
          width: 450,
          height: 600,
          placement: 'bottom-right',
          borderRadius: 20,
          shadow: '0 20px 60px rgba(0,0,0,0.15)',
          backdropBlur: true,
          animationSpeed: 'normal',
          customCSS: '',
          useGradient: true
        },
        messages: {
          welcomeMessage: 'Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.',
          inputPlaceholder: 'Skriv en besked her',
          typingText: 'AI tænker...',
          suggestedResponses: [
            'Hvad er fordelene ved at bruge Elva Solutions?',
            'Hvad koster det at få en AI-Agent?',
            'Kan jeg prøve det gratis?',
            'Hvordan kan jeg få en AI til min virksomhed?'
          ],
          popupMessage: 'Hej! 👋 Har du brug for hjælp?',
          popupDelay: 5000,
          autoClose: false,
          closeButtonText: 'Close'
        },
        branding: {
          title: 'Elva AI kundeservice Agent',
          assistantName: 'Elva Assistant',
          avatarUrl: '',
          logoUrl: '',
          companyName: 'Elva Solutions',
          customLogo: false,
          showBranding: true
        },
        advanced: {
          showCloseButton: true,
          showConversationHistory: true,
          showNewChatButton: true,
          enableAnalytics: true,
          trackEvents: ['message_sent', 'conversation_started', 'widget_opened'],
          conversationRetention: 30,
          maxConversations: 100,
          language: 'da',
          timezone: 'Europe/Copenhagen'
        },
        analytics: {
          totalConversations: 45,
          totalMessages: 128,
          averageResponseTime: 2.3,
          satisfactionScore: 4.7,
          lastActivity: new Date(),
          monthlyStats: {
            '2024-01': { conversations: 12, messages: 34 },
            '2024-02': { conversations: 18, messages: 52 },
            '2024-03': { conversations: 15, messages: 42 }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('widgets').insertOne(sampleWidget);
      console.log('✅ Sample widget created successfully!');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('SSL')) {
      console.log('\n💡 SSL/TLS Error Suggestions:');
      console.log('1. Check your MongoDB Atlas network access settings');
      console.log('2. Ensure your IP address is whitelisted');
      console.log('3. Verify your connection string includes SSL parameters');
      console.log('4. Try updating your MongoDB driver version');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 Authentication Error Suggestions:');
      console.log('1. Verify your username and password');
      console.log('2. Check if the user has proper database permissions');
      console.log('3. Ensure the authSource parameter is correct');
    }
    
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testConnection().catch(console.error);
