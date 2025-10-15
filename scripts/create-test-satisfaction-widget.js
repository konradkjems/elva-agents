require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function createTestSatisfactionWidget() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Create a test widget with satisfaction rating enabled
    const testWidget = {
      name: 'Test Satisfaction Widget',
      description: 'Widget for testing satisfaction rating functionality',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Basic configuration
      theme: {
        buttonColor: '#4f46e5',
        chatBg: '#ffffff',
        width: 450,
        height: 600,
        borderRadius: 20,
        shadow: '0 20px 60px rgba(0,0,0,0.15)',
        backdropBlur: false
      },
      
      messages: {
        welcomeMessage: 'Hello! I\'m here to help you test the satisfaction rating system. How can I assist you today?',
        inputPlaceholder: 'Type your message...',
        typingText: 'AI is thinking...',
        suggestedResponses: [
          'Tell me about satisfaction ratings',
          'How does the rating system work?',
          'Test the rating feature',
          'What can you help me with?'
        ]
      },
      
      branding: {
        title: 'Satisfaction Test Assistant',
        assistantName: 'Test Assistant',
        companyName: 'Test Company',
        showBranding: true
      },
      
      // Satisfaction rating configuration
      satisfaction: {
        enabled: true,
        triggerAfter: 2, // Show rating after 2 messages
        inactivityDelay: 15000, // 15 seconds of inactivity
        promptText: 'How would you rate this conversation so far?',
        allowFeedback: false,
        feedbackPlaceholder: 'Please share any additional feedback...'
      },
      
      // OpenAI configuration (using demo prompt for testing)
      openai: {
        promptId: 'demo-prompt',
        version: 'latest'
      },
      
      appearance: {
        placement: 'bottom-right',
        theme: 'light',
        useGradient: false,
        onlineIndicatorColor: '#3FD128'
      }
    };
    
    // Insert the test widget
    const result = await db.collection('widgets').insertOne(testWidget);
    
    console.log('✅ Test satisfaction widget created successfully!');
    console.log('Widget ID:', result.insertedId);
    console.log('Widget Name:', testWidget.name);
    console.log('Satisfaction Rating:', testWidget.satisfaction.enabled ? 'Enabled' : 'Disabled');
    console.log('Trigger After:', testWidget.satisfaction.triggerAfter, 'messages');
    console.log('Feedback:', testWidget.satisfaction.allowFeedback ? 'Enabled' : 'Disabled');
    
    console.log('\n📋 Test Instructions:');
    console.log('1. Use the widget embed code with this widget ID');
    console.log('2. Start a conversation with the widget');
    console.log('3. Send at least', testWidget.satisfaction.triggerAfter, 'messages');
    console.log('4. The satisfaction rating should appear automatically');
    console.log('5. Test rating submission and feedback');
    
    console.log('\n🔗 Widget Embed Code:');
    console.log(`<script src="https://elva-agents.vercel.app/api/widget-embed/${result.insertedId}"></script>`);
    
  } catch (error) {
    console.error('❌ Error creating test satisfaction widget:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  createTestSatisfactionWidget();
}

module.exports = { createTestSatisfactionWidget };
