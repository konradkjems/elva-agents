/**
 * Vercel Cron Job Endpoint — RAG ingestion safety-net.
 *
 * Runs one ingestion pass across all widgets: advances website crawls, chunks
 * pending text/file sources, embeds chunks in batches, and marks documents ready.
 * The pass is time-budgeted and resumable, so repeated cron runs converge.
 *
 * On-demand triggers (source creation + the editor's "indeksér nu" button) are the
 * primary driver; this cron just resumes anything left in progress.
 *
 * Scheduled via vercel.json (sub-daily frequency requires Vercel Pro; on Hobby the
 * on-demand triggers still drive ingestion).
 */

import { processKnowledgeQueue } from '../../../lib/rag/worker';

export default async function handler(req, res) {
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
    console.log('🤖 Cron job started: process-knowledge');
    const summary = await processKnowledgeQueue({});
    console.log('✅ process-knowledge completed', summary);
    return res.status(200).json({
      message: 'Knowledge queue processed',
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error('❌ process-knowledge error:', error);
    return res.status(500).json({ error: 'Failed to process knowledge queue', details: error.message });
  }
}
