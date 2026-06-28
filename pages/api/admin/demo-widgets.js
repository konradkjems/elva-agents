import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { fromRow } from '../../../lib/supabase/transform';
// Demo widgets live in the widgets table (is_demo_mode = true). Their custom
// string legacy_id is exposed as the public `_id`.
function serializeDemo(row) {
  const demo = fromRow(row);
  if (demo && demo.legacyId) demo._id = demo.legacyId;
  return demo;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authentication - Check for platform admin
  const session = await getSessionContext(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // IMPORTANT: Only platform admins OR organization admin/owner can access demos
  const isPlatformAdmin = session.user?.role === 'platform_admin';
  const currentOrgId = session.user?.currentOrganizationId;

  if (!isPlatformAdmin && currentOrgId) {
    // Check if user has admin/owner role in their organization
    const { data: teamMember } = await admin
      .from('team_members')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('organization_id', currentOrgId)
      .maybeSingle();

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

  try {
    // Get the base URL dynamically from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (req.method === 'GET') {
      // Platform-level: Get all demo widgets (no organization filter)
      const { data, error } = await admin
        .from('widgets')
        .select('*')
        .eq('is_demo_mode', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];

      // Update demo URLs for existing demos if they contain localhost
      for (const row of rows) {
        if (row.demo_settings?.demoUrl && row.demo_settings.demoUrl.includes('localhost')) {
          const publicId = row.legacy_id || row.id;
          const newDemoUrl = `${baseUrl}/demo/${publicId}`;

          row.demo_settings.demoUrl = newDemoUrl;
          await admin
            .from('widgets')
            .update({ demo_settings: row.demo_settings })
            .eq('id', row.id);
        }
      }

      return res.status(200).json(rows.map(serializeDemo));
    }

    if (req.method === 'POST') {
      // Create new demo widget
      const {
        name,
        description,
        isDemoMode,
        openai,
        demoSettings,
        appearance,
        messages,
        branding,
        behavior,
        integrations,
        timezone,
        analytics
      } = req.body;

      // Validate required fields
      if (!name || !openai?.promptId) {
        return res.status(400).json({
          message: 'Widget name and OpenAI prompt ID are required'
        });
      }

      if (isDemoMode && !demoSettings?.clientWebsiteUrl) {
        return res.status(400).json({
          message: 'Client website URL is required for demo widgets'
        });
      }

      // Generate unique demo ID (preserved as legacy_id; uuid id auto-generated)
      const demoId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare widget data (Platform-level, no organization)
      const widgetData = {
        legacy_id: demoId,
        name,
        description,
        is_demo_mode: isDemoMode || false,
        openai,
        appearance,
        messages,
        branding,
        behavior,
        integrations,
        timezone,
        analytics,

        // Platform admin who created it
        created_by: session.user.id,
        last_edited_by: session.user.id,
        last_edited_at: new Date().toISOString(),

        status: isDemoMode ? 'demo' : 'active',
        ...(isDemoMode && {
          demo_settings: {
            ...demoSettings,
            demoId,
            demoUrl: `${baseUrl}/demo/${demoId}`,
            usageLimits: {
              ...demoSettings.usageLimits,
              currentUsage: {
                interactions: 0,
                views: 0
              }
            }
          }
        })
      };

      // Insert widget
      const { data: inserted, error } = await admin
        .from('widgets')
        .insert(widgetData)
        .select('*')
        .single();
      if (error) {
        return res.status(500).json({ message: 'Failed to create widget' });
      }

      // If it's a demo widget, capture screenshot asynchronously
      if (isDemoMode && demoSettings?.clientWebsiteUrl) {
        // Don't await screenshot capture to avoid blocking the response
        fetch(`${baseUrl}/api/admin/screenshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: demoSettings.clientWebsiteUrl,
            demoId: demoId
          })
        }).then(response => {
          if (response.ok) {
            console.log(`📸 Screenshot captured for demo ${demoId}`);
          } else {
            console.error(`📸 Screenshot capture failed for demo ${demoId}`);
          }
        }).catch(error => {
          console.error('Screenshot capture failed:', error);
        });
      }

      return res.status(201).json(serializeDemo(inserted));
    }
  } catch (error) {
    console.error('Demo widget API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
