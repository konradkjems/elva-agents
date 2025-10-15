import clientPromise from '../../../lib/mongodb';
import { withAdmin } from '../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  console.log('📝 Demos API called:', req.method, req.url);
  
  // Authentication - Check for platform admin
  const session = await getServerSession(req, res, authOptions);
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
  }

  const client = await clientPromise;
  const db = client.db('elva-agents'); // Use new database

  // Get the base URL dynamically from request headers
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  console.log('📝 Base URL:', baseUrl);

  if (req.method === 'GET') {
    try {
      // Get user's current organization
      const currentOrgId = session.user?.currentOrganizationId;
      const isPlatformAdmin = session.user?.role === 'platform_admin';
      
      // Build query to filter by organization
      let query = {};
      
      if (currentOrgId && !isPlatformAdmin) {
        // Regular users: only see demos from their organization
        query.organizationId = new ObjectId(currentOrgId);
      } else if (currentOrgId && isPlatformAdmin) {
        // Platform admin with selected org: see that org's demos
        query.organizationId = new ObjectId(currentOrgId);
      }
      // Platform admin without org selected: see all demos (no filter)
      
      const demos = await db.collection('demos').find(query).sort({ createdAt: -1 }).toArray();
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
        // Fetch the source widget from database
        console.log('📝 Looking for widget with ID:', widgetId);
        console.log('📝 Widget ID type:', typeof widgetId);
        
        // Try different query approaches
        sourceWidget = await db.collection('widgets').findOne({ _id: widgetId });
        
        // If not found, try as string
        if (!sourceWidget) {
          console.log('📝 Trying with string ID...');
          sourceWidget = await db.collection('widgets').findOne({ _id: String(widgetId) });
        }
        
        // If still not found, list available widgets
        if (!sourceWidget) {
          console.log('📝 Widget not found, listing available widgets...');
          const allWidgets = await db.collection('widgets').find({}).toArray();
          console.log('📝 Available widgets:', allWidgets.map(w => ({ id: w._id, name: w.name })));
        }
      }
      
      console.log('📝 Source widget found:', sourceWidget ? 'Yes' : 'No');
      if (!sourceWidget) {
        console.log('📝 Source widget not found for ID:', widgetId);
        return res.status(404).json({ 
          message: 'Source widget not found' 
        });
      }

      // Generate unique demo ID
      const demoId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Get organizationId from source widget or current user
      // IMPORTANT: Always ensure it's stored as ObjectId, not string
      let organizationId = sourceWidget.organizationId || session.user?.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({ 
          message: 'Organization ID is required. Please select an organization or use a widget with an organization.' 
        });
      }
      
      // Convert to ObjectId if it's a string
      if (typeof organizationId === 'string') {
        organizationId = new ObjectId(organizationId);
      } else if (!(organizationId instanceof ObjectId)) {
        // If it's already an ObjectId, keep it as is
        // If it's neither string nor ObjectId, try to convert
        try {
          organizationId = new ObjectId(organizationId);
        } catch (error) {
          return res.status(400).json({ 
            message: 'Invalid organization ID format' 
          });
        }
      }
      
      console.log('📝 Organization ID (as ObjectId):', organizationId);
      
      // Prepare demo data with organization
      // NOTE: We only store metadata about the demo, not the full widget config
      // The demo page will load the actual widget using sourceWidgetId
      const demoData = {
        _id: demoId,
        name,
        description: description || `Demo of ${sourceWidget.name}`,
        sourceWidgetId: widgetId, // The actual widget ID to use
        sourceWidgetName: sourceWidget.name,
        
        // Organization-specific
        organizationId: organizationId,
        
        // Platform admin who created it
        createdBy: new ObjectId(session.user.id),
        targetClient: clientInfo?.companyName || clientInfo || 'Unknown Client',
        
        // Demo-specific settings (only metadata, widget config comes from sourceWidgetId)
        demoSettings: {
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
        
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('📝 Demo will use source widget ID:', widgetId);
      console.log('📝 Demo data structure (simplified - no widget config duplication)');

      // Insert demo
      console.log('📝 Inserting demo into database...');
      const result = await db.collection('demos').insertOne(demoData);
      console.log('📝 Demo insertion result:', result.insertedId ? 'Success' : 'Failed');

      if (result.insertedId) {
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
          demo: demoData
        });
      } else {
        console.log('📝 Demo insertion failed - no insertedId');
        return res.status(500).json({ message: 'Failed to create demo' });
      }
    } catch (error) {
      console.error('📝 Error creating demo:', error);
      return res.status(500).json({ message: 'Failed to create demo' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}



