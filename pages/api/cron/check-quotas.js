/**
 * Cron Job: Check Conversation Quotas and Send Notifications
 * 
 * This endpoint should be triggered daily (or as needed) to check
 * all organization quotas and send notifications at threshold levels.
 * 
 * Vercel Cron: Configure in vercel.json
 * Manual trigger: GET /api/cron/check-quotas?secret=YOUR_CRON_SECRET
 */

import clientPromise from '../../../lib/mongodb.js';
import { getUsageStats } from '../../../lib/quota.js';
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
    
    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Get all organizations with usage tracking
    const organizations = await db.collection('organizations').find({
      'usage.conversations': { $exists: true }
    }).toArray();

    console.log(`📊 Found ${organizations.length} organizations to check`);

    let notificationsSent = 0;
    let errors = 0;

    for (const org of organizations) {
      try {
        const usage = org.usage?.conversations;
        if (!usage) continue;

        const usagePercentage = (usage.current / usage.limit) * 100;
        const notificationsSent = usage.notificationsSent || [];

        // Determine which thresholds need notifications
        const thresholdsToNotify = [];
        
        if (usagePercentage >= 110 && !notificationsSent.includes('110%')) {
          thresholdsToNotify.push('110%');
        } else if (usagePercentage >= 100 && !notificationsSent.includes('100%')) {
          thresholdsToNotify.push('100%');
        } else if (usagePercentage >= 80 && !notificationsSent.includes('80%')) {
          thresholdsToNotify.push('80%');
        }

        if (thresholdsToNotify.length === 0) continue;

        // Get admin emails
        const teamMembers = await db.collection('team_members').aggregate([
          {
            $match: {
              organizationId: org._id,
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

        // Get owner email
        let ownerEmail = null;
        if (org.ownerId) {
          const owner = await db.collection('users').findOne({ _id: org.ownerId });
          ownerEmail = owner?.email;
        }

        // Send notification for the highest threshold
        const threshold = thresholdsToNotify[0];
        
        await sendQuotaNotificationEmail({
          organizationName: org.name,
          ownerEmail: ownerEmail,
          billingEmail: org.billingEmail,
          adminEmails: adminEmails,
          usagePercentage: Math.round(usagePercentage),
          current: usage.current,
          limit: usage.limit,
          plan: org.plan || 'free'
        });

        // Mark notification as sent
        await db.collection('organizations').updateOne(
          { _id: org._id },
          {
            $push: { 'usage.conversations.notificationsSent': threshold }
          }
        );

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

