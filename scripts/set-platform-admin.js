/**
 * Set Platform Admin Role
 * 
 * Usage: node scripts/set-platform-admin.js <email>
 * Example: node scripts/set-platform-admin.js admin@elva.com
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function setPlatformAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('\nUsage: node scripts/set-platform-admin.js <email>');
    console.log('Example: node scripts/set-platform-admin.js admin@elva.com');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Using new database for multi-tenancy (keeps old chatwidgets as backup)
    const db = client.db('elva-agents');

    // Find user by email
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    // Update user to platform admin
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          platformRole: 'platform_admin',
          updatedAt: new Date()
        } 
      }
    );

    console.log(`✅ User "${user.name}" (${email}) is now a Platform Admin`);
    console.log('\n🔑 Platform Admin Capabilities:');
    console.log('   - Create and manage all demos');
    console.log('   - Access any organization (impersonation)');
    console.log('   - View all users and organizations');
    console.log('   - System-wide settings and analytics');

  } catch (error) {
    console.error('❌ Error setting platform admin:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  setPlatformAdmin();
}

module.exports = { setPlatformAdmin };

