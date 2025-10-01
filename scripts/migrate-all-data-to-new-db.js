/**
 * Complete Data Migration Script
 * 
 * Migrates analytics, conversations, and demos from 'chatwidgets' to 'elva-agents' database
 * 
 * Usage: node scripts/migrate-all-data-to-new-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function migrateData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const oldDb = client.db('chatwidgets');
    const newDb = client.db('elva-agents');

    // ============================================================
    // SETUP: Get admin organization and user
    // ============================================================
    console.log('📋 Finding admin organization and user...');
    const adminOrg = await newDb.collection('organizations').findOne({
      $or: [
        { slug: 'admin-org' },
        { name: "Admin's Organization" }
      ]
    });

    if (!adminOrg) {
      console.error('❌ No admin organization found');
      process.exit(1);
    }

    const adminUser = await newDb.collection('users').findOne({
      _id: adminOrg.ownerId
    });

    if (!adminUser) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`✅ Organization: ${adminOrg.name} (${adminOrg._id})`);
    console.log(`✅ Admin User: ${adminUser.email}\n`);

    // ============================================================
    // PART 1: MIGRATE ANALYTICS
    // ============================================================
    console.log('=' .repeat(60));
    console.log('📊 PART 1: Migrating Analytics Data');
    console.log('='.repeat(60) + '\n');

    const oldAnalytics = await oldDb.collection('analytics').find({}).toArray();
    console.log(`Found ${oldAnalytics.length} analytics records in old database`);

    let analyticsSuccess = 0;
    let analyticsError = 0;

    if (oldAnalytics.length > 0) {
      const existingAnalytics = await newDb.collection('analytics')
        .find({}, { projection: { _id: 1 } })
        .toArray();
      const existingAnalyticsIds = new Set(existingAnalytics.map(a => a._id.toString()));
      
      const analyticsToMigrate = oldAnalytics.filter(a => !existingAnalyticsIds.has(a._id.toString()));
      console.log(`${analyticsToMigrate.length} analytics records to migrate\n`);

      for (const analytics of analyticsToMigrate) {
        try {
          const migratedAnalytics = {
            ...analytics,
            organizationId: adminOrg._id, // Link to organization
            createdAt: analytics.createdAt || new Date(),
            updatedAt: analytics.updatedAt || new Date()
          };

          await newDb.collection('analytics').insertOne(migratedAnalytics);
          analyticsSuccess++;
        } catch (error) {
          console.error(`  ❌ Failed to migrate analytics ${analytics._id}:`, error.message);
          analyticsError++;
        }
      }

      console.log(`✅ Analytics migrated: ${analyticsSuccess}`);
      console.log(`❌ Analytics failed: ${analyticsError}\n`);
    }

    // ============================================================
    // PART 2: MIGRATE CONVERSATIONS
    // ============================================================
    console.log('='.repeat(60));
    console.log('💬 PART 2: Migrating Conversations');
    console.log('='.repeat(60) + '\n');

    const oldConversations = await oldDb.collection('conversations').find({}).toArray();
    console.log(`Found ${oldConversations.length} conversations in old database`);

    let conversationsSuccess = 0;
    let conversationsError = 0;

    if (oldConversations.length > 0) {
      const existingConversations = await newDb.collection('conversations')
        .find({}, { projection: { _id: 1 } })
        .toArray();
      const existingConvIds = new Set(existingConversations.map(c => c._id.toString()));
      
      const conversationsToMigrate = oldConversations.filter(c => !existingConvIds.has(c._id.toString()));
      console.log(`${conversationsToMigrate.length} conversations to migrate\n`);

      for (const conversation of conversationsToMigrate) {
        try {
          const migratedConversation = {
            ...conversation,
            organizationId: adminOrg._id, // Link to organization
            createdAt: conversation.createdAt || new Date(),
            updatedAt: conversation.updatedAt || new Date()
          };

          await newDb.collection('conversations').insertOne(migratedConversation);
          conversationsSuccess++;
        } catch (error) {
          console.error(`  ❌ Failed to migrate conversation ${conversation._id}:`, error.message);
          conversationsError++;
        }
      }

      console.log(`✅ Conversations migrated: ${conversationsSuccess}`);
      console.log(`❌ Conversations failed: ${conversationsError}\n`);
    }

    // ============================================================
    // PART 3: MIGRATE DEMOS (Platform-level, no organizationId)
    // ============================================================
    console.log('='.repeat(60));
    console.log('🎬 PART 3: Migrating Demos (Platform-Level)');
    console.log('='.repeat(60) + '\n');

    // Fetch demos from old database
    const oldDemos = await oldDb.collection('demos').find({}).toArray();
    console.log(`Found ${oldDemos.length} demos in old database`);

    // Also check for demo widgets (widgets with isDemoMode: true)
    const oldDemoWidgets = await oldDb.collection('widgets').find({ isDemoMode: true }).toArray();
    console.log(`Found ${oldDemoWidgets.length} demo widgets in old database`);

    let demosSuccess = 0;
    let demosError = 0;
    let demoWidgetsSuccess = 0;
    let demoWidgetsError = 0;

    // Migrate demos collection
    if (oldDemos.length > 0) {
      const existingDemos = await newDb.collection('demos')
        .find({}, { projection: { _id: 1 } })
        .toArray();
      const existingDemoIds = new Set(existingDemos.map(d => d._id.toString()));
      
      const demosToMigrate = oldDemos.filter(d => !existingDemoIds.has(d._id.toString()));
      console.log(`${demosToMigrate.length} demos to migrate\n`);

      for (const demo of demosToMigrate) {
        try {
          const migratedDemo = {
            ...demo,
            // Platform-level: no organizationId
            createdBy: adminUser._id, // Platform admin who created it
            createdAt: demo.createdAt || new Date(),
            updatedAt: demo.updatedAt || new Date(),
            // Ensure demo-specific fields
            targetClient: demo.targetClient || 'Unknown Client'
          };

          await newDb.collection('demos').insertOne(migratedDemo);
          demosSuccess++;
        } catch (error) {
          console.error(`  ❌ Failed to migrate demo ${demo._id}:`, error.message);
          demosError++;
        }
      }
    }

    // Migrate demo widgets
    if (oldDemoWidgets.length > 0) {
      const existingWidgets = await newDb.collection('widgets')
        .find({ isDemoMode: true }, { projection: { _id: 1 } })
        .toArray();
      const existingWidgetIds = new Set(existingWidgets.map(w => w._id.toString()));
      
      const demoWidgetsToMigrate = oldDemoWidgets.filter(w => !existingWidgetIds.has(w._id.toString()));
      console.log(`${demoWidgetsToMigrate.length} demo widgets to migrate\n`);

      for (const widget of demoWidgetsToMigrate) {
        try {
          const migratedWidget = {
            ...widget,
            // Platform-level demos: no organizationId
            isDemoMode: true,
            createdBy: adminUser._id,
            lastEditedBy: adminUser._id,
            lastEditedAt: new Date(),
            createdAt: widget.createdAt || new Date(),
            updatedAt: widget.updatedAt || new Date()
          };

          await newDb.collection('widgets').insertOne(migratedWidget);
          demoWidgetsSuccess++;
        } catch (error) {
          console.error(`  ❌ Failed to migrate demo widget ${widget._id}:`, error.message);
          demoWidgetsError++;
        }
      }
    }

    console.log(`✅ Demos migrated: ${demosSuccess}`);
    console.log(`❌ Demos failed: ${demosError}`);
    console.log(`✅ Demo widgets migrated: ${demoWidgetsSuccess}`);
    console.log(`❌ Demo widgets failed: ${demoWidgetsError}\n`);

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION COMPLETE - Final Summary');
    console.log('='.repeat(60));
    console.log(`Organization: ${adminOrg.name}`);
    console.log(`Admin User: ${adminUser.email}`);
    console.log('');
    console.log('Analytics:');
    console.log(`  - Total in old DB: ${oldAnalytics.length}`);
    console.log(`  - Successfully migrated: ${analyticsSuccess}`);
    console.log('');
    console.log('Conversations:');
    console.log(`  - Total in old DB: ${oldConversations.length}`);
    console.log(`  - Successfully migrated: ${conversationsSuccess}`);
    console.log('');
    console.log('Demos (Platform-Level):');
    console.log(`  - Demos migrated: ${demosSuccess}`);
    console.log(`  - Demo widgets migrated: ${demoWidgetsSuccess}`);
    console.log('='.repeat(60));

    // Verification
    console.log('\n📋 Verifying migration...');
    
    const newAnalyticsCount = await newDb.collection('analytics').countDocuments({ organizationId: adminOrg._id });
    const newConversationsCount = await newDb.collection('conversations').countDocuments({ organizationId: adminOrg._id });
    const newDemosCount = await newDb.collection('demos').countDocuments({});
    const newDemoWidgetsCount = await newDb.collection('widgets').countDocuments({ isDemoMode: true });
    
    console.log(`✅ Analytics in new DB: ${newAnalyticsCount}`);
    console.log(`✅ Conversations in new DB: ${newConversationsCount}`);
    console.log(`✅ Demos in new DB: ${newDemosCount}`);
    console.log(`✅ Demo widgets in new DB: ${newDemoWidgetsCount}\n`);

    console.log('✅ All data migrated successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Demos are now platform-level (no organizationId)');
    console.log('   2. Only platform admins can access demos');
    console.log('   3. Analytics and conversations are linked to Admin\'s Organization');
    console.log('   4. Test the admin dashboard and demo pages\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
console.log('🚀 Starting Complete Data Migration...\n');
migrateData()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });

