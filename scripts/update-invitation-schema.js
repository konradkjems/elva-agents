/**
 * Update Invitation and Team Members Schema Validation
 * 
 * Fixes role enums to match API expectations
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function updateSchemas() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('elva-agents');

    // Update invitations collection validation
    console.log('📋 Updating invitations collection schema...');
    await db.command({
      collMod: 'invitations',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['organizationId', 'email', 'role', 'token', 'status', 'expiresAt', 'createdAt'],
          properties: {
            organizationId: {
              bsonType: 'objectId',
              description: 'Organization ID is required'
            },
            email: {
              bsonType: 'string',
              description: 'Email is required'
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
            declinedAt: { bsonType: 'date' },
            cancelledAt: { bsonType: 'date' },
            cancelledBy: { bsonType: 'objectId' },
            resentAt: { bsonType: 'date' },
            resentBy: { bsonType: 'objectId' },
            resentCount: { bsonType: 'number' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });
    console.log('✅ Invitations collection schema updated\n');

    // Update team_members collection validation
    console.log('📋 Updating team_members collection schema...');
    await db.command({
      collMod: 'team_members',
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
            invitationId: { bsonType: 'objectId' },
            invitedAt: { bsonType: 'date' },
            joinedAt: { bsonType: 'date' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });
    console.log('✅ Team members collection schema updated\n');

    console.log('🎉 Schema validation updated successfully!');
    console.log('\nYou can now send invitations without validation errors.');

  } catch (error) {
    console.error('❌ Error updating schemas:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

console.log('🚀 Starting schema update...\n');
updateSchemas()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

