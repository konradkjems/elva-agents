/**
 * Sync Script: Fix Conversations and Sync Quota Counts
 * 
 * This script:
 * 1. Adds missing organizationId to conversations
 * 2. Syncs usage.conversations.current with actual conversation count
 * 
 * Usage: node scripts/sync-quota-counts.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function syncQuotaCounts() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('elva-agents');

    // STEP 1: Fix conversations missing organizationId
    console.log('📝 Step 1: Fixing conversations missing organizationId...\n');
    
    const conversationsWithoutOrgId = await db.collection('conversations').find({
      organizationId: { $exists: false }
    }).toArray();

    console.log(`Found ${conversationsWithoutOrgId.length} conversations without organizationId\n`);

    let fixed = 0;
    let skipped = 0;

    for (const conv of conversationsWithoutOrgId) {
      try {
        // Get the widget for this conversation
        let widget = null;
        
        if (ObjectId.isValid(conv.widgetId)) {
          widget = await db.collection('widgets').findOne({ 
            _id: new ObjectId(conv.widgetId) 
          });
        } else {
          widget = await db.collection('widgets').findOne({ 
            _id: conv.widgetId 
          });
        }

        if (!widget) {
          console.log(`   ⚠️  Widget not found for conversation ${conv._id}, skipping...`);
          skipped++;
          continue;
        }

        if (!widget.organizationId) {
          console.log(`   ⚠️  Widget ${widget.name} has no organizationId, skipping...`);
          skipped++;
          continue;
        }

        // Update conversation with organizationId
        await db.collection('conversations').updateOne(
          { _id: conv._id },
          {
            $set: {
              organizationId: widget.organizationId,
              updatedAt: new Date()
            }
          }
        );

        console.log(`   ✅ Fixed conversation ${conv._id} -> org ${widget.organizationId}`);
        fixed++;

      } catch (error) {
        console.error(`   ❌ Error fixing conversation ${conv._id}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} conversations`);
    console.log(`⚠️  Skipped ${skipped} conversations\n`);

    // STEP 2: Sync quota counts for all organizations
    console.log('📝 Step 2: Syncing quota counts with actual conversation counts...\n');

    const organizations = await db.collection('organizations').find({
      'usage.conversations': { $exists: true }
    }).toArray();

    console.log(`Found ${organizations.length} organizations with usage tracking\n`);

    const monthStart = getMonthStart();

    for (const org of organizations) {
      try {
        // Count conversations this month for this organization
        const conversationCount = await db.collection('conversations').countDocuments({
          organizationId: org._id,
          createdAt: { $gte: monthStart }
        });

        const currentTracked = org.usage.conversations.current;

        if (conversationCount !== currentTracked) {
          // Sync the count
          const overage = Math.max(0, conversationCount - org.usage.conversations.limit);
          
          await db.collection('organizations').updateOne(
            { _id: org._id },
            {
              $set: {
                'usage.conversations.current': conversationCount,
                'usage.conversations.overage': overage,
                updatedAt: new Date()
              }
            }
          );

          console.log(`   ✅ ${org.name}: ${currentTracked} → ${conversationCount} (${conversationCount > currentTracked ? '+' : ''}${conversationCount - currentTracked})`);
        } else {
          console.log(`   ✓  ${org.name}: ${conversationCount} (already in sync)`);
        }

      } catch (error) {
        console.error(`   ❌ Error syncing ${org.name}:`, error.message);
      }
    }

    console.log('\n✨ Sync complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Refresh your dashboard to see updated counts');
    console.log('   2. Create a new conversation and verify it increments');
    console.log('   3. Run debug script again: node scripts/debug-quota-tracking.js');

  } catch (error) {
    console.error('❌ Sync error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  syncQuotaCounts();
}

module.exports = { syncQuotaCounts };

