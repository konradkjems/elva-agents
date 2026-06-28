/**
 * Quota Management System
 *
 * Handles conversation quota tracking, checking, and notifications
 * for all subscription plans. Backed by Supabase/Postgres: the per-org counter
 * lives in organizations.usage (JSONB) and is incremented atomically via the
 * increment_conversation_count RPC.
 */

import { admin } from './supabase/admin';
import { sendQuotaNotificationEmail } from './email.js';

/**
 * Get conversation limit based on plan
 */
export function getConversationLimit(plan) {
  switch(plan) {
    case 'pro': return 750;
    case 'growth': return 300;
    case 'basic': return 100;
    case 'free': return 100;
    default: return 100;
  }
}

/**
 * Get start of current month
 */
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Get days remaining in current month
 */
function getDaysRemainingInMonth() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diffTime = Math.abs(nextMonth - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/** Fetch the columns quota logic needs for an organization. */
async function fetchOrg(organizationId) {
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, plan, usage, trial_ends_at, billing_email, owner_id')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Check if organization can create a new conversation
 *
 * @param {string} organizationId - Organization ID (uuid) to check
 * @returns {Promise<Object>} - { allowed: boolean, blocked: boolean, reason: string }
 */
export async function checkQuota(organizationId) {
  try {
    const organization = await fetchOrg(organizationId);

    if (!organization) {
      return { allowed: false, blocked: true, reason: 'organization_not_found' };
    }

    // Initialize usage if not present
    if (!organization.usage?.conversations) {
      await initializeUsage(organizationId, organization.plan);
      return { allowed: true, blocked: false };
    }

    const usage = organization.usage.conversations;
    const plan = organization.plan || 'free';

    // Check if quota needs monthly reset
    const monthStart = getMonthStart();
    if (new Date(usage.lastReset) < monthStart) {
      await resetMonthlyQuota(organizationId);
      return { allowed: true, blocked: false };
    }

    // For FREE tier: block when quota exceeded OR trial expired
    if (plan === 'free') {
      if (usage.current >= usage.limit) {
        return {
          allowed: false,
          blocked: true,
          reason: 'quota_exceeded',
          message: 'Månedlig kvote nået. Opgrader for at fortsætte.'
        };
      }

      if (organization.trial_ends_at && new Date() > new Date(organization.trial_ends_at)) {
        return {
          allowed: false,
          blocked: true,
          reason: 'trial_expired',
          message: 'Gratis prøveperiode udløbet. Opgrader for at fortsætte.'
        };
      }
    }

    // For PAID tiers: never block, just track overage
    return { allowed: true, blocked: false };

  } catch (error) {
    console.error('❌ Error checking quota:', error);
    // On error, allow the conversation (fail open)
    return { allowed: true, blocked: false, error: error.message };
  }
}

/**
 * Initialize usage tracking for an organization
 */
async function initializeUsage(organizationId, plan = 'free') {
  try {
    const monthStart = getMonthStart();
    const limit = getConversationLimit(plan);

    const { error } = await admin
      .from('organizations')
      .update({
        usage: {
          conversations: {
            current: 0,
            limit: limit,
            lastReset: monthStart.toISOString(),
            overage: 0,
            notificationsSent: []
          }
        }
      })
      .eq('id', organizationId);
    if (error) throw error;

    console.log(`✅ Initialized usage tracking for organization ${organizationId}`);
  } catch (error) {
    console.error('❌ Error initializing usage:', error);
    throw error;
  }
}

/**
 * Increment conversation count for an organization
 *
 * @param {string} organizationId - Organization ID (uuid)
 * @returns {Promise<Object>} - Updated usage statistics
 */
export async function incrementConversationCount(organizationId) {
  try {
    const organization = await fetchOrg(organizationId);

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Initialize if needed (so the counter has a limit before incrementing)
    if (!organization.usage?.conversations) {
      await initializeUsage(organizationId, organization.plan);
    }

    // Atomic increment of usage.conversations.current (returns updated usage)
    const { data: updatedUsage, error } = await admin.rpc(
      'increment_conversation_count',
      { org_id: organizationId }
    );
    if (error) throw error;

    const conv = updatedUsage?.conversations || {};
    const newCurrent = conv.current ?? 0;
    const limit = conv.limit ?? getConversationLimit(organization.plan || 'free');
    const newOverage = Math.max(0, newCurrent - limit);

    // Persist derived overage (eventual-consistent display value)
    conv.overage = newOverage;
    await admin.from('organizations')
      .update({ usage: { ...updatedUsage, conversations: conv } })
      .eq('id', organizationId);

    console.log(`📊 Incremented conversation count for ${organization.name}: ${newCurrent}/${limit}`);

    // Check if we need to send notifications
    const usagePercentage = (newCurrent / limit) * 100;
    await checkAndSendNotifications(organizationId, usagePercentage, newCurrent, limit);

    return {
      current: newCurrent,
      limit: limit,
      percentage: usagePercentage,
      overage: newOverage
    };

  } catch (error) {
    console.error('❌ Error incrementing conversation count:', error);
    throw error;
  }
}

/**
 * Get usage statistics for an organization
 *
 * @param {string} organizationId - Organization ID (uuid)
 * @returns {Promise<Object>} - Usage statistics
 */
export async function getUsageStats(organizationId) {
  try {
    const organization = await fetchOrg(organizationId);

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (!organization.usage?.conversations) {
      return {
        current: 0,
        limit: getConversationLimit(organization.plan || 'free'),
        percentage: 0,
        overage: 0,
        daysRemaining: getDaysRemainingInMonth(),
        lastReset: getMonthStart(),
        nextReset: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        notificationsSent: [],
        status: 'ok'
      };
    }

    const usage = organization.usage.conversations;
    const percentage = (usage.current / usage.limit) * 100;

    let status = 'ok';
    if (percentage >= 100) status = 'exceeded';
    else if (percentage >= 80) status = 'warning';

    return {
      current: usage.current,
      limit: usage.limit,
      percentage: Math.round(percentage),
      overage: usage.overage || 0,
      daysRemaining: getDaysRemainingInMonth(),
      lastReset: usage.lastReset,
      nextReset: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      notificationsSent: usage.notificationsSent || [],
      status: status
    };

  } catch (error) {
    console.error('❌ Error getting usage stats:', error);
    throw error;
  }
}

/**
 * Determine if a widget should be blocked
 *
 * @param {Object} organization - Organization object (camelCase or snake_case)
 * @returns {Object} - { blocked: boolean, reason: string }
 */
export function shouldBlockWidget(organization) {
  if (!organization) {
    return { blocked: true, reason: 'organization_not_found' };
  }

  const plan = organization.plan || 'free';
  const usage = organization.usage?.conversations;
  const trialEndsAt = organization.trialEndsAt ?? organization.trial_ends_at;

  // No usage tracking yet - allow
  if (!usage) {
    return { blocked: false };
  }

  // Check if quota needs reset
  const monthStart = getMonthStart();
  if (new Date(usage.lastReset) < monthStart) {
    return { blocked: false }; // Will be reset on next conversation
  }

  // For FREE tier: block when quota exceeded OR trial expired
  if (plan === 'free') {
    if (usage.current >= usage.limit) {
      return {
        blocked: true,
        reason: 'quota_exceeded',
        message: 'Månedlig kvote nået'
      };
    }

    if (trialEndsAt && new Date() > new Date(trialEndsAt)) {
      return {
        blocked: true,
        reason: 'trial_expired',
        message: 'Gratis prøveperiode udløbet'
      };
    }
  }

  // For PAID tiers: never block
  return { blocked: false };
}

/**
 * Reset monthly quota (called automatically or manually)
 *
 * @param {string} organizationId - Organization ID (uuid)
 * @returns {Promise<Object>} - Updated usage object
 */
export async function resetMonthlyQuota(organizationId) {
  try {
    const monthStart = getMonthStart();
    const organization = await fetchOrg(organizationId);
    if (!organization) throw new Error('Organization not found');

    const usage = organization.usage || {};
    const conv = usage.conversations || {};
    const newUsage = {
      ...usage,
      conversations: {
        ...conv,
        current: 0,
        overage: 0,
        lastReset: monthStart.toISOString(),
        notificationsSent: []
      }
    };

    const { data, error } = await admin
      .from('organizations')
      .update({ usage: newUsage })
      .eq('id', organizationId)
      .select('usage')
      .single();
    if (error) throw error;

    console.log(`🔄 Monthly quota reset for organization ${organizationId}`);

    return data?.usage?.conversations;

  } catch (error) {
    console.error('❌ Error resetting monthly quota:', error);
    throw error;
  }
}

/**
 * Manual quota reset by platform admin
 *
 * @param {string} organizationId - Organization ID (uuid)
 * @param {string} resetBy - Admin user ID who performed the reset (uuid)
 * @returns {Promise<Object>} - Updated usage object
 */
export async function manualResetQuota(organizationId, resetBy) {
  try {
    const organization = await fetchOrg(organizationId);

    if (!organization) {
      throw new Error('Organization not found');
    }

    const previousCount = organization.usage?.conversations?.current || 0;
    const usage = organization.usage || {};
    const conv = usage.conversations || {};
    const newUsage = {
      ...usage,
      conversations: {
        ...conv,
        current: 0,
        overage: 0,
        notificationsSent: [],
        lastReset: new Date().toISOString()
      }
    };

    const { data, error } = await admin
      .from('organizations')
      .update({ usage: newUsage })
      .eq('id', organizationId)
      .select('usage')
      .single();
    if (error) throw error;

    // Log to audit log (optional)
    try {
      await admin.from('audit_log').insert({
        action: 'quota_reset',
        organization_id: organizationId,
        performed_by: resetBy,
        metadata: {
          organizationName: organization.name,
          previousCount: previousCount,
          newCount: 0
        }
      });
    } catch (auditError) {
      console.log('ℹ️  Audit log not available:', auditError.message);
    }

    console.log(`🔄 Manual quota reset for ${organization.name} by admin ${resetBy}`);

    return data?.usage?.conversations;

  } catch (error) {
    console.error('❌ Error with manual quota reset:', error);
    throw error;
  }
}

/**
 * Check if notifications should be sent and send them
 *
 * @param {string} organizationId - Organization ID (uuid)
 * @param {number} usagePercentage - Current usage percentage
 * @param {number} current - Current conversation count
 * @param {number} limit - Conversation limit
 */
async function checkAndSendNotifications(organizationId, usagePercentage, current, limit) {
  try {
    const organization = await fetchOrg(organizationId);
    if (!organization) return;

    const notificationsSent = organization.usage?.conversations?.notificationsSent || [];
    const plan = organization.plan || 'free';

    // Determine which threshold was crossed
    let threshold = null;
    if (usagePercentage >= 110 && !notificationsSent.includes('110%')) {
      threshold = '110%';
    } else if (usagePercentage >= 100 && !notificationsSent.includes('100%')) {
      threshold = '100%';
    } else if (usagePercentage >= 80 && !notificationsSent.includes('80%')) {
      threshold = '80%';
    }

    if (!threshold) return; // No new threshold crossed

    // Get admin/owner emails via the team_members → users relationship.
    // team_members has two FKs to users (user_id, invited_by) so the embed
    // must name the constraint explicitly to disambiguate.
    const { data: members } = await admin
      .from('team_members')
      .select('users!team_members_user_id_fkey(email)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);

    const adminEmails = (members || [])
      .map((m) => m.users?.email)
      .filter(Boolean);

    // Owner email (organization.owner_id)
    let ownerEmail = null;
    if (organization.owner_id) {
      const { data: owner } = await admin
        .from('users')
        .select('email')
        .eq('id', organization.owner_id)
        .maybeSingle();
      ownerEmail = owner?.email || null;
    }

    // Send notification email
    await sendQuotaNotificationEmail({
      organizationName: organization.name,
      ownerEmail: ownerEmail,
      billingEmail: organization.billing_email,
      adminEmails: adminEmails,
      usagePercentage: Math.round(usagePercentage),
      current: current,
      limit: limit,
      plan: plan
    });

    // Mark notification as sent (append threshold to notificationsSent)
    const usage = organization.usage || {};
    const conv = usage.conversations || {};
    const newUsage = {
      ...usage,
      conversations: {
        ...conv,
        notificationsSent: [...notificationsSent, threshold]
      }
    };
    await admin.from('organizations')
      .update({ usage: newUsage })
      .eq('id', organizationId);

    console.log(`📧 Sent ${threshold} quota notification for ${organization.name}`);

  } catch (error) {
    console.error('❌ Error checking/sending notifications:', error);
    // Don't throw - notifications are not critical
  }
}
