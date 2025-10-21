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
    
    // Use cursor instead of toArray() to avoid loading all into memory
    // Include both missing and null organizationId
    const cursor = db.collection('conversations').find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null }
      ]
    });

    let fixed = 0;
    let skipped = 0;
    let bulkOps = [];
    const BATCH_SIZE = 500;

    try {
      for await (const conv of cursor) {
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

          // Add to bulk operations
          bulkOps.push({
            updateOne: {
              filter: { _id: conv._id },
              update: {
                $set: {
                  organizationId: widget.organizationId,
                  updatedAt: new Date()
                }
              }
            }
          });

          console.log(`   ✅ Queued conversation ${conv._id} -> org ${widget.organizationId}`);

          // Execute bulk write when batch size is reached
          if (bulkOps.length >= BATCH_SIZE) {
            const result = await db.collection('conversations').bulkWrite(bulkOps);
            fixed += result.modifiedCount;
            console.log(`   💾 Batch write: ${result.modifiedCount} conversations updated`);
            bulkOps = [];
          }

        } catch (error) {
          console.error(`   ❌ Error processing conversation ${conv._id}:`, error.message);
          skipped++;
        }
      }

      // Execute remaining bulk operations
      if (bulkOps.length > 0) {
        const result = await db.collection('conversations').bulkWrite(bulkOps);
        fixed += result.modifiedCount;
        console.log(`   💾 Final batch write: ${result.modifiedCount} conversations updated`);
      }

    } finally {
      await cursor.close();
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

        // Use safe defaults to prevent NaN or undefined issues
        const currentTracked = Number(org?.usage?.conversations?.current || 0);
        const limit = Number(org?.usage?.conversations?.limit || 0);

        if (conversationCount !== currentTracked) {
          // Sync the count
          const overage = Math.max(0, conversationCount - limit);
          
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

