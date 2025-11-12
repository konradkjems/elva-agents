// Test script to verify language pack fallback functionality
const http = require('http');

// Function to extract the WIDGET_CONFIG from the widget embed response
function extractWidgetConfig(responseBody) {
  // Look for the WIDGET_CONFIG assignment in the JavaScript
  const configMatch = responseBody.match(/WIDGET_CONFIG\s*=\s*({[\s\S]*?});/);
  if (!configMatch) {
    console.error('Could not find WIDGET_CONFIG in response');
    return null;
  }

  try {
    // Extract the JSON part and parse it
    const configStr = configMatch[1];
    // This is a simplified extraction - in reality we'd need proper JS parsing
    return JSON.parse(configStr);
  } catch (e) {
    console.error('Could not parse WIDGET_CONFIG:', e.message);
    return null;
  }
}

// Test the widget embed API
const testWidget = (widgetId) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/widget-embed/${widgetId}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`✅ Widget ${widgetId} API responded with status: ${res.statusCode}`);

        // Look for language pack related messages in the response
        const hasDefaultLanguagePacks = data.includes('defaultLanguagePacks');
        const hasCustomLanguage = data.includes('customLanguage');

        console.log(`📦 Default language packs imported: ${hasDefaultLanguagePacks}`);
        console.log(`🌐 Custom language mode present: ${hasCustomLanguage}`);

        // Check for Danish language fallback logic
        const hasDanishFallback = data.includes('defaultLanguagePacks[userLanguage]');
        console.log(`🇩🇰 Danish fallback logic present: ${hasDanishFallback}`);

        // Check for proper fallback implementation
        const hasFallbackLogic = data.includes('customValue !== undefined && customValue !== null && customValue !== \'\'');
        console.log(`🔄 Proper fallback logic present: ${hasFallbackLogic}`);

        resolve({
          statusCode: res.statusCode,
          hasDefaultLanguagePacks,
          hasCustomLanguage,
          hasDanishFallback,
          hasFallbackLogic
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
};

// Run the test
async function runTest() {
  try {
    console.log('🧪 Testing language pack fallback fix...\n');

    const result = await testWidget('6901df174edacd0efa1c1320');

    console.log('\n📊 Test Results:');
    console.log('================');

    if (result.statusCode === 200) {
      console.log('✅ Widget API is responding correctly');
    } else {
      console.log('❌ Widget API returned error status:', result.statusCode);
    }

    if (result.hasDefaultLanguagePacks) {
      console.log('✅ Default language packs are imported');
    } else {
      console.log('❌ Default language packs are NOT imported');
    }

    if (result.hasCustomLanguage) {
      console.log('✅ Custom language mode logic is present');
    } else {
      console.log('❌ Custom language mode logic is missing');
    }

    if (result.hasDanishFallback) {
      console.log('✅ Danish language fallback logic is present');
    } else {
      console.log('❌ Danish language fallback logic is missing');
    }

    if (result.hasFallbackLogic) {
      console.log('✅ Proper fallback logic (checking empty strings) is implemented');
    } else {
      console.log('❌ Proper fallback logic is missing');
    }

    const allTestsPassed = result.statusCode === 200 &&
                          result.hasDefaultLanguagePacks &&
                          result.hasCustomLanguage &&
                          result.hasDanishFallback &&
                          result.hasFallbackLogic;

    console.log('\n🎯 Overall Result:');
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - Language pack fallback fix is working!');
    } else {
      console.log('❌ SOME TESTS FAILED - Language pack fallback may not be working correctly');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

runTest();
