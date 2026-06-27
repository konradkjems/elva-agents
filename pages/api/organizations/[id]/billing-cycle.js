import { admin } from '../../../../lib/supabase/admin';
import { fromRow } from '../../../../lib/supabase/transform';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * Update Organization Billing Cycle
 *
 * Platform Admin or Organization Admin/Owner can update the billing cycle start date
 * This will reset the lastReset date and calculate the next reset date
 */
export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: organizationId } = req.query;
    const { billingCycleStartDate } = req.body;

    if (!billingCycleStartDate) {
      return res.status(400).json({
        error: 'billingCycleStartDate is required (ISO string)'
      });
    }

    // Parse and validate date
    const newStartDate = new Date(billingCycleStartDate);
    if (isNaN(newStartDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T00:00:00.000Z)'
      });
    }

    const userId = session.user.id;
    const orgId = organizationId;

    // Get organization
    const { data: orgRow } = await admin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (!orgRow) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = fromRow(orgRow);

    // Check permissions: Platform Admin OR Organization Admin/Owner
    const isPlatformAdmin = session.user.role === 'platform_admin';

    if (!isPlatformAdmin) {
      // Check if user is admin/owner of this organization
      const { data: membership } = await admin
        .from('team_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership || !['admin', 'owner'].includes(membership.role)) {
        return res.status(403).json({
          error: 'Only platform administrators or organization admin/owner can update billing cycle'
        });
      }
    }

    // Organization must have usage tracking initialized to set a billing cycle
    if (!organization.usage?.conversations) {
      return res.status(400).json({
        error: 'Failed to update billing cycle. Organization may not have usage tracking initialized.'
      });
    }

    // Calculate next reset date (1 month from start date)
    const nextResetDate = new Date(newStartDate);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    // Update organization's billing cycle (mutate the JSONB usage object)
    const usage = organization.usage;
    const newUsage = {
      ...usage,
      conversations: {
        ...usage.conversations,
        lastReset: newStartDate.toISOString(),
        nextReset: nextResetDate.toISOString()
      }
    };

    const { data: updatedRow, error: updateErr } = await admin
      .from('organizations')
      .update({ usage: newUsage })
      .eq('id', orgId)
      .select('usage, updated_at')
      .single();
    if (updateErr) throw updateErr;

    console.log(`✅ Billing cycle updated for organization ${organizationId}`);
    console.log(`   New start: ${newStartDate.toISOString()}`);
    console.log(`   Next reset: ${nextResetDate.toISOString()}`);
    console.log(`   Updated by: ${session.user.email}`);

    return res.status(200).json({
      message: 'Billing cycle updated successfully',
      billingCycle: {
        lastReset: updatedRow.usage.conversations.lastReset,
        nextReset: updatedRow.usage.conversations.nextReset,
        updatedAt: updatedRow.updated_at,
        updatedBy: session.user.email
      }
    });

  } catch (error) {
    console.error('Error updating billing cycle:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
