import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { sendManualReviewEmail } from '../../../lib/email';

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
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Verify widget exists
    const widget = await db.collection('widgets').findOne({ 
      _id: new ObjectId(widgetId) 
    });

    if (!widget) {
      return res.status(404).json({ 
        error: 'Widget not found' 
      });
    }

    // Verify conversation exists
    const conversation = await db.collection('conversations').findOne({ 
      _id: new ObjectId(conversationId) 
    });

    if (!conversation) {
      return res.status(404).json({ 
        error: 'Conversation not found' 
      });
    }

    // Create manual review request
    const manualReview = {
      _id: new ObjectId(),
      widgetId: new ObjectId(widgetId),
      organizationId: new ObjectId(widget.organizationId),
      conversationId: new ObjectId(conversationId),
      contactInfo: {
        name: name ? name.trim() : null,
        email: email.toLowerCase().trim()
      },
      message: message ? message.trim() : null,
      status: 'pending', // pending, in_review, completed, rejected
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert manual review request
    const result = await db.collection('manual_reviews').insertOne(manualReview);

    console.log('✅ Manual review request submitted:', {
      reviewId: result.insertedId,
      widgetId,
      conversationId,
      contactName: name,
      contactEmail: email
    });

    // Get organization details for email
    const organization = await db.collection('organizations').findOne({
      _id: widget.organizationId
    });

    // Send email notification to support
    try {
      const supportEmail = organization?.settings?.supportEmail || organization?.settings?.manualReviewEmail;
      
      if (supportEmail) {
        await sendManualReviewEmail({
          supportEmail,
          contactName: name,
          contactEmail: email,
          message: message,
          widgetName: widget.name,
          organizationName: organization?.name || 'Unknown Organization',
          conversationId: conversationId,
          reviewId: result.insertedId.toString(),
          conversationMessages: conversation?.messages || []
        });
        console.log('✅ Manual review email sent to:', supportEmail);
      } else {
        console.log('⚠️ No support email configured for organization:', organization?.name);
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send manual review email:', emailError);
      // Continue anyway - manual review is saved even if email fails
    }

    res.status(201).json({
      success: true,
      reviewId: result.insertedId,
      message: 'Manual review request submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error submitting manual review:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
