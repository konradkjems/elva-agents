import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
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

    const client = await clientPromise;
    const db = client.db('elva-agents');
    
    const userId = new ObjectId(session.user.id);
    const orgId = new ObjectId(organizationId);

    // Get organization
    const organization = await db.collection('organizations').findOne({ _id: orgId });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check permissions: Platform Admin OR Organization Admin/Owner
    const isPlatformAdmin = session.user.role === 'platform_admin';
    
    if (!isPlatformAdmin) {
      // Check if user is admin/owner of this organization
      const membership = await db.collection('team_members').findOne({
        organizationId: orgId,
        userId: userId,
        status: 'active'
      });

      if (!membership || !['admin', 'owner'].includes(membership.role)) {
        return res.status(403).json({ 
          error: 'Only platform administrators or organization admin/owner can update billing cycle' 
        });
      }
    }

    // Calculate next reset date (1 month from start date)
    const nextResetDate = new Date(newStartDate);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    // Update organization's billing cycle
    const updateResult = await db.collection('organizations').updateOne(
      { _id: orgId },
      {
        $set: {
          'usage.conversations.lastReset': newStartDate,
          'usage.conversations.nextReset': nextResetDate,
          updatedAt: new Date(),
          updatedBy: userId
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ 
        error: 'Failed to update billing cycle. Organization may not have usage tracking initialized.' 
      });
    }

    console.log(`✅ Billing cycle updated for organization ${organizationId}`);
    console.log(`   New start: ${newStartDate.toISOString()}`);
    console.log(`   Next reset: ${nextResetDate.toISOString()}`);
    console.log(`   Updated by: ${session.user.email}`);

    // Get updated organization
    const updatedOrg = await db.collection('organizations').findOne({ _id: orgId });

    return res.status(200).json({
      message: 'Billing cycle updated successfully',
      billingCycle: {
        lastReset: updatedOrg.usage.conversations.lastReset,
        nextReset: updatedOrg.usage.conversations.nextReset,
        updatedAt: updatedOrg.updatedAt,
        updatedBy: session.user.email
      }
    });

  } catch (error) {
    console.error('Error updating billing cycle:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

