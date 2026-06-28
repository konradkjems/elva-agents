import { admin } from '../../../lib/supabase/admin';
import { sendSupportRequestEmail } from '../../../lib/email';

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
    const { widgetId, conversationId, contactInfo, message } = req.body;

    // Validate required fields
    if (!widgetId || !conversationId || !contactInfo) {
      return res.status(400).json({
        error: 'Missing required fields: widgetId, conversationId, and contactInfo are required'
      });
    }

    // Validate contact info structure
    const { name, email } = contactInfo;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Verify widget exists (looked up by embed id, then uuid)
    let { data: widget } = await admin
      .from('widgets').select('id, organization_id, name')
      .eq('legacy_id', String(widgetId)).maybeSingle();
    if (!widget && UUID_RE.test(widgetId)) {
      ({ data: widget } = await admin
        .from('widgets').select('id, organization_id, name')
        .eq('id', widgetId).maybeSingle());
    }
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Verify conversation exists
    if (!UUID_RE.test(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const { data: conversation } = await admin
      .from('conversations').select('id, messages')
      .eq('id', conversationId).maybeSingle();
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create support request
    const { data: created, error: insErr } = await admin
      .from('support_requests')
      .insert({
        widget_id: widget.id,
        organization_id: widget.organization_id,
        conversation_id: conversationId,
        contact_info: {
          name: name ? name.trim() : null,
          email: email.toLowerCase().trim()
        },
        message: message ? message.trim() : null,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    const requestId = created.id;
    console.log('✅ Support request submitted:', {
      requestId,
      widgetId,
      conversationId,
      contactName: name,
      contactEmail: email
    });

    // Get organization details for email
    let organization = null;
    if (widget.organization_id) {
      ({ data: organization } = await admin
        .from('organizations').select('name, settings')
        .eq('id', widget.organization_id).maybeSingle());
    }

    // Send email notification to support
    try {
      const supportEmail = organization?.settings?.supportEmail || organization?.settings?.manualReviewEmail;

      if (supportEmail) {
        await sendSupportRequestEmail({
          supportEmail,
          contactName: name,
          contactEmail: email,
          message: message,
          widgetName: widget.name,
          organizationName: organization?.name || 'Unknown Organization',
          conversationId: conversationId,
          requestId: String(requestId),
          conversationMessages: conversation?.messages || []
        });
        console.log('✅ Support request email sent to:', supportEmail);
      } else {
        console.log('⚠️ No support email configured for organization:', organization?.name);
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send support request email:', emailError);
      // Continue anyway - support request is saved even if email fails
    }

    res.status(201).json({
      success: true,
      requestId: requestId,
      message: 'Support request submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error submitting support request:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
