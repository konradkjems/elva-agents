/**
 * Initialize Audit Log Collection
 * 
 * Creates audit_log collection with proper indexes for GDPR compliance
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function initAuditLog() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('elva-agents');
    
    console.log('📝 Creating audit_log collection...');
    
    // Create collection if it doesn't exist
    const collections = await db.listCollections({ name: 'audit_log' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('audit_log');
      console.log('✅ audit_log collection created');
    } else {
      console.log('ℹ️  audit_log collection already exists');
    }
    
    const auditLog = db.collection('audit_log');
    
    // Create indexes for efficient querying
    console.log('📝 Creating indexes...');
    
    await auditLog.createIndex({ timestamp: -1 }); // Sort by time
    await auditLog.createIndex({ userId: 1, timestamp: -1 }); // User activity timeline
    await auditLog.createIndex({ action: 1 }); // Filter by action type
    await auditLog.createIndex({ 'metadata.organizationId': 1 }); // Organization audit
    
    // TTL index - keep audit logs for 2 years for compliance
    await auditLog.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 } // 2 years
    );
    
    console.log('✅ Indexes created');
    
    // Insert sample audit entry to verify
    await auditLog.insertOne({
      action: 'audit_log_initialized',
      timestamp: new Date(),
      metadata: {
        version: '1.0',
        initializedBy: 'system'
      }
    });
    
    console.log('✅ Audit log initialized successfully!');
    
    console.log('\n📋 Audit log will track:');
    console.log('   - account_deletion_requested');
    console.log('   - account_permanently_deleted');
    console.log('   - account_deletion_cancelled');
    console.log('   - data_export');
    console.log('   - consent_changed');
    console.log('   - password_changed');
    console.log('   - user_login');
    console.log('   - gdpr_request (any GDPR-related request)');
    
  } catch (error) {
    console.error('❌ Error initializing audit log:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  initAuditLog();
}

module.exports = { initAuditLog };

