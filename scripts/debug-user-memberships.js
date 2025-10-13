// scripts/debug-user-memberships.js
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function debugUserMemberships() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    return;
  }
  
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`👥 Found ${users.length} users`);
    
    if (users.length > 0) {
      console.log('\n📋 Users:');
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. User ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Current Organization ID: ${user.currentOrganizationId}`);
      });
    }
    
    // Get all team memberships
    const memberships = await db.collection('team_members').find({}).toArray();
    console.log(`\n👥 Found ${memberships.length} team memberships`);
    
    if (memberships.length > 0) {
      console.log('\n📋 Team Memberships:');
      memberships.forEach((membership, index) => {
        console.log(`\n${index + 1}. Membership ID: ${membership._id}`);
        console.log(`   User ID: ${membership.userId}`);
        console.log(`   Organization ID: ${membership.organizationId}`);
        console.log(`   Role: ${membership.role}`);
        console.log(`   Status: ${membership.status}`);
      });
    }
    
    // Check specific user memberships
    for (const user of users) {
      const userMemberships = await db.collection('team_members').find({
        userId: user._id,
        status: 'active'
      }).toArray();
      
      console.log(`\n🔍 User ${user.email} memberships:`);
      if (userMemberships.length === 0) {
        console.log('   ❌ No active memberships found');
      } else {
        userMemberships.forEach((membership, index) => {
          console.log(`   ${index + 1}. Organization: ${membership.organizationId} (Role: ${membership.role})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

debugUserMemberships().catch(console.error);
