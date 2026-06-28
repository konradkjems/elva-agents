import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
import { fromRow } from '../../../lib/supabase/transform';
import { withAdmin } from '../../../lib/auth';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demos expose their custom string legacy_id as the public `_id` (used in demo
// URLs and admin links). Fall back to the uuid id when no legacy_id exists.
function serializeDemo(row) {
  const demo = fromRow(row);
  if (demo && demo.legacyId) demo._id = demo.legacyId;
  return demo;
}

export default async function handler(req, res) {
  console.log('📝 Demos API called:', req.method, req.url);

  // Authentication - Check for platform admin
  const session = await getSessionContext(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow access to all authenticated users for search functionality
  // POST/PUT/DELETE operations require platform admin OR organization admin/owner role
  if (req.method !== 'GET') {
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
  }

  // Get the base URL dynamically from request headers
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  console.log('📝 Base URL:', baseUrl);

  if (req.method === 'GET') {
    try {
      // Get user's current organization
      const currentOrgId = session.user?.currentOrganizationId;

      // Build query to filter by organization. Platform admin without an org
      // selected sees all demos (no filter).
      let query = admin.from('demos').select('*');
      if (currentOrgId) {
        query = query.eq('organization_id', currentOrgId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      const demos = (data || []).map(serializeDemo);
      console.log('📝 Returning demos for organization:', currentOrgId, 'Count:', demos.length);
      return res.status(200).json(demos);
    } catch (error) {
      console.error('Error fetching demos:', error);
      return res.status(500).json({ message: 'Failed to fetch demos' });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('📝 Creating demo with data:', req.body);
      const {
        widgetId,
        name,
        description,
        clientWebsiteUrl,
        clientInfo,
        usageLimits
      } = req.body;

      // Validate required fields
      if (!widgetId || !name) {
        console.log('📝 Validation failed: missing widgetId or name');
        return res.status(400).json({
          message: 'Widget ID and demo name are required'
        });
      }

      console.log('📝 Validation passed, fetching source widget...');

      // Check if widget data is provided directly in the request
      let sourceWidget = null;

      if (req.body.sourceWidget) {
        console.log('📝 Using widget data from request body');
        sourceWidget = req.body.sourceWidget;
      } else {
        // Fetch the source widget from database (by public legacy embed id, then uuid)
        console.log('📝 Looking for widget with ID:', widgetId);
        let { data } = await admin.from('widgets').select('*').eq('legacy_id', String(widgetId)).maybeSingle();
        if (!data && UUID_RE.test(String(widgetId))) {
          ({ data } = await admin.from('widgets').select('*').eq('id', widgetId).maybeSingle());
        }
        if (data) sourceWidget = fromRow(data);

        if (!sourceWidget) {
          console.log('📝 Widget not found for ID:', widgetId);
        }
      }

      console.log('📝 Source widget found:', sourceWidget ? 'Yes' : 'No');
      if (!sourceWidget) {
        console.log('📝 Source widget not found for ID:', widgetId);
        return res.status(404).json({
          message: 'Source widget not found'
        });
      }

      // Generate unique demo ID (preserved as legacy_id; uuid id is auto-generated)
      const demoId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get organizationId from source widget or current user (UUID string)
      const organizationId = sourceWidget.organizationId || session.user?.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          message: 'Organization ID is required. Please select an organization or use a widget with an organization.'
        });
      }

      console.log('📝 Organization ID:', organizationId);

      // Prepare demo data with organization
      // NOTE: We only store metadata about the demo, not the full widget config
      // The demo page will load the actual widget using source_widget_id
      const demoData = {
        legacy_id: demoId,
        name,
        description: description || `Demo of ${sourceWidget.name}`,
        source_widget_id: widgetId, // The actual widget ID to use
        source_widget_name: sourceWidget.name,

        // Organization-specific
        organization_id: organizationId,

        // Platform admin who created it
        created_by: session.user.id,
        target_client: clientInfo?.companyName || clientInfo || 'Unknown Client',

        // Demo-specific settings (only metadata, widget config comes from source_widget_id)
        demo_settings: {
          clientWebsiteUrl: clientWebsiteUrl || '',
          clientInfo: clientInfo || '',
          demoId,
          demoUrl: `${baseUrl}/demo/${demoId}`,
          usageLimits: {
            maxInteractions: usageLimits?.maxInteractions || 50,
            maxViews: usageLimits?.maxViews || 100,
            expiresAt: usageLimits?.expiresAt || null,
            currentUsage: {
              interactions: 0,
              views: 0
            }
          }
        },

        status: 'active'
      };

      console.log('📝 Demo will use source widget ID:', widgetId);
      console.log('📝 Demo data structure (simplified - no widget config duplication)');

      // Insert demo
      console.log('📝 Inserting demo into database...');
      const { data: inserted, error: insertError } = await admin
        .from('demos')
        .insert(demoData)
        .select('*')
        .single();

      if (insertError) {
        console.log('📝 Demo insertion failed:', insertError.message);
        return res.status(500).json({ message: 'Failed to create demo' });
      }

      // Capture screenshot asynchronously if client website URL is provided
      if (clientWebsiteUrl) {
        // Trigger screenshot capture in background
        fetch(`${baseUrl}/api/admin/screenshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: clientWebsiteUrl,
            demoId: demoId
          })
        }).catch(error => {
          console.error('Failed to trigger screenshot capture:', error);
        });
      }

      return res.status(201).json({
        message: 'Demo created successfully',
        demo: serializeDemo(inserted)
      });
    } catch (error) {
      console.error('📝 Error creating demo:', error);
      return res.status(500).json({ message: 'Failed to create demo' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
