/**
 * Migration script to consolidate user roles
 * 
 * This script consolidates platformRole and role fields into a single 'role' field
 * 
 * Before:
 * - platformRole: 'platform_admin' | 'user'
 * - role: 'admin' | 'owner' | 'member' (organization-specific)
 * 
 * After:
 * - role: 'platform_admin' | 'admin' | 'owner' | 'member'
 * 
 * Logic:
 * - platformRole: 'platform_admin' -> role: 'platform_admin'
 * - platformRole: 'user' + role: 'admin' -> role: 'admin'
 * - platformRole: 'user' + role: 'owner' -> role: 'owner'
 * - platformRole: 'user' + role: 'member' -> role: 'member'
 * - platformRole: 'user' + no role -> role: 'member' (default)
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function consolidateUserRoles() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db('elva-agents');
    const users = db.collection('users');
    
    // Get all users
    const allUsers = await users.find({}).toArray();
    console.log(`📊 Found ${allUsers.length} users to process`);
    
    if (allUsers.length === 0) {
      console.log('✅ No users found, nothing to migrate');
      return;
    }
    
    let updatedCount = 0;
    
    for (const user of allUsers) {
      // Determine new role based on platformRole and existing role
      let newRole;
      if (user.platformRole === 'platform_admin') {
        newRole = 'platform_admin';
      } else if (user.role && ['admin', 'owner', 'member'].includes(user.role)) {
        // Keep existing organization role
        newRole = user.role;
      } else {
        // Default to member if no specific role
        newRole = 'member';
      }
      
      // Update user
      await users.updateOne(
        { _id: user._id },
        { 
          $set: { role: newRole },
          $unset: { platformRole: "" }
        }
      );
      
      console.log(`✅ Updated user ${user.email}: ${user.platformRole || 'user'} + ${user.role || 'none'} -> ${newRole}`);
      updatedCount++;
    }
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Updated ${updatedCount} users`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const platformAdmins = await users.countDocuments({ role: 'platform_admin' });
    const admins = await users.countDocuments({ role: 'admin' });
    const owners = await users.countDocuments({ role: 'owner' });
    const members = await users.countDocuments({ role: 'member' });
    
    console.log(`   Platform Admins: ${platformAdmins}`);
    console.log(`   Admins: ${admins}`);
    console.log(`   Owners: ${owners}`);
    console.log(`   Members: ${members}`);
    
    // Check for any remaining platformRole fields
    const remainingPlatformRoles = await users.countDocuments({ platformRole: { $exists: true } });
    if (remainingPlatformRoles > 0) {
      console.log(`⚠️  Warning: ${remainingPlatformRoles} users still have platformRole field`);
    } else {
      console.log(`✅ All platformRole fields removed`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  consolidateUserRoles()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { consolidateUserRoles };
