/**
 * Debug Script: Check Quota Tracking for Specific Widget
 * 
 * This script helps debug why quota isn't incrementing
 * 
 * Usage: node scripts/debug-quota-tracking.js [widgetId]
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function debugQuotaTracking() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('elva-agents');

    // Get widget ID from command line args or use default
    const widgetId = process.argv[2] || '68c6c76da4bd8f03d0c554fb';
    
    console.log(`🔍 Checking widget: ${widgetId}\n`);

    // Get widget
    const widget = await db.collection('widgets').findOne({ 
      _id: new ObjectId(widgetId) 
    });

    if (!widget) {
      console.log('❌ Widget not found!');
      return;
    }

    console.log('✅ Widget found:');
    console.log(`   Name: ${widget.name}`);
    console.log(`   Organization ID: ${widget.organizationId}`);
    console.log(`   Has organizationId: ${!!widget.organizationId}\n`);

    if (!widget.organizationId) {
      console.log('❌ Widget is missing organizationId!');
      console.log('   Run: node scripts/add-organizationid-to-widgets.js\n');
      return;
    }

    // Get organization
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(widget.organizationId)
    });

    if (!organization) {
      console.log('❌ Organization not found!');
      return;
    }

    console.log('✅ Organization found:');
    console.log(`   Name: ${organization.name}`);
    console.log(`   Plan: ${organization.plan || 'free'}`);
    console.log(`   Has usage tracking: ${!!organization.usage?.conversations}\n`);

    if (!organization.usage?.conversations) {
      console.log('❌ Organization missing usage tracking!');
      console.log('   Run: node scripts/migrate-conversation-quotas.js\n');
      return;
    }

    // Show current usage
    const usage = organization.usage.conversations;
    console.log('📊 Current Quota Status:');
    console.log(`   Current: ${usage.current}`);
    console.log(`   Limit: ${usage.limit}`);
    console.log(`   Percentage: ${((usage.current / usage.limit) * 100).toFixed(1)}%`);
    console.log(`   Overage: ${usage.overage || 0}`);
    console.log(`   Last Reset: ${new Date(usage.lastReset).toLocaleDateString()}`);
    console.log(`   Notifications Sent: ${usage.notificationsSent.join(', ') || 'none'}\n`);

    // Count conversations for this widget
    const widgetConversations = await db.collection('conversations').countDocuments({
      widgetId: widgetId
    });

    console.log('💬 Conversations for this widget:');
    console.log(`   Total: ${widgetConversations}`);
    console.log(`   With organizationId: ${await db.collection('conversations').countDocuments({
      widgetId: widgetId,
      organizationId: { $exists: true }
    })}`);
    console.log(`   Without organizationId: ${await db.collection('conversations').countDocuments({
      widgetId: widgetId,
      organizationId: { $exists: false }
    })}\n`);

    // Count all conversations for this organization
    const orgConversations = await db.collection('conversations').countDocuments({
      organizationId: new ObjectId(widget.organizationId)
    });

    console.log('🏢 Conversations for entire organization:');
    console.log(`   Total in DB: ${orgConversations}`);
    console.log(`   Tracked in usage.current: ${usage.current}`);
    console.log(`   Mismatch: ${orgConversations !== usage.current ? '⚠️ YES' : '✅ NO'}\n`);

    if (orgConversations !== usage.current) {
      console.log('⚠️  MISMATCH DETECTED!');
      console.log('   The conversation count in the database does not match the tracked usage.');
      console.log('   This could mean:');
      console.log('   1. Old conversations were created before quota tracking was implemented');
      console.log('   2. The increment function failed silently');
      console.log('   3. Conversations were created through a different endpoint\n');
      
      console.log('💡 To fix this, you can:');
      console.log('   1. Manually update the organization:');
      console.log(`      db.organizations.updateOne(`);
      console.log(`        { _id: ObjectId("${widget.organizationId}") },`);
      console.log(`        { $set: { "usage.conversations.current": ${orgConversations} } }`);
      console.log(`      )`);
      console.log('   2. OR create a sync script to match DB count with usage.current\n');
    }

    // Check most recent conversation
    const recentConversation = await db.collection('conversations')
      .find({ widgetId: widgetId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (recentConversation.length > 0) {
      const conv = recentConversation[0];
      console.log('🕒 Most recent conversation:');
      console.log(`   ID: ${conv._id}`);
      console.log(`   Created: ${conv.createdAt || conv.startTime}`);
      console.log(`   Has organizationId: ${!!conv.organizationId}`);
      console.log(`   OrganizationId: ${conv.organizationId || 'MISSING'}\n`);
    }

    console.log('✨ Debug complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Create a new conversation in your widget');
    console.log('   2. Check server console for: "📊 Incremented conversation count"');
    console.log('   3. Run this script again to see if counter increased');
    console.log('   4. Refresh your dashboard to see updated numbers');

  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  debugQuotaTracking();
}

module.exports = { debugQuotaTracking };

