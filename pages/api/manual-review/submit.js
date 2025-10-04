import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { widgetId, conversationId, contactInfo, message } = req.body;

    // Validate required fields
    if (!widgetId || !conversationId || !contactInfo || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: widgetId, conversationId, contactInfo, and message are required' 
      });
    }

    // Validate contact info structure
    const { name, email, phone } = contactInfo;
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        error: 'Contact info must include name, email, and phone' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone format' 
      });
    }

    const { client, db } = await connectToDatabase();

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
      organizationId: widget.organizationId,
      conversationId: new ObjectId(conversationId),
      contactInfo: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim()
      },
      message: message.trim(),
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
