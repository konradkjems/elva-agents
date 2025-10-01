/**
 * Verify Migration Results
 * 
 * This script checks that the migration was successful by:
 * 1. Verifying all users have platformRole
 * 2. Checking all users have organizations
 * 3. Verifying widgets have organizationId
 * 4. Checking demos schema
 * 
 * Usage: node scripts/verify-migration.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function verifyMigration() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Using new database for multi-tenancy (keeps old chatwidgets as backup)
    const db = client.db('elva-agents');

    console.log('\n🔍 Verifying migration results...\n');

    let hasErrors = false;

    // ========================================
    // 1. Check Users
    // ========================================
    console.log('📝 Checking users...');
    
    const totalUsers = await db.collection('users').countDocuments();
    const usersWithPlatformRole = await db.collection('users').countDocuments({ platformRole: { $exists: true } });
    const usersWithCurrentOrg = await db.collection('users').countDocuments({ currentOrganizationId: { $exists: true } });
    const platformAdmins = await db.collection('users').countDocuments({ platformRole: 'platform_admin' });
    
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users with platformRole: ${usersWithPlatformRole} ${totalUsers === usersWithPlatformRole ? '✅' : '❌'}`);
    console.log(`   Users with currentOrganizationId: ${usersWithCurrentOrg} ${totalUsers === usersWithCurrentOrg ? '✅' : '❌'}`);
    console.log(`   Platform admins: ${platformAdmins}`);
    
    if (totalUsers !== usersWithPlatformRole || totalUsers !== usersWithCurrentOrg) {
      hasErrors = true;
      console.log('   ⚠️  Some users are missing required fields!');
    }

    // ========================================
    // 2. Check Organizations
    // ========================================
    console.log('\n📝 Checking organizations...');
    
    const totalOrgs = await db.collection('organizations').countDocuments();
    const orgsWithOwner = await db.collection('organizations').countDocuments({ ownerId: { $exists: true } });
    const orgsWithSlug = await db.collection('organizations').countDocuments({ slug: { $exists: true } });
    
    console.log(`   Total organizations: ${totalOrgs}`);
    console.log(`   Organizations with owner: ${orgsWithOwner} ${totalOrgs === orgsWithOwner ? '✅' : '❌'}`);
    console.log(`   Organizations with slug: ${orgsWithSlug} ${totalOrgs === orgsWithSlug ? '✅' : '❌'}`);
    
    if (totalOrgs !== orgsWithOwner || totalOrgs !== orgsWithSlug) {
      hasErrors = true;
      console.log('   ⚠️  Some organizations are missing required fields!');
    }

    // Check for duplicate slugs
    const duplicateSlugs = await db.collection('organizations').aggregate([
      { $group: { _id: '$slug', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicateSlugs.length > 0) {
      hasErrors = true;
      console.log(`   ❌ Found ${duplicateSlugs.length} duplicate slugs!`);
      duplicateSlugs.forEach(d => console.log(`      - ${d._id} (${d.count} times)`));
    }

    // ========================================
    // 3. Check Team Members
    // ========================================
    console.log('\n📝 Checking team members...');
    
    const totalMembers = await db.collection('team_members').countDocuments();
    const ownersCount = await db.collection('team_members').countDocuments({ role: 'owner' });
    const activeMembers = await db.collection('team_members').countDocuments({ status: 'active' });
    
    console.log(`   Total team members: ${totalMembers}`);
    console.log(`   Owners: ${ownersCount} ${ownersCount === totalOrgs ? '✅' : '❌'}`);
    console.log(`   Active members: ${activeMembers}`);
    
    if (ownersCount !== totalOrgs) {
      hasErrors = true;
      console.log('   ⚠️  Number of owners does not match number of organizations!');
    }

    // Check that every user has at least one organization
    const usersWithoutOrg = await db.collection('users').aggregate([
      {
        $lookup: {
          from: 'team_members',
          localField: '_id',
          foreignField: 'userId',
          as: 'memberships'
        }
      },
      {
        $match: { memberships: { $size: 0 } }
      }
    ]).toArray();

    if (usersWithoutOrg.length > 0) {
      hasErrors = true;
      console.log(`   ❌ Found ${usersWithoutOrg.length} users without organization!`);
      usersWithoutOrg.forEach(u => console.log(`      - ${u.email}`));
    }

    // ========================================
    // 4. Check Widgets
    // ========================================
    console.log('\n📝 Checking widgets...');
    
    const totalWidgets = await db.collection('widgets').countDocuments({ isDemoMode: { $ne: true } });
    const widgetsWithOrg = await db.collection('widgets').countDocuments({ 
      isDemoMode: { $ne: true },
      organizationId: { $exists: true } 
    });
    const widgetsWithCreator = await db.collection('widgets').countDocuments({ 
      isDemoMode: { $ne: true },
      createdBy: { $exists: true } 
    });
    
    console.log(`   Total widgets (non-demo): ${totalWidgets}`);
    console.log(`   Widgets with organizationId: ${widgetsWithOrg} ${totalWidgets === widgetsWithOrg ? '✅' : '❌'}`);
    console.log(`   Widgets with createdBy: ${widgetsWithCreator} ${totalWidgets === widgetsWithCreator ? '✅' : '❌'}`);
    
    if (totalWidgets !== widgetsWithOrg || totalWidgets !== widgetsWithCreator) {
      hasErrors = true;
      console.log('   ⚠️  Some widgets are missing required fields!');
      
      // Show widgets without organizationId
      const orphanWidgets = await db.collection('widgets').find({ 
        isDemoMode: { $ne: true },
        organizationId: { $exists: false } 
      }).toArray();
      
      if (orphanWidgets.length > 0) {
        console.log(`   ❌ Found ${orphanWidgets.length} widgets without organizationId:`);
        orphanWidgets.forEach(w => console.log(`      - ${w.name} (${w._id})`));
      }
    }

    // ========================================
    // 5. Check Demos
    // ========================================
    console.log('\n📝 Checking demos...');
    
    const totalDemos = await db.collection('demos').countDocuments();
    const demosWithCreator = await db.collection('demos').countDocuments({ createdBy: { $exists: true } });
    const demosWithTargetClient = await db.collection('demos').countDocuments({ targetClient: { $exists: true } });
    const demosWithOrgId = await db.collection('demos').countDocuments({ organizationId: { $exists: true } });
    
    console.log(`   Total demos: ${totalDemos}`);
    console.log(`   Demos with createdBy: ${demosWithCreator} ${totalDemos === demosWithCreator ? '✅' : '❌'}`);
    console.log(`   Demos with targetClient: ${demosWithTargetClient} ${totalDemos === demosWithTargetClient ? '✅' : '❌'}`);
    console.log(`   Demos with organizationId (should be 0): ${demosWithOrgId} ${demosWithOrgId === 0 ? '✅' : '⚠️'}`);
    
    if (totalDemos !== demosWithCreator || totalDemos !== demosWithTargetClient) {
      hasErrors = true;
      console.log('   ⚠️  Some demos are missing required fields!');
    }

    if (demosWithOrgId > 0) {
      console.log('   ⚠️  Some demos still have organizationId (demos should be platform-level only)');
    }

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '='.repeat(50));
    
    if (hasErrors) {
      console.log('❌ Verification FAILED - Issues found!');
      console.log('\n⚠️  Please review the issues above and fix them before proceeding.');
      console.log('   You may need to:');
      console.log('   1. Re-run the migration script');
      console.log('   2. Manually fix the data');
      console.log('   3. Or restore from backup and try again');
      process.exit(1);
    } else {
      console.log('✅ Verification PASSED - Migration successful!');
      console.log('\n🎉 Your database is ready for multi-tenancy!');
      console.log('\n⚡ Next steps:');
      console.log('   1. Set platform admin(s): node scripts/set-platform-admin.js <email>');
      console.log('   2. Test the organization APIs');
      console.log('   3. Deploy and test the frontend');
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  verifyMigration();
}

module.exports = { verifyMigration };

