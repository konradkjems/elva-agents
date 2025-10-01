import clientPromise from '../../../lib/mongodb';
import { withAdmin } from '../../../lib/auth';

// Temporarily bypass auth for testing
export default async function handler(req, res) {
  console.log('📝 Demos API called:', req.method, req.url);
  console.log('📝 User:', req.user);
  const client = await clientPromise;
  const db = client.db('chatwidgets');

  // Get the base URL dynamically from request headers
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  console.log('📝 Base URL:', baseUrl);

  if (req.method === 'GET') {
    try {
      const demos = await db.collection('demos').find({}).sort({ createdAt: -1 }).toArray();
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
      
      // Prepare demo data
      const demoData = {
        _id: demoId,
        name,
        description: description || `Demo of ${sourceWidget.name}`,
        sourceWidgetId: widgetId,
        sourceWidgetName: sourceWidget.name,
        
        // Copy widget configuration
        openai: sourceWidget.openai,
        appearance: sourceWidget.appearance,
        messages: sourceWidget.messages,
        branding: sourceWidget.branding,
        behavior: sourceWidget.behavior,
        integrations: sourceWidget.integrations,
        timezone: sourceWidget.timezone,
        analytics: sourceWidget.analytics,
        
        // Demo-specific settings
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



