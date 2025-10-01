/**
 * Migration Script: Convert Single-Tenant to Multi-Tenant
 * 
 * This script:
 * 1. Adds platformRole to all existing users
 * 2. Creates personal organizations for all existing users
 * 3. Migrates existing widgets to personal organizations
 * 4. Updates existing demos to new schema
 * 
 * IMPORTANT: Backup your database before running this!
 * Usage: node scripts/migrate-to-organizations.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Helper to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function migrateToOrganizations() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Using new database for multi-tenancy (keeps old chatwidgets as backup)
    const db = client.db('elva-agents');

    console.log('\n⚠️  MIGRATION START - This will modify your database');
    console.log('   Please ensure you have a backup!\n');

    // ========================================
    // 1. Update Users Collection
    // ========================================
    console.log('📝 Step 1: Updating users collection...');
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`   Found ${users.length} users`);

    let userUpdates = 0;
    for (const user of users) {
      const updates = {};
      
      // Add platformRole if missing (default to 'user')
      if (!user.platformRole) {
        // You can manually set specific emails as platform_admin
        // For now, first user or specific email becomes platform_admin
        updates.platformRole = 'user';
      }

      // Add preferences if missing
      if (!user.preferences) {
        updates.preferences = {
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            newWidgetCreated: true,
            teamInvitation: true
          }
        };
      }

      // Add status if missing
      if (!user.status) {
        updates.status = 'active';
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: updates }
        );
        userUpdates++;
      }
    }
    
    console.log(`✅ Updated ${userUpdates} users`);

    // ========================================
    // 2. Create Personal Organizations
    // ========================================
    console.log('\n📝 Step 2: Creating personal organizations for existing users...');
    
    let orgsCreated = 0;
    let teamMembersCreated = 0;
    
    for (const user of users) {
      // Check if user already has an organization
      const existingMembership = await db.collection('team_members').findOne({ userId: user._id });
      
      if (!existingMembership) {
        // Create personal organization
        const orgName = `${user.name}'s Organization` || `${user.email}'s Organization`;
        const orgSlug = generateSlug(user.name || user.email.split('@')[0]) + '-org';
        
        // Ensure slug is unique
        let finalSlug = orgSlug;
        let counter = 1;
        while (await db.collection('organizations').findOne({ slug: finalSlug })) {
          finalSlug = `${orgSlug}-${counter}`;
          counter++;
        }

        const newOrg = {
          _id: new ObjectId(),
          name: orgName,
          slug: finalSlug,
          ownerId: user._id,
          logo: user.image || null,
          primaryColor: '#1E40AF',
          plan: 'free',
          limits: {
            maxWidgets: 10,
            maxTeamMembers: 5,
            maxConversations: 10000,
            maxDemos: 0 // Regular users can't create demos
          },
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          settings: {
            allowDemoCreation: false, // Only platform admins can create demos
            requireEmailVerification: false,
            allowGoogleAuth: true
          },
          createdAt: user.createdAt || new Date(),
          updatedAt: new Date()
        };

        await db.collection('organizations').insertOne(newOrg);
        orgsCreated++;

        // Create team member entry (owner)
        const teamMember = {
          _id: new ObjectId(),
          organizationId: newOrg._id,
          userId: user._id,
          role: 'owner',
          permissions: {
            widgets: { create: true, read: true, update: true, delete: true },
            demos: { create: false, read: true, update: false, delete: false }, // Demos are platform-only
            team: { invite: true, manage: true, remove: true },
            settings: { view: true, edit: true }
          },
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('team_members').insertOne(teamMember);
        teamMembersCreated++;

        // Set this as the user's current organization
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { currentOrganizationId: newOrg._id } }
        );

        console.log(`   ✓ Created org "${orgName}" for ${user.email}`);
      } else {
        console.log(`   ℹ️  User ${user.email} already has organization membership`);
      }
    }
    
    console.log(`✅ Created ${orgsCreated} organizations and ${teamMembersCreated} team memberships`);

    // ========================================
    // 3. Migrate Existing Widgets
    // ========================================
    console.log('\n📝 Step 3: Migrating existing widgets to organizations...');
    
    const widgets = await db.collection('widgets').find({
      organizationId: { $exists: false },
      isDemoMode: { $ne: true } // Skip demo widgets
    }).toArray();
    
    console.log(`   Found ${widgets.length} widgets to migrate`);

    let widgetsMigrated = 0;
    for (const widget of widgets) {
      // Find the user who created this widget
      const creatorId = widget.createdBy || widget.userId;
      
      if (!creatorId) {
        console.log(`   ⚠️  Widget ${widget._id} has no creator, skipping`);
        continue;
      }

      // Find the user's personal organization
      const teamMember = await db.collection('team_members').findOne({
        userId: creatorId,
        role: 'owner'
      });

      if (teamMember) {
        await db.collection('widgets').updateOne(
          { _id: widget._id },
          {
            $set: {
              organizationId: teamMember.organizationId,
              createdBy: creatorId,
              lastEditedBy: creatorId,
              lastEditedAt: widget.updatedAt || new Date()
            }
          }
        );
        widgetsMigrated++;
      } else {
        console.log(`   ⚠️  No organization found for widget ${widget._id} creator`);
      }
    }
    
    console.log(`✅ Migrated ${widgetsMigrated} widgets to organizations`);

    // ========================================
    // 4. Update Existing Demos Schema
    // ========================================
    console.log('\n📝 Step 4: Updating existing demos schema...');
    
    const demos = await db.collection('demos').find({}).toArray();
    console.log(`   Found ${demos.length} demos to update`);

    let demosUpdated = 0;
    for (const demo of demos) {
      const updates = {};
      
      // Remove organizationId if it exists (demos are platform-level)
      if (demo.organizationId) {
        updates.$unset = { organizationId: "" };
      }

      // Ensure createdBy is set
      if (!demo.createdBy) {
        // Try to get from userId or set to first platform admin
        const creator = demo.userId || users[0]._id;
        if (!updates.$set) updates.$set = {};
        updates.$set.createdBy = creator;
      }

      // Add targetClient if missing
      if (!demo.targetClient && !updates.$set) {
        updates.$set = {};
      }
      
      if (!demo.targetClient) {
        updates.$set.targetClient = {
          name: demo.name || 'Unknown Client',
          email: '',
          notes: 'Migrated from old demo system'
        };
      }

      // Add status if missing
      if (!demo.status) {
        if (!updates.$set) updates.$set = {};
        updates.$set.status = demo.demoSettings?.expiresAt && new Date(demo.demoSettings.expiresAt) < new Date() 
          ? 'expired' 
          : 'active';
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('demos').updateOne(
          { _id: demo._id },
          updates
        );
        demosUpdated++;
      }
    }
    
    console.log(`✅ Updated ${demosUpdated} demos`);

    // ========================================
    // Summary
    // ========================================
    console.log('\n✨ Migration complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Users updated: ${userUpdates}`);
    console.log(`   - Organizations created: ${orgsCreated}`);
    console.log(`   - Team memberships created: ${teamMembersCreated}`);
    console.log(`   - Widgets migrated: ${widgetsMigrated}`);
    console.log(`   - Demos updated: ${demosUpdated}`);
    console.log('\n⚡ Next steps:');
    console.log('   1. Verify data: node scripts/verify-migration.js');
    console.log('   2. Set platform admin: node scripts/set-platform-admin.js <email>');
    console.log('   3. Test the application');

  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('\n⚠️  IMPORTANT: Check your database state!');
    console.error('   You may need to restore from backup if migration failed partially');
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  migrateToOrganizations();
}

module.exports = { migrateToOrganizations };

