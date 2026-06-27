import { admin } from '../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../lib/supabase/session';
import { fromRow } from '../../../../lib/supabase/transform';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getSessionContext(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const organizationId = session.user.currentOrganizationId;

    // Get organization
    const { data: orgRow, error: orgErr } = await admin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .is('deleted_at', null)
      .maybeSingle();
    if (orgErr) throw orgErr;

    if (!orgRow) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = fromRow(orgRow);

    if (req.method === 'GET') {
      return res.status(200).json({
        settings: organization.settings || {}
      });
    }

    if (req.method === 'PUT') {
      const { supportEmail } = req.body;

      // Validate email format if provided
      if (supportEmail && supportEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(supportEmail.trim())) {
          return res.status(400).json({ error: 'Invalid email format' });
        }
      }

      // Update organization settings
      const updateData = {
        last_edited_by: userId,
        last_edited_at: new Date().toISOString()
      };

      // Update support email (merge into the settings JSONB)
      if (supportEmail !== undefined) {
        updateData.settings = {
          ...(organization.settings || {}),
          supportEmail: supportEmail.trim() || null
        };
      }

      const { error: updErr } = await admin
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId);
      if (updErr) throw updErr;

      console.log('✅ Organization settings updated:', {
        organizationId: organizationId,
        supportEmail: supportEmail?.trim() || null
      });

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully'
      });
    }

  } catch (error) {
    console.error('Organization settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
