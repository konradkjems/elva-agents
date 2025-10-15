import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = await clientPromise;
  const db = client.db('elva-agents');
  
  // Get user from database
  const user = await db.collection('users').findOne({ 
    _id: new ObjectId(session.user.id) 
  });

  // Get user's team memberships
  const memberships = await db.collection('team_members').find({
    userId: new ObjectId(session.user.id),
    status: 'active'
  }).toArray();

  // Get organizations
  const orgIds = memberships.map(m => m.organizationId);
  const organizations = await db.collection('organizations').find({
    _id: { $in: orgIds }
  }).toArray();

  return res.json({
    session: {
      user: session.user,
      expires: session.expires
    },
    databaseUser: {
      _id: user?._id,
      email: user?.email,
      name: user?.name,
      role: user?.role,
      currentOrganizationId: user?.currentOrganizationId,
      status: user?.status
    },
    memberships: memberships.map(m => ({
      _id: m._id,
      organizationId: m.organizationId,
      role: m.role,
      status: m.status
    })),
    organizations: organizations.map(o => ({
      _id: o._id,
      name: o.name,
      slug: o.slug
    }))
  });
}

