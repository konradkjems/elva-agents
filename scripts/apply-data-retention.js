/**
 * Apply Data Retention Policies
 * 
 * Scheduled job to delete conversations based on per-widget retention settings
 * GDPR Article 5(1)(e) - Storage Limitation
 * 
 * Run daily or weekly depending on data volume
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function applyDataRetentionPolicies() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('elva-agents');

    console.log('⏰ Applying data retention policies...');
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    // Get all widgets with their retention settings
    const widgets = await db.collection('widgets').find({}).toArray();
    
    console.log(`📋 Found ${widgets.length} widgets to process`);

    let totalDeleted = 0;
    let totalAnonymized = 0;

    for (const widget of widgets) {
      const widgetIdStr = widget._id.toString();
      
      // Get retention settings (default to 30 days if not specified)
      const conversationDays = widget.dataRetention?.conversationDays || 30;
      const anonymizeAfterDays = widget.dataRetention?.anonymizeAfterDays || 90;
      
      console.log(`\n📱 Widget: ${widget.name} (${widgetIdStr})`);
      console.log(`   Delete after: ${conversationDays} days`);
      console.log(`   Anonymize after: ${anonymizeAfterDays} days`);

      // Calculate cutoff dates
      const deleteCutoff = new Date();
      deleteCutoff.setDate(deleteCutoff.getDate() - conversationDays);
      
      const anonymizeCutoff = new Date();
      anonymizeCutoff.setDate(anonymizeCutoff.getDate() - anonymizeAfterDays);

      // Delete old conversations
      const deleteResult = await db.collection('conversations').deleteMany({
        widgetId: widgetIdStr,
        createdAt: { $lt: deleteCutoff }
      });
      
      if (deleteResult.deletedCount > 0) {
        console.log(`   🗑️  Deleted ${deleteResult.deletedCount} conversations older than ${conversationDays} days`);
        totalDeleted += deleteResult.deletedCount;
      }

      // Anonymize very old conversations (keep for statistics but remove messages)
      const anonymizeResult = await db.collection('conversations').updateMany(
        {
          widgetId: widgetIdStr,
          createdAt: { $lt: anonymizeCutoff },
          anonymized: { $ne: true }
        },
        {
          $set: {
            anonymized: true,
            anonymizedAt: new Date(),
            messages: [], // Remove message content
            userId: 'anonymized'
          },
          $unset: {
            'metadata.userAgent': '',
            'metadata.referrer': ''
          }
        }
      );

      if (anonymizeResult.modifiedCount > 0) {
        console.log(`   🔒 Anonymized ${anonymizeResult.modifiedCount} conversations older than ${anonymizeAfterDays} days`);
        totalAnonymized += anonymizeResult.modifiedCount;
      }

      // Log retention policy application
      await db.collection('audit_log').insertOne({
        action: 'data_retention_applied',
        timestamp: new Date(),
        metadata: {
          widgetId: widgetIdStr,
          widgetName: widget.name,
          retentionDays: conversationDays,
          conversationsDeleted: deleteResult.deletedCount,
          conversationsAnonymized: anonymizeResult.modifiedCount
        }
      });
    }

    console.log('\n📊 Retention Policy Summary:');
    console.log(`   Total conversations deleted: ${totalDeleted}`);
    console.log(`   Total conversations anonymized: ${totalAnonymized}`);
    console.log(`   Widgets processed: ${widgets.length}`);

    return {
      success: true,
      deleted: totalDeleted,
      anonymized: totalAnonymized,
      widgetsProcessed: widgets.length
    };

  } catch (error) {
    console.error('❌ Error applying retention policies:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  applyDataRetentionPolicies().then((result) => {
    if (result.success) {
      console.log('\n✅ Data retention policies applied successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Failed to apply retention policies');
      process.exit(1);
    }
  });
}

module.exports = { applyDataRetentionPolicies };

