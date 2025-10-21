/**
 * Migration Script: Add organizationId to existing widgets
 * 
 * This script adds organizationId to widgets that are missing it.
 * It links widgets to their creator's current organization.
 * 
 * Usage: node scripts/add-organizationid-to-widgets.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function addOrganizationIdToWidgets() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('elva-agents');

    // Find widgets without organizationId
    const widgetsWithoutOrg = await db.collection('widgets').find({
      organizationId: { $exists: false }
    }).toArray();

    console.log(`📊 Found ${widgetsWithoutOrg.length} widgets without organizationId\n`);

    if (widgetsWithoutOrg.length === 0) {
      console.log('✅ All widgets already have organizationId!');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const widget of widgetsWithoutOrg) {
      try {
        // Get the widget creator
        const creatorId = widget.createdBy;
        
        if (!creatorId) {
          console.log(`⚠️  Widget ${widget._id} has no creator, skipping...`);
          failed++;
          continue;
        }

        // Find the creator's organization membership
        const membership = await db.collection('team_members').findOne({
          userId: new ObjectId(creatorId),
          status: 'active'
        });

        if (!membership) {
          console.log(`⚠️  No organization found for widget ${widget._id} creator, skipping...`);
          failed++;
          continue;
        }

        // Update widget with organizationId
        await db.collection('widgets').updateOne(
          { _id: widget._id },
          {
            $set: {
              organizationId: membership.organizationId,
              updatedAt: new Date()
            }
          }
        );

        const org = await db.collection('organizations').findOne({
          _id: membership.organizationId
        });

        console.log(`✅ Updated widget "${widget.name}" -> ${org.name}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating widget ${widget._id}:`, error.message);
        failed++;
      }
    }

    console.log('\n✨ Migration complete!');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${widgetsWithoutOrg.length}`);

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
  addOrganizationIdToWidgets();
}

module.exports = { addOrganizationIdToWidgets };

