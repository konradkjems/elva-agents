/**
 * Widget Migration Script
 * 
 * Migrates widgets from the old 'chatwidgets' database to the new 'elva-agents' database
 * and assigns them to the admin organization.
 * 
 * Usage: node scripts/migrate-widgets-to-new-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function migrateWidgets() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Get both databases
    const oldDb = client.db('chatwidgets');
    const newDb = client.db('elva-agents');

    // Step 1: Find the admin organization in the new database
    console.log('📋 Step 1: Finding admin organization...');
    const adminOrg = await newDb.collection('organizations').findOne({
      $or: [
        { slug: 'admin-org' },
        { name: "Admin's Organization" },
        { ownerId: { $exists: true } } // Get the first organization if no admin-org exists
      ]
    });

    if (!adminOrg) {
      console.error('❌ No organization found in the new database.');
      console.log('💡 Please run the Phase 1 setup scripts first:');
      console.log('   1. node scripts/init-organizations-schema.js');
      console.log('   2. node scripts/create-admin-user.js');
      process.exit(1);
    }

    console.log(`✅ Found organization: ${adminOrg.name} (${adminOrg._id})\n`);

    // Step 2: Get admin user (owner of the organization)
    console.log('📋 Step 2: Finding admin user...');
    const adminUser = await newDb.collection('users').findOne({
      _id: adminOrg.ownerId
    });

    if (!adminUser) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`✅ Found admin user: ${adminUser.email}\n`);

    // Step 3: Fetch all widgets from old database
    console.log('📋 Step 3: Fetching widgets from old database...');
    const oldWidgets = await oldDb.collection('widgets').find({}).toArray();
    
    console.log(`✅ Found ${oldWidgets.length} widgets in old database\n`);

    if (oldWidgets.length === 0) {
      console.log('ℹ️  No widgets to migrate');
      return;
    }

    // Step 4: Check which widgets already exist in new database
    console.log('📋 Step 4: Checking for existing widgets in new database...');
    const existingWidgetIds = await newDb.collection('widgets')
      .find({}, { projection: { _id: 1 } })
      .toArray();
    
    const existingIds = new Set(existingWidgetIds.map(w => w._id.toString()));
    const widgetsToMigrate = oldWidgets.filter(w => !existingIds.has(w._id.toString()));

    console.log(`✅ ${existingWidgetIds.length} widgets already exist in new database`);
    console.log(`✅ ${widgetsToMigrate.length} widgets to migrate\n`);

    if (widgetsToMigrate.length === 0) {
      console.log('ℹ️  All widgets have already been migrated');
      return;
    }

    // Step 5: Migrate widgets
    console.log('📋 Step 5: Migrating widgets...\n');
    
    let successCount = 0;
    let errorCount = 0;

    for (const widget of widgetsToMigrate) {
      try {
        const migratedWidget = {
          ...widget,
          // Add organization context
          organizationId: adminOrg._id,
          createdBy: adminUser._id,
          lastEditedBy: adminUser._id,
          lastEditedAt: new Date(),
          
          // Ensure required fields
          createdAt: widget.createdAt || new Date(),
          updatedAt: widget.updatedAt || new Date(),
          status: widget.status || 'active',
          
          // Preserve all existing fields
          isDemoMode: widget.isDemoMode || false,
        };

        await newDb.collection('widgets').insertOne(migratedWidget);
        console.log(`  ✅ Migrated: ${widget.name || widget._id} (${widget._id})`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to migrate widget ${widget._id}:`, error.message);
        errorCount++;
      }
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total widgets in old database: ${oldWidgets.length}`);
    console.log(`Already existed in new database: ${existingWidgetIds.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Organization: ${adminOrg.name}`);
    console.log('='.repeat(60));

    // Step 7: Verify migration
    console.log('\n📋 Verifying migration...');
    const newWidgetCount = await newDb.collection('widgets').countDocuments({
      organizationId: adminOrg._id,
      isDemoMode: { $ne: true }
    });
    
    console.log(`✅ Total widgets in new database for ${adminOrg.name}: ${newWidgetCount}\n`);

    console.log('✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify your widgets in the admin dashboard');
    console.log('   2. Test widget functionality');
    console.log('   3. Once verified, you can safely delete the old database\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
console.log('🚀 Starting Widget Migration...\n');
migrateWidgets()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

