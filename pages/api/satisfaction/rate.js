import { admin } from '../../../lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-elva-consent-analytics, x-elva-consent-functional');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, widgetId, rating, feedback } = req.body;

    if (!conversationId || !widgetId || !rating) {
      return res.status(400).json({
        error: 'Missing required fields: conversationId, widgetId, rating'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    if (!UUID_RE.test(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update conversation with rating
    const { data: updated, error: updErr } = await admin
      .from('conversations')
      .update({
        satisfaction: {
          rating: rating,
          feedback: feedback || '',
          submittedAt: new Date().toISOString(),
          context: 'user_triggered'
        }
      })
      .eq('id', conversationId)
      .select('id')
      .maybeSingle();
    if (updErr) throw updErr;

    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update satisfaction analytics (resolve widget uuid from embed id first)
    await updateSatisfactionAnalytics(widgetId, rating);

    console.log('✅ Satisfaction rating submitted:', {
      conversationId,
      widgetId,
      rating,
      hasFeedback: !!feedback
    });

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    console.error('Rating submission error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      conversationId: req.body.conversationId,
      widgetId: req.body.widgetId,
      rating: req.body.rating
    });
    res.status(500).json({
      error: 'Failed to submit rating',
      details: error.message
    });
  }
}

async function resolveWidgetUuid(widgetId) {
  let { data } = await admin.from('widgets').select('id').eq('legacy_id', String(widgetId)).maybeSingle();
  if (!data && UUID_RE.test(widgetId)) {
    ({ data } = await admin.from('widgets').select('id').eq('id', widgetId).maybeSingle());
  }
  return data?.id || null;
}

async function updateSatisfactionAnalytics(widgetId, rating) {
  try {
    const widgetUuid = await resolveWidgetUuid(widgetId);
    if (!widgetUuid) {
      console.warn('Satisfaction analytics: widget not found for', widgetId);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split('T')[0];

    const { error } = await admin.rpc('record_satisfaction_rating', {
      p_widget_id: widgetUuid,
      p_date: dateKey,
      p_rating: rating
    });
    if (error) console.error('Satisfaction RPC error:', error.message);
  } catch (error) {
    console.error('Failed to update satisfaction analytics:', error);
    // Don't throw error - analytics failure shouldn't break rating submission
  }
}
