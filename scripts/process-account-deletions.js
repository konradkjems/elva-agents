/**
 * Process Account Deletions
 *
 * Cron job to permanently delete accounts after the 30-day grace period.
 * Should run daily: 0 2 * * * (2 AM every day).
 *
 * GDPR Article 17 compliance - Right to Erasure.
 *
 * Postgres/Supabase version. Relies on the schema's ON DELETE CASCADE rules:
 * deleting an organization cascades to its widgets (and their conversations,
 * analytics, satisfaction_analytics), team_members and support_requests;
 * deleting a user cascades that user's team_members and nulls owner_id /
 * created_by on anything they created. We also remove the matching auth.users
 * row so no login credential is left behind.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function processAccountDeletions() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Supabase env not set (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    return { error: 'Configuration error' };
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const now = new Date().toISOString();
    console.log(`⏰ Processing deletions for: ${now}`);

    const { data: accountsToDelete, error: findErr } = await admin
      .from('users')
      .select('id, email, deletion_reason, deletion_scheduled_at')
      .eq('status', 'pending_deletion')
      .lte('deletion_date', now);
    if (findErr) throw findErr;

    console.log(`📋 Found ${accountsToDelete.length} accounts to permanently delete`);

    const results = { processed: 0, failed: 0, accounts: [] };

    for (const user of accountsToDelete) {
      console.log(`\n🗑️  Processing user: ${user.email} (ID: ${user.id})`);

      try {
        // Organizations the user belongs to.
        const { data: memberships } = await admin
          .from('team_members')
          .select('organization_id')
          .eq('user_id', user.id);
        const orgIds = [...new Set((memberships || []).map((m) => m.organization_id).filter(Boolean))];
        console.log(`   Organizations: ${orgIds.length}`);

        // Delete organizations the user solely owns (no other members). This
        // cascades widgets -> conversations/analytics/satisfaction, plus the
        // org's team_members and support_requests.
        let orgsDeleted = 0;
        for (const orgId of orgIds) {
          const { count: others } = await admin
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .neq('user_id', user.id);
          if ((others || 0) === 0) {
            const { error: orgErr } = await admin.from('organizations').delete().eq('id', orgId);
            if (orgErr) throw orgErr;
            orgsDeleted++;
            console.log(`   Deleted organization (sole owner): ${orgId}`);
          }
        }

        // Invitations addressed to this email.
        const { count: invDeleted } = await admin
          .from('invitations')
          .delete({ count: 'exact' })
          .eq('email', user.email);
        console.log(`   Deleted ${invDeleted || 0} invitations`);

        // Delete the profile row. Cascades remaining team_members (shared orgs)
        // and nulls owner_id/created_by on shared resources.
        const { error: userErr } = await admin.from('users').delete().eq('id', user.id);
        if (userErr) throw userErr;
        console.log(`   ✅ Profile deleted: ${user.email}`);

        // Remove the Supabase Auth credential.
        try {
          await admin.auth.admin.deleteUser(user.id);
          console.log('   ✅ Auth user deleted');
        } catch (authErr) {
          console.warn('   ⚠ Auth user delete failed (may already be gone):', authErr.message);
        }

        // Compliance audit trail.
        await admin.from('audit_log').insert({
          action: 'account_permanently_deleted',
          metadata: {
            userId: user.id,
            email: user.email,
            deletionReason: user.deletion_reason,
            scheduledAt: user.deletion_scheduled_at,
            organizationsDeleted: orgsDeleted,
            invitationsDeleted: invDeleted || 0,
          },
        });

        results.processed++;
        results.accounts.push({ email: user.email, success: true });
      } catch (error) {
        console.error(`   ❌ Failed to delete user ${user.email}:`, error.message);
        results.failed++;
        results.accounts.push({ email: user.email, success: false, error: error.message });
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
  }
}

// Run if called directly
if (require.main === module) {
  processAccountDeletions().then(() => {
    console.log('✅ Deletion processing complete');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processAccountDeletions };
