import clientPromise from '../../../../lib/mongodb';
import { withAdmin } from '../../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Set CORS headers for public demo access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await clientPromise;
  const db = client.db('elva-agents'); // Use new database
  const { demoId } = req.query;

  if (req.method === 'GET') {
    // GET is public - anyone can view demos (no authentication required)
    // This allows sharing demo links with clients
    try {
      const demo = await db.collection('demos').findOne({ _id: demoId });
      if (!demo) {
        return res.status(404).json({ message: 'Demo not found' });
      }
      return res.status(200).json(demo);
    } catch (error) {
      console.error('Error fetching demo:', error);
      return res.status(500).json({ message: 'Failed to fetch demo' });
    }
  }

  // PUT and DELETE require authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // IMPORTANT: Only platform admins OR organization admin/owner can modify/delete demos
  const isPlatformAdmin = session.user?.role === 'platform_admin';
  const currentOrgId = session.user?.currentOrganizationId;
  
  if (!isPlatformAdmin && currentOrgId) {
    // Check if user has admin/owner role in their organization
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const teamMember = await db.collection('team_members').findOne({
      userId: new ObjectId(session.user.id),
      organizationId: new ObjectId(currentOrgId)
    });
    
    if (!teamMember || !['admin', 'owner'].includes(teamMember.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Demo management requires platform admin or organization admin/owner role.' 
      });
    }
  } else if (!isPlatformAdmin) {
    return res.status(403).json({ 
      error: 'Access denied. Demo management requires platform admin or organization admin/owner role.' 
    });
  }

  // Verify the demo belongs to user's organization
  if (currentOrgId) {
    const demo = await db.collection('demos').findOne({ _id: demoId });
    if (demo && demo.organizationId && demo.organizationId.toString() !== currentOrgId) {
      return res.status(403).json({ 
        error: 'Access denied. This demo belongs to a different organization.' 
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      updateData.updatedAt = new Date();

      const result = await db.collection('demos').updateOne(
        { _id: demoId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      return res.status(200).json({ message: 'Demo updated successfully' });
    } catch (error) {
      console.error('Error updating demo:', error);
      return res.status(500).json({ message: 'Failed to update demo' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await db.collection('demos').deleteOne({ _id: demoId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Demo not found' });
      }

      return res.status(200).json({ message: 'Demo deleted successfully' });
    } catch (error) {
      console.error('Error deleting demo:', error);
      return res.status(500).json({ message: 'Failed to delete demo' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}



