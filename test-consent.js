// Simple test script to verify consent banner functionality
import { getConsentManagerCode } from './lib/consent-banner.js';

// Test 1: Banner enabled with custom content
const config1 = {
  widgetId: 'test-widget-1',
  theme: { buttonColor: '#4f46e5' },
  consent: {
    enabled: true,
    title: 'Custom Title 🍪',
    description: 'Custom description text',
    privacyUrl: 'https://example.com/privacy',
    cookiesUrl: 'https://example.com/cookies'
  }
};

const code1 = getConsentManagerCode(config1);
console.log('✅ Test 1: Banner enabled with custom content');
console.log('Generated code length:', code1.length);
console.log('Contains custom title:', code1.includes('Custom Title 🍪'));
console.log('Contains custom description:', code1.includes('Custom description text'));
console.log('Contains custom privacy URL:', code1.includes('https://example.com/privacy'));
console.log('Contains custom cookies URL:', code1.includes('https://example.com/cookies'));

// Debug: show a portion of the generated code
console.log('Code snippet:', code1.substring(2000, 2100));

// Search for title in the code
const titleMatch = code1.match(/<h3>(.*?)<\/h3>/);
console.log('Found title in HTML:', titleMatch ? titleMatch[1] : 'No title found');

// Test 2: Banner disabled
const config2 = {
  widgetId: 'test-widget-2',
  theme: { buttonColor: '#4f46e5' },
  consent: {
    enabled: false
  }
};

const code2 = getConsentManagerCode(config2);
console.log('\n✅ Test 2: Banner disabled');
console.log('Banner conditionally disabled:', code2.includes('if (false)'));

// Test 3: Default values when no consent config provided
const config3 = {
  widgetId: 'test-widget-3',
  theme: { buttonColor: '#4f46e5' }
};

const code3 = getConsentManagerCode(config3);
console.log('\n✅ Test 3: Default values');
console.log('Contains default title:', code3.includes('🍪 Vi respekterer dit privatliv'));
console.log('Banner enabled by default:', code3.includes('ElvaConsent.showBanner();'));

console.log('\n🎉 All tests completed!');
