/**
 * Cron Job: Check Conversation Quotas and Send Notifications
 *
 * This endpoint should be triggered daily (or as needed) to check
 * all organization quotas and send notifications at threshold levels.
 *
 * Vercel Cron: Configure in vercel.json
 * Manual trigger: GET /api/cron/check-quotas?secret=YOUR_CRON_SECRET
 */

import { admin } from '../../../lib/supabase/admin';
import { sendQuotaNotificationEmail } from '../../../lib/email.js';

export default async function handler(req, res) {
  // Verify cron secret for security
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';
  const providedSecret = req.query.secret || req.headers['x-cron-secret'];

  // Vercel Cron sends authorization header
  const vercelCronAuth = req.headers['authorization'];
  const isVercelCron = vercelCronAuth === `Bearer ${cronSecret}`;

  if (providedSecret !== cronSecret && !isVercelCron) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting quota check cron job...');

    // Get all organizations with usage tracking
    const { data: organizationRows, error: orgErr } = await admin
      .from('organizations')
      .select('id, name, plan, usage, owner_id, billing_email')
      .not('usage->conversations', 'is', null);
    if (orgErr) throw orgErr;

    const organizations = organizationRows || [];

    console.log(`📊 Found ${organizations.length} organizations to check`);

    let notificationsSent = 0;
    let errors = 0;

    for (const org of organizations) {
      try {
        const usage = org.usage?.conversations;
        if (!usage) continue;

        const usagePercentage = (usage.current / usage.limit) * 100;
        const sentThresholds = usage.notificationsSent || [];

        // Determine which thresholds need notifications
        const thresholdsToNotify = [];

        if (usagePercentage >= 110 && !sentThresholds.includes('110%')) {
          thresholdsToNotify.push('110%');
        } else if (usagePercentage >= 100 && !sentThresholds.includes('100%')) {
          thresholdsToNotify.push('100%');
        } else if (usagePercentage >= 80 && !sentThresholds.includes('80%')) {
          thresholdsToNotify.push('80%');
        }

        if (thresholdsToNotify.length === 0) continue;

        // Get admin emails (team_members → users; disambiguate the double FK)
        const { data: teamMembers } = await admin
          .from('team_members')
          .select('users!team_members_user_id_fkey(email)')
          .eq('organization_id', org.id)
          .eq('status', 'active')
          .in('role', ['owner', 'admin']);

        const adminEmails = (teamMembers || []).map(m => m.users?.email).filter(Boolean);

        // Get owner email
        let ownerEmail = null;
        if (org.owner_id) {
          const { data: owner } = await admin
            .from('users')
            .select('email')
            .eq('id', org.owner_id)
            .maybeSingle();
          ownerEmail = owner?.email;
        }

        // Send notification for the highest threshold
        const threshold = thresholdsToNotify[0];

        await sendQuotaNotificationEmail({
          organizationName: org.name,
          ownerEmail: ownerEmail,
          billingEmail: org.billing_email,
          adminEmails: adminEmails,
          usagePercentage: Math.round(usagePercentage),
          current: usage.current,
          limit: usage.limit,
          plan: org.plan || 'free'
        });

        // Mark notification as sent (append threshold to the usage JSONB)
        const newUsage = {
          ...org.usage,
          conversations: {
            ...usage,
            notificationsSent: [...sentThresholds, threshold]
          }
        };
        await admin
          .from('organizations')
          .update({ usage: newUsage })
          .eq('id', org.id);

        notificationsSent++;
        console.log(`✅ Sent ${threshold} notification for ${org.name}`);

      } catch (orgError) {
        console.error(`❌ Error processing ${org.name}:`, orgError);
        errors++;
      }
    }

    console.log('✨ Quota check cron job complete!');
    console.log(`   📧 Notifications sent: ${notificationsSent}`);
    console.log(`   ❌ Errors: ${errors}`);

    return res.status(200).json({
      success: true,
      checked: organizations.length,
      notificationsSent: notificationsSent,
      errors: errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
