import clientPromise from '../../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authentication - Check for platform admin
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // IMPORTANT: Only platform admins OR organization admin/owner can access demos
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

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents'); // Use new database

    // Get the base URL dynamically from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (req.method === 'GET') {
      // Platform-level: Get all demo widgets (no organizationId filter)
      const demos = await db.collection('widgets').find({ 
        isDemoMode: true 
      }).sort({ createdAt: -1 }).toArray();

      // Update demo URLs for existing demos if they contain localhost
      
      for (const demo of demos) {
        if (demo.demoSettings?.demoUrl && demo.demoSettings.demoUrl.includes('localhost')) {
          const newDemoUrl = `${baseUrl}/demo/${demo._id}`;
          
          await db.collection('widgets').updateOne(
            { _id: demo._id },
            { 
              $set: { 
                'demoSettings.demoUrl': newDemoUrl,
                updatedAt: new Date()
              }
            }
          );
          
          // Update the demo object for the response
          demo.demoSettings.demoUrl = newDemoUrl;
        }
      }

      return res.status(200).json(demos);
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

      // Generate unique demo ID
      const demoId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare widget data (Platform-level, no organizationId)
      const widgetData = {
        _id: demoId,
        name,
        description,
        isDemoMode: isDemoMode || false,
        openai,
        appearance,
        messages,
        branding,
        behavior,
        integrations,
        timezone,
        analytics,
        
        // Platform admin who created it
        createdBy: new ObjectId(session.user.id),
        lastEditedBy: new ObjectId(session.user.id),
        lastEditedAt: new Date(),
        
        status: isDemoMode ? 'demo' : 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        ...(isDemoMode && {
          demoSettings: {
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
      const result = await db.collection('widgets').insertOne(widgetData);

      if (result.insertedId) {
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
              demoId: result.insertedId
            })
          }).then(response => {
            if (response.ok) {
              console.log(`📸 Screenshot captured for demo ${result.insertedId}`);
            } else {
              console.error(`📸 Screenshot capture failed for demo ${result.insertedId}`);
            }
          }).catch(error => {
            console.error('Screenshot capture failed:', error);
          });
        }

        return res.status(201).json({
          _id: result.insertedId,
          ...widgetData
        });
      } else {
        return res.status(500).json({ message: 'Failed to create widget' });
      }
    }
  } catch (error) {
    console.error('Demo widget API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
