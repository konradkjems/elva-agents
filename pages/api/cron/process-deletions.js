/**
 * Vercel Cron Job Endpoint
 * Processes account deletions after grace period
 * 
 * Scheduled to run daily at 2 AM via vercel.json
 */

import { processAccountDeletions } from '../../../scripts/process-account-deletions';

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
    console.log('🤖 Cron job started: process-deletions');
    
    // Run the deletion process
    const results = await processAccountDeletions();
    
    if (results.error) {
      return res.status(500).json({ 
        error: 'Deletion processing failed',
        details: results.error
      });
    }

    console.log('✅ Cron job completed successfully');
    
    return res.status(200).json({
      message: 'Deletions processed',
      timestamp: new Date().toISOString(),
      results: results
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({ 
      error: 'Failed to process deletions',
      details: error.message
    });
  }
}

