/**
 * Migration Script: Add Conversation Quota Tracking to Organizations
 * 
 * This script adds usage tracking fields to all existing organizations
 * based on their current subscription plan.
 * 
 * Usage: node scripts/migrate-conversation-quotas.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Helper function to get conversation limit based on plan
function getConversationLimit(plan) {
  switch(plan) {
    case 'pro': return 750;
    case 'growth': return 300;
    case 'basic': return 100;
    case 'free': return 100;
    default: return 100;
  }
}

// Get the start of the current month
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function migrateConversationQuotas() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('elva-agents');
    const organizations = db.collection('organizations');
    const conversations = db.collection('conversations');

    // Get all organizations
    const allOrgs = await organizations.find({}).toArray();
    console.log(`\n📊 Found ${allOrgs.length} organizations to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const org of allOrgs) {
      // Check if organization already has usage tracking
      if (org.usage?.conversations) {
        console.log(`⏭️  Skipping ${org.name} - already has usage tracking`);
        skippedCount++;
        continue;
      }

      const plan = org.plan || 'free';
      const limit = getConversationLimit(plan);
      const monthStart = getMonthStart();

      // Count existing conversations for this month
      const conversationCount = await conversations.countDocuments({
        organizationId: org._id,
        createdAt: { $gte: monthStart }
      });

      // Calculate overage (if any)
      const overage = Math.max(0, conversationCount - limit);

      // Add usage tracking
      const result = await organizations.updateOne(
        { _id: org._id },
        {
          $set: {
            usage: {
              conversations: {
                current: conversationCount,
                limit: limit,
                lastReset: monthStart,
                overage: overage,
                notificationsSent: []
              }
            },
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Migrated ${org.name} (${plan}): ${conversationCount}/${limit} conversations`);
        migratedCount++;
      } else {
        console.log(`⚠️  Failed to migrate ${org.name}`);
      }
    }

    // Add index for organizationId on conversations collection if it doesn't exist
    console.log('\n📦 Creating indexes on conversations collection...');
    try {
      await conversations.createIndex({ organizationId: 1, createdAt: -1 });
      console.log('✅ Index created: { organizationId: 1, createdAt: -1 }');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Index already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✨ Migration complete!');
    console.log(`   📊 Total organizations: ${allOrgs.length}`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`   ⚠️  Failed: ${allOrgs.length - migratedCount - skippedCount}`);

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  migrateConversationQuotas();
}

module.exports = { migrateConversationQuotas };

