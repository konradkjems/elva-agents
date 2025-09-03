const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// Set environment variable to handle SSL certificate issues in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testResponsesAPI() {
  console.log('🧪 Testing OpenAI Responses API...');
  
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxRetries: 2
  });

  try {
    const promptId = "pmpt_68aee2cd8bd881958ad99778533d3d750e3642c07a43035a";
    
    console.log(`📋 Testing with prompt ID: ${promptId}`);
    
    const response = await openai.responses.create({
      prompt: {
        id: promptId,
        version: "19"
      },
      input: "Hello! I have a question about your cotton products."
    });

    console.log('✅ Responses API call successful!');
    console.log('📊 Full response structure:', JSON.stringify(response, null, 2));
    
    // Try to extract the reply using different possible structures
    console.log('\n🔍 Analyzing response structure:');
    console.log('- response keys:', Object.keys(response));
    
    if (response.output) {
      console.log('- response.output:', response.output);
      if (Array.isArray(response.output) && response.output[0]) {
        console.log('- response.output[0]:', response.output[0]);
      }
    }
    
    if (response.choices) {
      console.log('- response.choices:', response.choices);
    }
    
    if (response.content) {
      console.log('- response.content:', response.content);
    }
    
    console.log('- response.id:', response.id);
    console.log('- response.usage:', response.usage);

  } catch (error) {
    console.error('❌ Responses API test failed:', error.message);
    console.error('Error details:', error);
  }
}

testResponsesAPI();
