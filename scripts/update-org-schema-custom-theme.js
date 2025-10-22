/**
 * Update Organizations Schema - Add Custom Theme Support
 * 
 * Adds useCustomTheme field to organization schema validation
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function updateSchema() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('elva-agents');

    // Update the collection validator to include useCustomTheme
    await db.command({
      collMod: 'organizations',
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
            useCustomTheme: { bsonType: 'bool' },
            domain: { bsonType: 'string' },
            plan: {
              bsonType: 'string',
              enum: ['free', 'basic', 'starter', 'growth', 'pro', 'enterprise'],
              description: 'Must be one of: free, basic, starter, growth, pro, enterprise'
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
      },
      validationLevel: 'moderate', // Only validate on updates, not on inserts of existing docs
      validationAction: 'error'
    });

    console.log('✅ Updated organizations schema to include useCustomTheme field');

    // Add default useCustomTheme: false to existing organizations
    const result = await db.collection('organizations').updateMany(
      { useCustomTheme: { $exists: false } },
      { $set: { useCustomTheme: false, updatedAt: new Date() } }
    );

    console.log(`✅ Updated ${result.modifiedCount} organizations with default useCustomTheme: false`);

    // Verify the update
    const orgsWithTheme = await db.collection('organizations').countDocuments({
      useCustomTheme: { $exists: true }
    });
    const totalOrgs = await db.collection('organizations').countDocuments({
      deletedAt: { $exists: false }
    });

    console.log(`\n📊 Verification:`);
    console.log(`   Total active organizations: ${totalOrgs}`);
    console.log(`   Organizations with useCustomTheme field: ${orgsWithTheme}`);

    if (orgsWithTheme === totalOrgs) {
      console.log('✅ All organizations have useCustomTheme field!');
    } else {
      console.log('⚠️  Some organizations are missing the useCustomTheme field');
    }

  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

console.log('🚀 Starting schema update for custom theme support...\n');
updateSchema();

