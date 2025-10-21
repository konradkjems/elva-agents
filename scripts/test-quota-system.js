/**
 * Test Script: Conversation Quota System
 * 
 * Tests all aspects of the quota tracking system
 * 
 * Usage: node scripts/test-quota-system.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function testQuotaSystem() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('elva-agents');

    // Test 1: Find an organization with usage tracking
    console.log('📝 Test 1: Checking organizations with usage tracking...');
    const org = await db.collection('organizations').findOne({
      'usage.conversations': { $exists: true }
    });

    if (!org) {
      console.log('❌ No organizations with usage tracking found');
      console.log('   Run migration first: node scripts/migrate-conversation-quotas.js');
      return;
    }

    console.log(`✅ Found organization: ${org.name}`);
    console.log(`   Plan: ${org.plan || 'free'}`);
    console.log(`   Usage: ${org.usage.conversations.current}/${org.usage.conversations.limit}`);
    console.log('');

    // Test 2: Check quota logic
    console.log('📝 Test 2: Testing quota logic...');

    const usage = org.usage.conversations;
    let percentage2 = (usage.current / usage.limit) * 100; // Use a different name to avoid redeclaration
    const plan = org.plan || 'free';

    // Test blocking logic
    let shouldBlock = false;

    if (plan === 'free') {
      shouldBlock = usage.current >= usage.limit;
      if (org.trialEndsAt && new Date() > new Date(org.trialEndsAt)) {
        shouldBlock = true;
      }
    }
    
    console.log('   Current usage:', {
      current: usage.current,
      limit: usage.limit,
      percentage: percentage2.toFixed(1) + '%',
      plan: plan,
      shouldBlock: shouldBlock
    });
    
    // Check if needs reset (null-safe)
    const lastResetForTest2 = usage.lastReset ? new Date(usage.lastReset) : null;
    const monthStartForTest2 = new Date();
    monthStartForTest2.setDate(1);
    monthStartForTest2.setHours(0, 0, 0, 0);
    const needsResetForTest2 = !lastResetForTest2 || lastResetForTest2 < monthStartForTest2;
    
    console.log('   Reset status:', {
      needsReset: needsResetForTest2,
      lastReset: lastResetForTest2 ? lastResetForTest2.toLocaleDateString('da-DK') : 'n/a'
    });
    console.log('');

    // Test 3: Test conversation count (monthly only)
    console.log('📝 Test 3: Checking conversation count...');
    const monthStartForTest3 = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const conversationCount = await db.collection('conversations').countDocuments({
      organizationId: org._id,
      createdAt: { $gte: monthStartForTest3 }
    });
    const allTimeCount = await db.collection('conversations').countDocuments({
      organizationId: org._id
    });
    console.log(`   Conversations this month: ${conversationCount}`);
    console.log(`   Conversations all-time: ${allTimeCount}`);
    console.log(`   Tracked in usage: ${org.usage.conversations.current}`);
    
    if (conversationCount !== org.usage.conversations.current) {
      console.log('   ⚠️  Mismatch detected - counter may need adjustment');
    } else {
      console.log('   ✅ Counts match!');
    }
    console.log('');

    // Test 4: Test notification thresholds
    console.log('📝 Test 4: Checking notification thresholds...');
    const percentage = (org.usage.conversations.current / org.usage.conversations.limit) * 100;
    const notificationsSent = org.usage.conversations.notificationsSent || [];
    
    console.log(`   Usage percentage: ${percentage.toFixed(1)}%`);
    console.log(`   Notifications sent: ${notificationsSent.join(', ') || 'none'}`);
    
    const shouldNotify80 = percentage >= 80 && !notificationsSent.includes('80%');
    const shouldNotify100 = percentage >= 100 && !notificationsSent.includes('100%');
    const shouldNotify110 = percentage >= 110 && !notificationsSent.includes('110%');
    
    console.log(`   Should send 80% notification: ${shouldNotify80}`);
    console.log(`   Should send 100% notification: ${shouldNotify100}`);
    console.log(`   Should send 110% notification: ${shouldNotify110}`);
    console.log('');

    // Test 5: Check monthly reset logic (null-safe)
    console.log('📝 Test 5: Checking monthly reset logic...');
    const lastResetForTest5 = org.usage.conversations.lastReset ? new Date(org.usage.conversations.lastReset) : null;
    const monthStartForTest5 = new Date();
    monthStartForTest5.setDate(1);
    monthStartForTest5.setHours(0, 0, 0, 0);
    
    const needsResetForTest5 = !lastResetForTest5 || lastResetForTest5 < monthStartForTest5;
    console.log(`   Last reset: ${lastResetForTest5 ? lastResetForTest5.toLocaleDateString('da-DK') : 'n/a'}`);
    console.log(`   Current month start: ${monthStartForTest5.toLocaleDateString('da-DK')}`);
    console.log(`   Needs reset: ${needsResetForTest5}`);
    console.log('');

    // Test 6: Test plan limits
    console.log('📝 Test 6: Testing plan limits...');
    const planLimits = {
      'free': 100,
      'basic': 100,
      'growth': 300,
      'pro': 750
    };
    
    for (const [plan, expectedLimit] of Object.entries(planLimits)) {
      const testOrg = await db.collection('organizations').findOne({
        plan: plan,
        'usage.conversations': { $exists: true }
      });
      
      if (testOrg) {
        const actualLimit = testOrg.usage.conversations.limit;
        const match = actualLimit === expectedLimit;
        console.log(`   ${plan}: ${actualLimit} (expected: ${expectedLimit}) ${match ? '✅' : '❌'}`);
      } else {
        console.log(`   ${plan}: No organization found with this plan`);
      }
    }
    console.log('');

    // Test 7: Test index exists
    console.log('📝 Test 7: Checking database indexes...');
    const indexes = await db.collection('conversations').indexes();
    const hasOrgIndex = indexes.some(idx => 
      idx.key.organizationId === 1 || 
      (idx.key.organizationId === 1 && idx.key.createdAt === -1)
    );
    
    console.log(`   organizationId index exists: ${hasOrgIndex ? '✅' : '❌'}`);
    if (!hasOrgIndex) {
      console.log('   Run: await db.collection("conversations").createIndex({ organizationId: 1, createdAt: -1 })');
    }
    console.log('');

    console.log('✨ All tests complete!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Test creating a new conversation and verify counter increments');
    console.log('   2. Test quota blocking for free tier at limit');
    console.log('   3. Test email notifications (manually trigger cron job)');
    console.log('   4. Test manual quota reset by platform admin');

  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  testQuotaSystem();
}

module.exports = { testQuotaSystem };

