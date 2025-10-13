/**
 * User Data Export API
 * GDPR Article 15 (Right to Access) & Article 20 (Data Portability)
 * 
 * GET /api/user/export-data - Download all user data in JSON format
 */

import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db('elva-agents');

    console.log(`📥 Data export requested by user: ${userId}`);

    // Gather all user data
    const userData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      gdprNote: 'This export contains all your personal data as per GDPR Article 15 & 20',
      user: null,
      organizations: [],
      widgets: [],
      conversations: [],
      analytics: [],
      manualReviews: [],
      invitations: []
    };

    // 1. User profile (exclude password)
    const user = await db.collection('users').findOne({ _id: userId });
    if (user) {
      const { password, ...userWithoutPassword } = user;
      userData.user = userWithoutPassword;
    }

    // 2. Organizations & Team Memberships
    const memberships = await db.collection('team_members').find({
      userId: userId
    }).toArray();

    for (const membership of memberships) {
      const org = await db.collection('organizations').findOne({
        _id: membership.organizationId
      });
      
      if (org) {
        userData.organizations.push({
          organization: org,
          membership: membership
        });
      }
    }

    // 3. Widgets owned by user's organizations
    const orgIds = memberships.map(m => m.organizationId);
    const widgets = await db.collection('widgets').find({
      organizationId: { $in: orgIds }
    }).toArray();
    userData.widgets = widgets;

    // 4. Conversations (limit to last 1000 for performance)
    const widgetIds = widgets.map(w => w._id);
    if (widgetIds.length > 0) {
      const conversations = await db.collection('conversations').find({
        widgetId: { $in: widgetIds }
      }).sort({ createdAt: -1 }).limit(1000).toArray();
      userData.conversations = conversations;

      // 5. Analytics
      const analytics = await db.collection('analytics').find({
        agentId: { $in: widgetIds.map(id => id.toString()) }
      }).toArray();
      userData.analytics = analytics;

      // 6. Manual reviews
      const reviews = await db.collection('manual_reviews').find({
        widgetId: { $in: widgetIds }
      }).toArray();
      userData.manualReviews = reviews;
    }

    // 7. Invitations sent to this user
    const invitations = await db.collection('invitations').find({
      email: user.email
    }).toArray();
    userData.invitations = invitations;

    // Log the export for audit trail
    await db.collection('audit_log').insertOne({
      userId: userId,
      action: 'data_export',
      timestamp: new Date(),
      metadata: {
        itemsExported: {
          widgets: userData.widgets.length,
          conversations: userData.conversations.length,
          analytics: userData.analytics.length,
          organizations: userData.organizations.length
        }
      }
    });

    // Set headers for download
    const filename = `elva-data-export-${userId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    console.log(`✅ Data export successful for user: ${userId}`);

    // Return as JSON
    return res.status(200).json(userData);

  } catch (error) {
    console.error('❌ Data export error:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
}

