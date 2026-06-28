/**
 * Organizations API
 *
 * GET /api/organizations - List user's organizations
 * POST /api/organizations - Create new organization
 */
import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { fromRow, fromRows } from '../../../lib/supabase/transform';

export default async function handler(req, res) {
  try {
    // Check authentication
    const session = await getSessionContext(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    // ========================================
    // GET - List user's organizations
    // ========================================
    if (req.method === 'GET') {
      // Get all organizations where user is a member
      const { data: membershipRows, error: memErr } = await admin
        .from('team_members')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'invited']);
      if (memErr) throw memErr;

      const memberships = fromRows(membershipRows);
      const orgIds = memberships.map(m => m.organizationId);

      // Get organization details
      let organizations = [];
      if (orgIds.length > 0) {
        const { data: orgRows, error: orgErr } = await admin
          .from('organizations')
          .select('*')
          .in('id', orgIds)
          .is('deleted_at', null);
        if (orgErr) throw orgErr;
        organizations = fromRows(orgRows);
      }

      // Combine with membership data
      const orgsWithRole = organizations.map(org => {
        const membership = memberships.find(
          m => m.organizationId === org._id
        );
        return {
          ...org,
          role: membership.role,
          memberStatus: membership.status,
          joinedAt: membership.joinedAt
        };
      });

      // Sort by: current org first, then by name
      const currentOrgId = session.user.currentOrganizationId;
      orgsWithRole.sort((a, b) => {
        if (a._id === currentOrgId) return -1;
        if (b._id === currentOrgId) return 1;
        return a.name.localeCompare(b.name);
      });

      return res.status(200).json({
        organizations: orgsWithRole,
        currentOrganizationId: currentOrgId
      });
    }

    // ========================================
    // POST - Create new organization
    // ========================================
    if (req.method === 'POST') {
      const { name, slug, logo, primaryColor, plan } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      // Check if user has admin/owner role in their current organization
      const currentOrgId = session.user.currentOrganizationId;
      if (currentOrgId) {
        const { data: userMembership } = await admin
          .from('team_members')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', currentOrgId)
          .eq('status', 'active')
          .maybeSingle();

        if (!userMembership || !['admin', 'owner'].includes(userMembership.role)) {
          return res.status(403).json({
            error: 'Only organization administrators and owners can create new organizations'
          });
        }
      }

      // Generate slug if not provided
      let orgSlug = slug || name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Ensure slug is unique
      let finalSlug = orgSlug;
      let counter = 1;
      // eslint-disable-next-line no-await-in-loop
      while (true) {
        const { data: slugExists } = await admin
          .from('organizations')
          .select('id')
          .eq('slug', finalSlug)
          .maybeSingle();
        if (!slugExists) break;
        finalSlug = `${orgSlug}-${counter}`;
        counter++;
      }

      // Create organization
      const selectedPlan = plan || 'free';

      // Helper function to get conversation limits
      const getConversationLimit = (planType) => {
        switch(planType) {
          case 'pro': return 750;
          case 'growth': return 300;
          case 'basic': return 100;
          case 'free': return 100;
          default: return 100;
        }
      };

      const nowIso = new Date().toISOString();

      const newOrg = {
        name: name.trim(),
        slug: finalSlug,
        owner_id: userId,
        plan: selectedPlan,
        limits: {
          maxWidgets: selectedPlan === 'pro' ? 50 : selectedPlan === 'growth' ? 25 : selectedPlan === 'basic' ? 10 : 10,
          maxTeamMembers: selectedPlan === 'pro' ? 30 : selectedPlan === 'growth' ? 15 : selectedPlan === 'basic' ? 5 : 5,
          maxConversations: selectedPlan === 'pro' ? 100000 : selectedPlan === 'growth' ? 50000 : selectedPlan === 'basic' ? 10000 : 10000,
          maxDemos: 0 // Regular users can't create demos
        },
        usage: {
          conversations: {
            current: 0,
            limit: getConversationLimit(selectedPlan),
            lastReset: nowIso,
            overage: 0,
            notificationsSent: []
          }
        },
        subscription_status: selectedPlan === 'free' ? 'trial' : 'active',
        settings: {
          allowDemoCreation: false,
          requireEmailVerification: false,
          allowGoogleAuth: true
        }
      };

      if (logo !== undefined) newOrg.logo = logo;
      if (primaryColor !== undefined) newOrg.primary_color = primaryColor;

      // Only set trial_ends_at if on free plan
      if (selectedPlan === 'free') {
        newOrg.trial_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      }

      const { data: orgResult, error: orgInsertErr } = await admin
        .from('organizations')
        .insert(newOrg)
        .select('id')
        .single();
      if (orgInsertErr) throw orgInsertErr;

      const newOrgId = orgResult.id;

      // Create team member entry (owner)
      const teamMember = {
        organization_id: newOrgId,
        user_id: userId,
        role: 'owner',
        permissions: {
          widgets: { create: true, read: true, update: true, delete: true },
          demos: { create: false, read: true, update: false, delete: false },
          team: { invite: true, manage: true, remove: true },
          settings: { view: true, edit: true }
        },
        status: 'active',
        joined_at: nowIso
      };

      const { error: tmErr } = await admin.from('team_members').insert(teamMember);
      if (tmErr) throw tmErr;

      // Set the newly created organization as current
      try {
        const { data: user } = await admin
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (user) {
          // Always switch to the newly created organization
          await admin
            .from('users')
            .update({ current_organization_id: newOrgId })
            .eq('id', userId);
        } else {
          console.warn(`User with ID ${userId} not found when creating organization`);
        }
      } catch (userUpdateError) {
        console.error('Error updating user current organization:', userUpdateError);
        // Continue anyway - organization is created successfully
      }

      // Get the created organization
      const { data: createdRow } = await admin
        .from('organizations')
        .select('*')
        .eq('id', newOrgId)
        .single();
      const createdOrg = fromRow(createdRow);

      return res.status(201).json({
        organization: {
          ...createdOrg,
          role: 'owner',
          memberStatus: 'active',
          joinedAt: teamMember.joined_at
        }
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Organizations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
