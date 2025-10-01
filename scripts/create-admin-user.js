const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function createAdminUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    // Using new database for multi-tenancy (keeps old chatwidgets as backup)
    const db = client.db('elva-agents');
    
    // Check if admin user already exists
    const existingAdmin = await db.collection('users').findOne({ 
      email: 'admin@elva-solutions.com' 
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('📧 Email: admin@elva-solutions.com');
      console.log('🔑 Password: admin123 (if not changed)');
      console.log('\n💡 To make them platform admin, run:');
      console.log('   node scripts/set-platform-admin.js admin@elva-solutions.com');
      return;
    }
    
    console.log('🔄 Creating admin user with organization...\n');
    
    // Create admin user with new multi-tenancy fields
    const adminUser = {
      email: 'admin@elva-solutions.com',
      name: 'Admin User',
      password: 'admin123', // In production, use bcrypt to hash passwords
      role: 'admin', // Legacy field
      permissions: ['read', 'write', 'delete', 'analytics'], // Legacy field
      platformRole: 'user', // Will be set to platform_admin separately
      provider: 'credentials',
      emailVerified: true,
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      preferences: {
        theme: 'light',
        language: 'da',
        notifications: {
          email: true,
          newWidgetCreated: true,
          teamInvitation: true
        }
      }
    };
    
    const userResult = await db.collection('users').insertOne(adminUser);
    console.log('✅ Admin user created');
    
    // Get the inserted ID for use in organization
    const adminUserId = userResult.insertedId;
    
    // Create personal organization for admin
    const organization = {
      name: "Admin's Organization",
      slug: 'admin-org',
      ownerId: adminUserId,
      plan: 'enterprise',
      limits: {
        maxWidgets: 999,
        maxTeamMembers: 999,
        maxConversations: 999999,
        maxDemos: 0
      },
      subscriptionStatus: 'active',
      settings: {
        allowDemoCreation: false,
        requireEmailVerification: false,
        allowGoogleAuth: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orgResult = await db.collection('organizations').insertOne(organization);
    console.log('✅ Organization created');
    
    // Create team member entry (owner)
    const teamMember = {
      organizationId: orgResult.insertedId,
      userId: adminUserId,
      role: 'owner',
      permissions: {
        widgets: { create: true, read: true, update: true, delete: true },
        demos: { create: false, read: true, update: false, delete: false },
        team: { invite: true, manage: true, remove: true },
        settings: { view: true, edit: true }
      },
      status: 'active',
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('team_members').insertOne(teamMember);
    console.log('✅ Team membership created');
    
    // Set current organization
    await db.collection('users').updateOne(
      { _id: adminUserId },
      { $set: { currentOrganizationId: orgResult.insertedId } }
    );
    console.log('✅ Current organization set');
    
    console.log('\n🎉 Admin user setup complete!\n');
    console.log('📧 Email: admin@elva-solutions.com');
    console.log('🔑 Password: admin123');
    console.log('🏢 Organization: Admin\'s Organization');
    console.log('👤 Role: Owner');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Please change the password after first login!');
    console.log('   2. To make platform admin (access all orgs + demos), run:');
    console.log('      node scripts/set-platform-admin.js admin@elva-solutions.com');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

createAdminUser();
