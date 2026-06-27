/**
 * User Data Export API
 * GDPR Article 15 (Right to Access) & Article 20 (Data Portability)
 *
 * GET /api/user/export-data - Download all user data in JSON format
 */

import { getSession } from 'next-auth/react';
import { admin } from '../../../lib/supabase/admin';
import { fromRow, fromRows } from '../../../lib/supabase/transform';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    if (!UUID_RE.test(userId)) {
      return res.status(404).json({ error: 'User not found' });
    }

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
    const { data: userRow } = await admin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    let userEmail = null;
    if (userRow) {
      const userDoc = fromRow(userRow);
      delete userDoc.passwordHash;
      delete userDoc.password;
      userData.user = userDoc;
      userEmail = userRow.email;
    }

    // 2. Organizations & Team Memberships
    const { data: membershipRows } = await admin
      .from('team_members')
      .select('*')
      .eq('user_id', userId);
    const memberships = fromRows(membershipRows);

    for (const membership of memberships) {
      const { data: orgRow } = membership.organizationId
        ? await admin
            .from('organizations')
            .select('*')
            .eq('id', membership.organizationId)
            .maybeSingle()
        : { data: null };

      if (orgRow) {
        userData.organizations.push({
          organization: fromRow(orgRow),
          membership: membership
        });
      }
    }

    // 3. Widgets owned by user's organizations
    const orgIds = memberships.map(m => m.organizationId).filter(Boolean);
    let widgets = [];
    if (orgIds.length > 0) {
      const { data: widgetRows } = await admin
        .from('widgets')
        .select('*')
        .in('organization_id', orgIds);
      widgets = fromRows(widgetRows);
    }
    userData.widgets = widgets;

    // 4. Conversations (limit to last 1000 for performance)
    const widgetIds = widgets.map(w => w._id);
    if (widgetIds.length > 0) {
      const { data: conversationRows } = await admin
        .from('conversations')
        .select('*')
        .in('widget_id', widgetIds)
        .order('created_at', { ascending: false })
        .limit(1000);
      userData.conversations = fromRows(conversationRows);

      // 5. Analytics
      const { data: analyticsRows } = await admin
        .from('analytics')
        .select('*')
        .in('widget_id', widgetIds);
      userData.analytics = fromRows(analyticsRows);

      // 6. Support requests
      const { data: requestRows } = await admin
        .from('support_requests')
        .select('*')
        .in('widget_id', widgetIds);
      userData.supportRequests = fromRows(requestRows);
    }

    // 7. Invitations sent to this user
    if (userEmail) {
      const { data: invitationRows } = await admin
        .from('invitations')
        .select('*')
        .eq('email', userEmail);
      userData.invitations = fromRows(invitationRows);
    }

    // Log the export for audit trail
    await admin.from('audit_log').insert({
      action: 'data_export',
      user_id: userId,
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
