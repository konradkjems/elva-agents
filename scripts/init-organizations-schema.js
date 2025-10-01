/**
 * Initialize Organizations, Team Members, and Invitations Collections
 * Run this script to set up the database schema for multi-tenancy
 * 
 * Usage: node scripts/init-organizations-schema.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function initializeSchema() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Using new database for multi-tenancy (keeps old chatwidgets as backup)
    const db = client.db('elva-agents');

    // ========================================
    // 1. Create Organizations Collection
    // ========================================
    console.log('\n📦 Creating organizations collection...');
    
    const organizationsExists = await db.listCollections({ name: 'organizations' }).hasNext();
    if (!organizationsExists) {
      await db.createCollection('organizations', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'slug', 'ownerId', 'createdAt'],
            properties: {
              name: {
                bsonType: 'string',
                description: 'Organization name is required'
              },
              slug: {
                bsonType: 'string',
                description: 'Unique slug identifier is required'
              },
              ownerId: {
                bsonType: 'objectId',
                description: 'Owner user ID is required'
              },
              logo: { bsonType: 'string' },
              primaryColor: { bsonType: 'string' },
              domain: { bsonType: 'string' },
              plan: {
                bsonType: 'string',
                enum: ['free', 'starter', 'pro', 'enterprise'],
                description: 'Must be one of: free, starter, pro, enterprise'
              },
              limits: { bsonType: 'object' },
              billingEmail: { bsonType: 'string' },
              subscriptionStatus: {
                bsonType: 'string',
                enum: ['active', 'trial', 'expired', 'cancelled']
              },
              subscriptionId: { bsonType: 'string' },
              trialEndsAt: { bsonType: 'date' },
              settings: { bsonType: 'object' },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' },
              deletedAt: { bsonType: 'date' }
            }
          }
        }
      });

      // Create indexes
      await db.collection('organizations').createIndex({ slug: 1 }, { unique: true });
      await db.collection('organizations').createIndex({ ownerId: 1 });
      await db.collection('organizations').createIndex({ createdAt: -1 });
      await db.collection('organizations').createIndex({ deletedAt: 1 });
      
      console.log('✅ Organizations collection created with indexes');
    } else {
      console.log('ℹ️  Organizations collection already exists');
    }

    // ========================================
    // 2. Create Team Members Collection
    // ========================================
    console.log('\n📦 Creating team_members collection...');
    
    const teamMembersExists = await db.listCollections({ name: 'team_members' }).hasNext();
    if (!teamMembersExists) {
      await db.createCollection('team_members', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['organizationId', 'userId', 'role', 'status', 'createdAt'],
            properties: {
              organizationId: {
                bsonType: 'objectId',
                description: 'Organization ID is required'
              },
              userId: {
                bsonType: 'objectId',
                description: 'User ID is required'
              },
              role: {
                bsonType: 'string',
                enum: ['owner', 'admin', 'member', 'viewer'],
                description: 'Must be one of: owner, admin, member, viewer'
              },
              permissions: { bsonType: 'object' },
              status: {
                bsonType: 'string',
                enum: ['invited', 'active', 'suspended', 'removed'],
                description: 'Must be one of: invited, active, suspended, removed'
              },
              invitedBy: { bsonType: 'objectId' },
              invitedAt: { bsonType: 'date' },
              joinedAt: { bsonType: 'date' },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' }
            }
          }
        }
      });

      // Create indexes
      await db.collection('team_members').createIndex({ organizationId: 1, userId: 1 }, { unique: true });
      await db.collection('team_members').createIndex({ userId: 1 });
      await db.collection('team_members').createIndex({ organizationId: 1, status: 1 });
      await db.collection('team_members').createIndex({ createdAt: -1 });
      
      console.log('✅ Team members collection created with indexes');
    } else {
      console.log('ℹ️  Team members collection already exists');
    }

    // ========================================
    // 3. Create Invitations Collection
    // ========================================
    console.log('\n📦 Creating invitations collection...');
    
    const invitationsExists = await db.listCollections({ name: 'invitations' }).hasNext();
    if (!invitationsExists) {
      await db.createCollection('invitations', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['organizationId', 'email', 'invitedBy', 'role', 'token', 'status', 'expiresAt', 'createdAt'],
            properties: {
              organizationId: {
                bsonType: 'objectId',
                description: 'Organization ID is required'
              },
              email: {
                bsonType: 'string',
                description: 'Invitee email is required'
              },
              invitedBy: {
                bsonType: 'objectId',
                description: 'Inviter user ID is required'
              },
              role: {
                bsonType: 'string',
                enum: ['owner', 'admin', 'member', 'viewer'],
                description: 'Must be one of: owner, admin, member, viewer'
              },
              token: {
                bsonType: 'string',
                description: 'Unique invitation token is required'
              },
              status: {
                bsonType: 'string',
                enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
                description: 'Must be one of: pending, accepted, declined, expired, cancelled'
              },
              expiresAt: {
                bsonType: 'date',
                description: 'Expiration date is required'
              },
              acceptedAt: { bsonType: 'date' },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' }
            }
          }
        }
      });

      // Create indexes
      await db.collection('invitations').createIndex({ token: 1 }, { unique: true });
      await db.collection('invitations').createIndex({ organizationId: 1, status: 1 });
      await db.collection('invitations').createIndex({ email: 1 });
      await db.collection('invitations').createIndex({ expiresAt: 1 });
      await db.collection('invitations').createIndex({ createdAt: -1 });
      
      console.log('✅ Invitations collection created with indexes');
    } else {
      console.log('ℹ️  Invitations collection already exists');
    }

    // ========================================
    // 4. Update Users Collection
    // ========================================
    console.log('\n📦 Updating users collection...');
    
    // Add indexes for new fields
    await db.collection('users').createIndex({ platformRole: 1 });
    await db.collection('users').createIndex({ currentOrganizationId: 1 });
    
    console.log('✅ Users collection indexes updated');

    // ========================================
    // 5. Update Widgets Collection
    // ========================================
    console.log('\n📦 Updating widgets collection...');
    
    // Add indexes for new fields
    await db.collection('widgets').createIndex({ organizationId: 1 });
    await db.collection('widgets').createIndex({ createdBy: 1 });
    await db.collection('widgets').createIndex({ organizationId: 1, createdAt: -1 });
    
    console.log('✅ Widgets collection indexes updated');

    // ========================================
    // 6. Update Demos Collection  
    // ========================================
    console.log('\n📦 Updating demos collection...');
    
    // Demos are platform-level, so organizationId index not needed
    // But ensure createdBy index exists
    const demosExists = await db.listCollections({ name: 'demos' }).hasNext();
    if (demosExists) {
      await db.collection('demos').createIndex({ createdBy: 1 });
      await db.collection('demos').createIndex({ 'targetClient.email': 1 });
      await db.collection('demos').createIndex({ status: 1 });
      await db.collection('demos').createIndex({ convertedToOrganizationId: 1 });
      
      console.log('✅ Demos collection indexes updated');
    } else {
      console.log('ℹ️  Demos collection does not exist yet (will be created on first demo)');
    }

    console.log('\n✨ Schema initialization complete!');
    console.log('\n📊 Summary:');
    console.log('   - Organizations collection: Ready');
    console.log('   - Team Members collection: Ready');
    console.log('   - Invitations collection: Ready');
    console.log('   - Users collection: Indexes updated');
    console.log('   - Widgets collection: Indexes updated');
    console.log('   - Demos collection: Indexes updated');
    console.log('\n⚡ Next steps:');
    console.log('   1. Run migration: node scripts/migrate-to-organizations.js');
    console.log('   2. Test with: node scripts/test-organizations-schema.js');

  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  initializeSchema();
}

module.exports = { initializeSchema };

