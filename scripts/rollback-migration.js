/**
 * Rollback Migration Script
 * 
 * This script reverts the multi-tenancy migration by:
 * 1. Removing new fields from users
 * 2. Removing organizationId from widgets
 * 3. Deleting organizations, team_members, and invitations collections
 * 
 * ⚠️ DANGER: This will delete data! Use with caution!
 * 
 * Usage: node scripts/rollback-migration.js --confirm
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function rollbackMigration() {
  // Safety check
  if (process.argv[2] !== '--confirm') {
    console.error('⚠️  DANGER: This will delete organizations, team members, and invitations!');
    console.log('\nIf you are sure you want to rollback, run:');
    console.log('   node scripts/rollback-migration.js --confirm');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Using new database for multi-tenancy (keeps old chatwidgets as backup)
    const db = client.db('elva-agents');

    console.log('\n⚠️  ROLLBACK START - This will revert multi-tenancy changes');
    console.log('   Press Ctrl+C in the next 5 seconds to cancel...\n');

    // Give user 5 seconds to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ========================================
    // 1. Remove fields from users
    // ========================================
    console.log('📝 Step 1: Removing new fields from users...');
    
    const userResult = await db.collection('users').updateMany(
      {},
      {
        $unset: {
          platformRole: "",
          currentOrganizationId: "",
          preferences: ""
        }
      }
    );
    
    console.log(`✅ Updated ${userResult.modifiedCount} users`);

    // ========================================
    // 2. Remove organizationId from widgets
    // ========================================
    console.log('\n📝 Step 2: Removing organizationId from widgets...');
    
    const widgetResult = await db.collection('widgets').updateMany(
      {},
      {
        $unset: {
          organizationId: "",
          lastEditedBy: "",
          lastEditedAt: ""
        }
      }
    );
    
    console.log(`✅ Updated ${widgetResult.modifiedCount} widgets`);

    // ========================================
    // 3. Update demos (remove new fields)
    // ========================================
    console.log('\n📝 Step 3: Reverting demos to old schema...');
    
    const demoResult = await db.collection('demos').updateMany(
      {},
      {
        $unset: {
          targetClient: "",
          convertedToOrganizationId: ""
        }
      }
    );
    
    console.log(`✅ Updated ${demoResult.modifiedCount} demos`);

    // ========================================
    // 4. Delete new collections
    // ========================================
    console.log('\n📝 Step 4: Deleting new collections...');
    
    // Get counts before deletion
    const orgsCount = await db.collection('organizations').countDocuments();
    const membersCount = await db.collection('team_members').countDocuments();
    const invitationsCount = await db.collection('invitations').countDocuments();

    // Delete collections
    if (orgsCount > 0) {
      await db.collection('organizations').drop();
      console.log(`✅ Deleted organizations collection (${orgsCount} documents)`);
    }

    if (membersCount > 0) {
      await db.collection('team_members').drop();
      console.log(`✅ Deleted team_members collection (${membersCount} documents)`);
    }

    if (invitationsCount > 0) {
      await db.collection('invitations').drop();
      console.log(`✅ Deleted invitations collection (${invitationsCount} documents)`);
    }

    // ========================================
    // Summary
    // ========================================
    console.log('\n✨ Rollback complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Users reverted: ${userResult.modifiedCount}`);
    console.log(`   - Widgets reverted: ${widgetResult.modifiedCount}`);
    console.log(`   - Demos reverted: ${demoResult.modifiedCount}`);
    console.log(`   - Organizations deleted: ${orgsCount}`);
    console.log(`   - Team members deleted: ${membersCount}`);
    console.log(`   - Invitations deleted: ${invitationsCount}`);
    console.log('\n⚠️  Your database has been rolled back to single-tenant mode');

  } catch (error) {
    console.error('❌ Rollback error:', error);
    console.error('\n⚠️  IMPORTANT: Rollback may have failed partially!');
    console.error('   Check your database state carefully');
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  rollbackMigration();
}

module.exports = { rollbackMigration };

