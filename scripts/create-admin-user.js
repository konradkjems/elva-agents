const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function createAdminUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('chatwidgets');
    
    // Check if admin user already exists
    const existingAdmin = await db.collection('users').findOne({ 
      email: 'admin@elva-solutions.com' 
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Create admin user
    const adminUser = {
      email: 'admin@elva-solutions.com',
      name: 'Admin User',
      password: 'admin123', // In production, use bcrypt to hash passwords
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'analytics'],
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      settings: {
        theme: 'light',
        language: 'da',
        notifications: true
      }
    };
    
    const result = await db.collection('users').insertOne(adminUser);
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@elva-solutions.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

createAdminUser();
