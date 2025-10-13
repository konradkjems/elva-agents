/**
 * Process Account Deletions
 * 
 * Cron job to permanently delete accounts after grace period
 * Should run daily: 0 2 * * * (2 AM every day)
 * 
 * GDPR Article 17 compliance - Right to Erasure
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function processAccountDeletions() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    return { error: 'Configuration error' };
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('elva-agents');

    const now = new Date();
    console.log(`⏰ Processing deletions for: ${now.toISOString()}`);

    // Find accounts past grace period
    const accountsToDelete = await db.collection('users').find({
      status: 'pending_deletion',
      deletionDate: { $lte: now }
    }).toArray();

    console.log(`📋 Found ${accountsToDelete.length} accounts to permanently delete`);

    const results = {
      processed: 0,
      failed: 0,
      accounts: []
    };

    for (const user of accountsToDelete) {
      console.log(`\n🗑️  Processing user: ${user.email} (ID: ${user._id})`);

      try {
        // Get user's organizations
        const memberships = await db.collection('team_members').find({
          userId: user._id
        }).toArray();

        const orgIds = memberships.map(m => new ObjectId(m.organizationId));

        console.log(`   Organizations: ${orgIds.length}`);

        // Get user's widgets
        const widgets = await db.collection('widgets').find({
          organizationId: { $in: orgIds }
        }).toArray();

        const widgetIds = widgets.map(w => w._id);
        const widgetStringIds = widgets.map(w => w._id.toString());

        console.log(`   Widgets: ${widgetIds.length}`);

        // Delete cascade - conversations
        const conversationsDeleted = await db.collection('conversations').deleteMany({
          widgetId: { $in: widgetStringIds }
        });
        console.log(`   Deleted ${conversationsDeleted.deletedCount} conversations`);

        // Delete manual reviews
        const reviewsDeleted = await db.collection('manual_reviews').deleteMany({
          widgetId: { $in: widgetIds }
        });
        console.log(`   Deleted ${reviewsDeleted.deletedCount} manual reviews`);

        // Anonymize analytics (keep for statistics, but remove link to user)
        const analyticsAnonymized = await db.collection('analytics').updateMany(
          { agentId: { $in: widgetStringIds } },
          { 
            $set: { 
              anonymized: true, 
              originalUserId: 'deleted',
              anonymizedAt: new Date()
            } 
          }
        );
        console.log(`   Anonymized ${analyticsAnonymized.modifiedCount} analytics records`);

        // Delete widgets
        const widgetsDeleted = await db.collection('widgets').deleteMany({
          organizationId: { $in: orgIds }
        });
        console.log(`   Deleted ${widgetsDeleted.deletedCount} widgets`);

        // Remove from team memberships
        const membershipsDeleted = await db.collection('team_members').deleteMany({
          userId: user._id
        });
        console.log(`   Deleted ${membershipsDeleted.deletedCount} team memberships`);

        // Delete organizations where user was sole owner
        for (const orgId of orgIds) {
          const otherMembers = await db.collection('team_members').countDocuments({
            organizationId: orgId
          });

          if (otherMembers === 0) {
            await db.collection('organizations').deleteOne({ _id: orgId });
            console.log(`   Deleted organization: ${orgId}`);
          }
        }

        // Delete invitations
        const invitationsDeleted = await db.collection('invitations').deleteMany({
          email: user.email
        });
        console.log(`   Deleted ${invitationsDeleted.deletedCount} invitations`);

        // Finally, delete user
        await db.collection('users').deleteOne({ _id: user._id });
        console.log(`   ✅ User deleted: ${user.email}`);

        // Log permanent deletion (for compliance audit trail)
        await db.collection('audit_log').insertOne({
          action: 'account_permanently_deleted',
          timestamp: new Date(),
          metadata: {
            userId: user._id.toString(),
            email: user.email,
            deletionReason: user.deletionReason,
            scheduledAt: user.deletionScheduledAt,
            itemsDeleted: {
              conversations: conversationsDeleted.deletedCount,
              widgets: widgetsDeleted.deletedCount,
              manualReviews: reviewsDeleted.deletedCount,
              memberships: membershipsDeleted.deletedCount,
              invitations: invitationsDeleted.deletedCount,
              analyticsAnonymized: analyticsAnonymized.modifiedCount
            }
          }
        });

        results.processed++;
        results.accounts.push({
          email: user.email,
          success: true
        });

      } catch (error) {
        console.error(`   ❌ Failed to delete user ${user.email}:`, error);
        results.failed++;
        results.accounts.push({
          email: user.email,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Total: ${accountsToDelete.length}`);

    return results;

  } catch (error) {
    console.error('❌ Error processing deletions:', error);
    return { error: error.message };
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  processAccountDeletions().then(() => {
    console.log('✅ Deletion processing complete');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processAccountDeletions };

