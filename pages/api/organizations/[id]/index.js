/**
 * Single Organization API
 *
 * GET /api/organizations/[id] - Get organization details
 * PUT /api/organizations/[id] - Update organization
 * DELETE /api/organizations/[id] - Delete organization (soft)
 */
import { admin } from '../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../lib/supabase/session';
import { fromRow, fromRows } from '../../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getConversationLimit(planType) {
  switch (planType) {
    case 'pro': return 750;
    case 'growth': return 300;
    case 'basic': return 100;
    case 'free': return 100;
    default: return 100;
  }
}

// Helper to check user's role in organization
async function getUserRole(userId, orgId) {
  const { data } = await admin.from('team_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  return data?.role || null;
}

export default async function handler(req, res) {
  try {
    // Check authentication
    const session = await getSessionContext(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { id: orgId } = req.query;

    if (!orgId || !UUID_RE.test(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Get organization (not soft-deleted)
    const { data: organizationRow } = await admin.from('organizations')
      .select('*')
      .eq('id', orgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!organizationRow) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const organization = fromRow(organizationRow);

    // Check permissions
    const userRole = await getUserRole(userId, orgId);
    const isAdmin = session.user.role === 'platform_admin';

    if (!userRole && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ========================================
    // GET - Get organization details
    // ========================================
    if (req.method === 'GET') {
      // Get team members (team_members → users; disambiguate the double FK)
      const { data: memberRows } = await admin.from('team_members')
        .select('id, role, status, joined_at, invited_at, created_at, users!team_members_user_id_fkey(id, name, email, image)')
        .eq('organization_id', orgId)
        .in('status', ['active', 'invited'])
        .order('created_at', { ascending: true });

      const members = (memberRows || []).map(m => ({
        _id: m.id,
        role: m.role,
        status: m.status,
        joinedAt: m.joined_at,
        invitedAt: m.invited_at,
        createdAt: m.created_at,
        user: m.users ? { _id: m.users.id, name: m.users.name, email: m.users.email, image: m.users.image } : null
      }));

      // Counts
      const { count: widgetCount } = await admin.from('widgets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).eq('is_demo_mode', false);
      const { count: conversationCount } = await admin.from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Pending invitations
      const { data: invRows } = await admin.from('invitations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());
      const invitations = fromRows(invRows);

      // Usage stats for quota tracking
      let usageStats = null;
      if (organization.usage?.conversations) {
        const { getUsageStats } = await import('../../../../lib/quota.js');
        try {
          usageStats = await getUsageStats(orgId);
        } catch (error) {
          console.error('Error getting usage stats:', error);
        }
      }

      return res.status(200).json({
        organization: {
          ...organization,
          role: userRole || 'platform_admin',
          stats: {
            members: members.length,
            widgets: widgetCount || 0,
            conversations: conversationCount || 0,
            pendingInvitations: invitations.length
          },
          usageStats: usageStats
        },
        members,
        invitations
      });
    }

    // ========================================
    // PUT - Update organization
    // ========================================
    if (req.method === 'PUT') {
      if (!isAdmin && !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { name, slug, logo, primaryColor, domain, plan, settings } = req.body;

      const updates = {};

      if (name !== undefined) updates.name = name.trim();
      if (slug !== undefined) updates.slug = slug.trim();
      if (logo !== undefined) updates.logo = logo;
      if (primaryColor !== undefined) updates.primary_color = primaryColor;
      if (domain !== undefined) updates.domain = domain;
      if (plan !== undefined) {
        updates.plan = plan;
        updates.limits = {
          maxWidgets: plan === 'pro' ? 50 : plan === 'growth' ? 25 : plan === 'basic' ? 10 : 10,
          maxTeamMembers: plan === 'pro' ? 30 : plan === 'growth' ? 15 : plan === 'basic' ? 5 : 5,
          maxConversations: plan === 'pro' ? 100000 : plan === 'growth' ? 50000 : plan === 'basic' ? 10000 : 10000,
          maxDemos: organization.limits?.maxDemos || 0
        };

        // Update conversation quota limit within the usage JSONB
        if (organization.usage?.conversations) {
          updates.usage = {
            ...organization.usage,
            conversations: {
              ...organization.usage.conversations,
              limit: getConversationLimit(plan)
            }
          };
        }

        if (plan === 'free' && organization.plan !== 'free') {
          updates.subscription_status = 'trial';
          updates.trial_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (plan !== 'free' && organization.plan === 'free') {
          updates.subscription_status = 'active';
          updates.trial_ends_at = null;
        }
      }
      if (settings !== undefined) {
        updates.settings = { ...organization.settings, ...settings };
      }

      const { data: updatedRow, error: updErr } = await admin.from('organizations')
        .update(updates).eq('id', orgId).select('*').single();
      if (updErr) throw updErr;

      return res.status(200).json({ organization: fromRow(updatedRow) });
    }

    // ========================================
    // DELETE - Soft delete organization
    // ========================================
    if (req.method === 'DELETE') {
      if (!isAdmin && userRole !== 'owner') {
        return res.status(403).json({ error: 'Only the owner can delete the organization' });
      }

      await admin.from('organizations')
        .update({ deleted_at: new Date().toISOString() }).eq('id', orgId);

      await admin.from('team_members')
        .update({ status: 'removed' }).eq('organization_id', orgId);

      await admin.from('invitations')
        .update({ status: 'cancelled' }).eq('organization_id', orgId).eq('status', 'pending');

      return res.status(200).json({ message: 'Organization deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Organization API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
