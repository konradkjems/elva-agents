import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const client = await clientPromise;
      const db = client.db('elva-agents');
      
      // Get user's organization
      const user = await db.collection('users').findOne({ 
        email: session.user.email 
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's organization memberships
      const memberships = await db.collection('team_members').find({
        userId: user._id,
        status: 'active'
      }).toArray();

      const organizationIds = memberships.map(m => m.organizationId);

      if (organizationIds.length === 0) {
        return res.status(403).json({ error: 'No organization access' });
      }

      // Get manual reviews for user's organizations
      const reviews = await db.collection('manual_reviews')
        .find({
          organizationId: { $in: organizationIds }
        })
        .sort({ submittedAt: -1 })
        .limit(100)
        .toArray();

      // Get widget information for each review
      const reviewsWithWidgets = await Promise.all(
        reviews.map(async (review) => {
          const widget = await db.collection('widgets').findOne({
            _id: review.widgetId
          });
          
          const conversation = await db.collection('conversations').findOne({
            _id: review.conversationId
          });

          return {
            ...review,
            widget: widget ? {
              _id: widget._id,
              name: widget.name,
              description: widget.description
            } : null,
            conversation: conversation ? {
              _id: conversation._id,
              messageCount: conversation.messages?.length || 0,
              createdAt: conversation.createdAt
            } : null
          };
        })
      );

      res.status(200).json({
        success: true,
        reviews: reviewsWithWidgets
      });

    } catch (error) {
      console.error('❌ Error fetching manual reviews:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { reviewId, status, notes } = req.body;

      if (!reviewId || !status) {
        return res.status(400).json({ 
          error: 'Missing required fields: reviewId and status' 
        });
      }

      const validStatuses = ['pending', 'in_review', 'completed', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be one of: pending, in_review, completed, rejected' 
        });
      }

      const client = await clientPromise;
      const db = client.db('elva-agents');
      
      // Get user's organization
      const user = await db.collection('users').findOne({ 
        email: session.user.email 
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's organization memberships
      const memberships = await db.collection('team_members').find({
        userId: user._id,
        status: 'active'
      }).toArray();

      const organizationIds = memberships.map(m => m.organizationId);

      // Verify user has access to this review
      const review = await db.collection('manual_reviews').findOne({
        _id: new ObjectId(reviewId),
        organizationId: { $in: organizationIds }
      });

      if (!review) {
        return res.status(404).json({ error: 'Review not found or access denied' });
      }

      // Update review status
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (notes) {
        updateData.adminNotes = notes;
      }

      if (status === 'completed' || status === 'rejected') {
        updateData.completedAt = new Date();
        updateData.completedBy = user._id;
      }

      const result = await db.collection('manual_reviews').updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }

      console.log('✅ Manual review status updated:', {
        reviewId,
        status,
        updatedBy: user.email
      });

      res.status(200).json({
        success: true,
        message: 'Review status updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating manual review:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
