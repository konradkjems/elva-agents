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

      // Use current organization if available, otherwise use all memberships
      let organizationIds;
      if (session.user.currentOrganizationId) {
        // Check if user has access to current organization
        const hasAccess = memberships.some(m => 
          m.organizationId.toString() === session.user.currentOrganizationId
        );
        
        if (hasAccess) {
          organizationIds = [new ObjectId(session.user.currentOrganizationId)];
        } else {
          // Fallback to all memberships if current org access denied
          organizationIds = memberships.map(m => new ObjectId(m.organizationId));
        }
      } else {
        // Fallback to all memberships if no current organization
        organizationIds = memberships.map(m => new ObjectId(m.organizationId));
      }

      if (organizationIds.length === 0) {
        return res.status(403).json({ error: 'No organization access' });
      }

      // Get support requests for user's organizations
      const requests = await db.collection('support_requests')
        .find({
          organizationId: { $in: organizationIds }
        })
        .sort({ submittedAt: -1 })
        .limit(100)
        .toArray();

      // Get widget and organization information for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const widget = await db.collection('widgets').findOne({
            _id: request.widgetId
          });
          
          const conversation = await db.collection('conversations').findOne({
            _id: request.conversationId
          });

          const organization = await db.collection('organizations').findOne({
            _id: request.organizationId
          });

          return {
            ...request,
            widget: widget ? {
              _id: widget._id,
              name: widget.name,
              description: widget.description
            } : null,
            organization: organization ? {
              _id: organization._id,
              name: organization.name,
              slug: organization.slug
            } : null,
            conversation: conversation ? {
              _id: conversation._id,
              messageCount: conversation.messages?.length || 0,
              messages: conversation.messages || [],
              createdAt: conversation.createdAt,
              updatedAt: conversation.updatedAt
            } : null
          };
        })
      );

      res.status(200).json({
        success: true,
        reviews: requestsWithDetails
      });

    } catch (error) {
      console.error('❌ Error fetching support requests:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { requestId, status, notes } = req.body;

      if (!requestId || !status) {
        return res.status(400).json({ 
          error: 'Missing required fields: requestId and status' 
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

      // Verify user has access to this support request
      const request = await db.collection('support_requests').findOne({
        _id: new ObjectId(requestId),
        organizationId: { $in: organizationIds }
      });

      if (!request) {
        return res.status(404).json({ error: 'Support request not found or access denied' });
      }

      // Update request status
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

      const result = await db.collection('support_requests').updateOne(
        { _id: new ObjectId(requestId) },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'Support request not found' });
      }

      console.log('✅ Support request status updated:', {
        requestId,
        status,
        updatedBy: user.email
      });

      res.status(200).json({
        success: true,
        message: 'Support request status updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating support request:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
