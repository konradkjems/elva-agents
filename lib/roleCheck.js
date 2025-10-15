import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

export async function getUserTeamRole(userId, organizationId) {
  const client = await clientPromise;
  const db = client.db('elva-agents');
  
  const teamMember = await db.collection('team_members').findOne({
    userId: new ObjectId(userId),
    organizationId: new ObjectId(organizationId),
    status: 'active'
  });
  
  return teamMember?.role || null;
}

export async function requireRole(req, res, allowedRoles) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return { authorized: false, error: 'Not authenticated' };
  }
  
  const teamRole = await getUserTeamRole(
    session.user.id,
    session.user.currentOrganizationId
  );
  
  const isPlatformAdmin = session.user.role === 'platform_admin';
  
  if (!isPlatformAdmin && !allowedRoles.includes(teamRole)) {
    return { authorized: false, error: 'Insufficient permissions' };
  }
  
  return { authorized: true, teamRole, session };
}

