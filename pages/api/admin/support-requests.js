import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { fromRows } from '../../../lib/supabase/transform';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const session = await getSessionContext(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Get user's organization
      const { data: user } = await admin
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's organization memberships
      const { data: memberships } = await admin
        .from('team_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const allOrgIds = (memberships || []).map(m => m.organization_id);

      // Use current organization if available, otherwise use all memberships
      let organizationIds;
      if (session.user.currentOrganizationId) {
        // Check if user has access to current organization
        const hasAccess = allOrgIds.some(
          id => id === session.user.currentOrganizationId
        );

        if (hasAccess) {
          organizationIds = [session.user.currentOrganizationId];
        } else {
          // Fallback to all memberships if current org access denied
          organizationIds = allOrgIds;
        }
      } else {
        // Fallback to all memberships if no current organization
        organizationIds = allOrgIds;
      }

      if (organizationIds.length === 0) {
        return res.status(403).json({ error: 'No organization access' });
      }

      // Get support requests for user's organizations
      const { data: requestRows, error: reqErr } = await admin
        .from('support_requests')
        .select('*')
        .in('organization_id', organizationIds)
        .order('submitted_at', { ascending: false })
        .limit(100);
      if (reqErr) throw reqErr;

      const requests = fromRows(requestRows);

      // Get widget and organization information for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const { data: widget } = request.widgetId
            ? await admin
                .from('widgets')
                .select('id, name, description')
                .eq('id', request.widgetId)
                .maybeSingle()
            : { data: null };

          const { data: conversation } = request.conversationId
            ? await admin
                .from('conversations')
                .select('id, messages, created_at, updated_at')
                .eq('id', request.conversationId)
                .maybeSingle()
            : { data: null };

          const { data: organization } = request.organizationId
            ? await admin
                .from('organizations')
                .select('id, name, slug')
                .eq('id', request.organizationId)
                .maybeSingle()
            : { data: null };

          return {
            ...request,
            widget: widget ? {
              _id: widget.id,
              name: widget.name,
              description: widget.description
            } : null,
            organization: organization ? {
              _id: organization.id,
              name: organization.name,
              slug: organization.slug
            } : null,
            conversation: conversation ? {
              _id: conversation.id,
              messageCount: conversation.messages?.length || 0,
              messages: conversation.messages || [],
              createdAt: conversation.created_at,
              updatedAt: conversation.updated_at
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

      if (!UUID_RE.test(requestId)) {
        return res.status(404).json({ error: 'Support request not found or access denied' });
      }

      // Get user's organization
      const { data: user } = await admin
        .from('users')
        .select('id, email')
        .eq('email', session.user.email)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's organization memberships
      const { data: memberships } = await admin
        .from('team_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const organizationIds = (memberships || []).map(m => m.organization_id);

      // Verify user has access to this support request
      const { data: request } = await admin
        .from('support_requests')
        .select('*')
        .eq('id', requestId)
        .in('organization_id', organizationIds)
        .maybeSingle();

      if (!request) {
        return res.status(404).json({ error: 'Support request not found or access denied' });
      }

      // Update request status
      const updateData = {
        status
      };

      if (notes) {
        updateData.admin_notes = notes;
      }

      if (status === 'completed' || status === 'rejected') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
      }

      const { error: updErr } = await admin
        .from('support_requests')
        .update(updateData)
        .eq('id', requestId);
      if (updErr) throw updErr;

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
