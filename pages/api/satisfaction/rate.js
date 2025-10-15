import clientPromise from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';

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

    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    // Update conversation with rating
    const result = await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          satisfaction: {
            rating: rating,
            feedback: feedback || '',
            submittedAt: new Date(),
            context: 'user_triggered'
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Update satisfaction analytics
    await updateSatisfactionAnalytics(db, widgetId, rating);

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

async function updateSatisfactionAnalytics(db, widgetId, rating) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get or create today's analytics record
    const analyticsRecord = await db.collection('satisfaction_analytics').findOne({
      widgetId: new ObjectId(widgetId),
      date: today
    });

    if (analyticsRecord) {
      // Update existing record
      const updateData = {
        $inc: {
          'ratings.total': 1,
          [`ratings.distribution.${rating}`]: 1
        }
      };

      // Recalculate average
      const newTotal = analyticsRecord.ratings.total + 1;
      const newSum = (analyticsRecord.ratings.average * analyticsRecord.ratings.total) + rating;
      updateData.$set = {
        'ratings.average': newSum / newTotal
      };

      await db.collection('satisfaction_analytics').updateOne(
        { _id: analyticsRecord._id },
        updateData
      );
    } else {
      // Create new record
      await db.collection('satisfaction_analytics').insertOne({
        widgetId: new ObjectId(widgetId),
        date: today,
        ratings: {
          total: 1,
          average: rating,
          distribution: {
            1: rating === 1 ? 1 : 0,
            2: rating === 2 ? 1 : 0,
            3: rating === 3 ? 1 : 0,
            4: rating === 4 ? 1 : 0,
            5: rating === 5 ? 1 : 0
          }
        },
        trends: {
          daily: [],
          weekly: [],
          monthly: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Failed to update satisfaction analytics:', error);
    // Don't throw error - analytics failure shouldn't break rating submission
  }
}
