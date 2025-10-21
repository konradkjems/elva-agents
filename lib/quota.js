/**
 * Quota Management System
 * 
 * Handles conversation quota tracking, checking, and notifications
 * for all subscription plans.
 */

import clientPromise from './mongodb.js';
import { ObjectId } from 'mongodb';
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

/**
 * Check if organization can create a new conversation
 * 
 * @param {ObjectId} organizationId - Organization ID to check
 * @returns {Promise<Object>} - { allowed: boolean, blocked: boolean, reason: string }
 */
export async function checkQuota(organizationId) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(organizationId)
    });

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
      
      if (organization.trialEndsAt && new Date() > new Date(organization.trialEndsAt)) {
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
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const monthStart = getMonthStart();
    const limit = getConversationLimit(plan);

    await db.collection('organizations').updateOne(
      { _id: new ObjectId(organizationId) },
      {
        $set: {
          'usage.conversations': {
            current: 0,
            limit: limit,
            lastReset: monthStart,
            overage: 0,
            notificationsSent: []
          },
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Initialized usage tracking for organization ${organizationId}`);
  } catch (error) {
    console.error('❌ Error initializing usage:', error);
    throw error;
  }
}

/**
 * Increment conversation count for an organization
 * 
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Object>} - Updated usage statistics
 */
export async function incrementConversationCount(organizationId) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(organizationId)
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Initialize if needed
    if (!organization.usage?.conversations) {
      await initializeUsage(organizationId, organization.plan);
      organization.usage = {
        conversations: {
          current: 0,
          limit: getConversationLimit(organization.plan || 'free'),
          lastReset: getMonthStart(),
          overage: 0,
          notificationsSent: []
        }
      };
    }

    const usage = organization.usage.conversations;
    const newCurrent = usage.current + 1;
    const newOverage = Math.max(0, newCurrent - usage.limit);

    // Update the count
    const result = await db.collection('organizations').findOneAndUpdate(
      { _id: new ObjectId(organizationId) },
      {
        $set: {
          'usage.conversations.current': newCurrent,
          'usage.conversations.overage': newOverage,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    console.log(`📊 Incremented conversation count for ${organization.name}: ${newCurrent}/${usage.limit}`);

    // Check if we need to send notifications
    const usagePercentage = (newCurrent / usage.limit) * 100;
    await checkAndSendNotifications(organizationId, usagePercentage, newCurrent, usage.limit);

    return {
      current: newCurrent,
      limit: usage.limit,
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
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Object>} - Usage statistics
 */
export async function getUsageStats(organizationId) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(organizationId)
    });

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
 * @param {Object} organization - Organization object
 * @returns {Object} - { blocked: boolean, reason: string }
 */
export function shouldBlockWidget(organization) {
  if (!organization) {
    return { blocked: true, reason: 'organization_not_found' };
  }

  const plan = organization.plan || 'free';
  const usage = organization.usage?.conversations;

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
    
    if (organization.trialEndsAt && new Date() > new Date(organization.trialEndsAt)) {
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
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Object>} - Updated usage object
 */
export async function resetMonthlyQuota(organizationId) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const monthStart = getMonthStart();

    const result = await db.collection('organizations').findOneAndUpdate(
      { _id: new ObjectId(organizationId) },
      {
        $set: {
          'usage.conversations.current': 0,
          'usage.conversations.overage': 0,
          'usage.conversations.lastReset': monthStart,
          'usage.conversations.notificationsSent': [],
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    console.log(`🔄 Monthly quota reset for organization ${organizationId}`);

    return result.value?.usage?.conversations;

  } catch (error) {
    console.error('❌ Error resetting monthly quota:', error);
    throw error;
  }
}

/**
 * Manual quota reset by platform admin
 * 
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} resetBy - Admin user ID who performed the reset
 * @returns {Promise<Object>} - Updated usage object
 */
export async function manualResetQuota(organizationId, resetBy) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(organizationId)
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const previousCount = organization.usage?.conversations?.current || 0;

    const result = await db.collection('organizations').findOneAndUpdate(
      { _id: new ObjectId(organizationId) },
      {
        $set: {
          'usage.conversations.current': 0,
          'usage.conversations.overage': 0,
          'usage.conversations.notificationsSent': [],
          'usage.conversations.lastReset': new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    // Log to audit log if collection exists
    try {
      await db.collection('audit_log').insertOne({
        action: 'quota_reset',
        organizationId: new ObjectId(organizationId),
        organizationName: organization.name,
        performedBy: new ObjectId(resetBy),
        timestamp: new Date(),
        details: { 
          previousCount: previousCount, 
          newCount: 0 
        }
      });
    } catch (auditError) {
      // Audit log is optional, don't fail if collection doesn't exist
      console.log('ℹ️  Audit log not available:', auditError.message);
    }

    console.log(`🔄 Manual quota reset for ${organization.name} by admin ${resetBy}`);

    return result.value?.usage?.conversations;

  } catch (error) {
    console.error('❌ Error with manual quota reset:', error);
    throw error;
  }
}

/**
 * Check if notifications should be sent and send them
 * 
 * @param {ObjectId} organizationId - Organization ID
 * @param {number} usagePercentage - Current usage percentage
 * @param {number} current - Current conversation count
 * @param {number} limit - Conversation limit
 */
async function checkAndSendNotifications(organizationId, usagePercentage, current, limit) {
  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const organization = await db.collection('organizations').findOne({
      _id: new ObjectId(organizationId)
    });

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

    // Get admin emails
    const teamMembers = await db.collection('team_members').aggregate([
      {
        $match: {
          organizationId: new ObjectId(organizationId),
          status: 'active',
          role: { $in: ['owner', 'admin'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      }
    ]).toArray();

    const adminEmails = teamMembers.map(m => m.user.email).filter(Boolean);

    // Send notification email
    await sendQuotaNotificationEmail({
      organizationName: organization.name,
      ownerEmail: organization.ownerId ? (await db.collection('users').findOne({ _id: organization.ownerId }))?.email : null,
      billingEmail: organization.billingEmail,
      adminEmails: adminEmails,
      usagePercentage: Math.round(usagePercentage),
      current: current,
      limit: limit,
      plan: plan
    });

    // Mark notification as sent
    await db.collection('organizations').updateOne(
      { _id: new ObjectId(organizationId) },
      {
        $push: { 'usage.conversations.notificationsSent': threshold }
      }
    );

    console.log(`📧 Sent ${threshold} quota notification for ${organization.name}`);

  } catch (error) {
    console.error('❌ Error checking/sending notifications:', error);
    // Don't throw - notifications are not critical
  }
}

