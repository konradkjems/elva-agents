/**
 * Vercel Cron Job Endpoint
 * Applies data retention policies per widget
 * 
 * Scheduled to run weekly via vercel.json
 * GDPR Article 5(1)(e) - Storage Limitation
 */

import { applyDataRetentionPolicies } from '../../../scripts/apply-data-retention';

export default async function handler(req, res) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured');
    return res.status(500).json({ error: 'Cron job not configured' });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron job attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🤖 Cron job started: apply-retention');
    
    // Run the retention policy
    const results = await applyDataRetentionPolicies();
    
    if (!results.success) {
      return res.status(500).json({ 
        error: 'Retention policy failed',
        details: results.error
      });
    }

    console.log('✅ Cron job completed successfully');
    
    return res.status(200).json({
      message: 'Data retention policies applied',
      timestamp: new Date().toISOString(),
      results: results
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({ 
      error: 'Failed to apply retention policies',
      details: error.message
    });
  }
}

