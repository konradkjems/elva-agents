import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('chatwidgets');

    // Get the base URL dynamically from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    
    // Find all demo widgets with localhost URLs in widgets collection
    const demoWidgets = await db.collection('widgets').find({ 
      isDemoMode: true,
      'demoSettings.demoUrl': { $regex: /localhost/ }
    }).toArray();

    // Find all demos with localhost URLs in demos collection
    const demos = await db.collection('demos').find({ 
      'demoSettings.demoUrl': { $regex: /localhost/ }
    }).toArray();

    console.log(`Found ${demoWidgets.length} demo widgets and ${demos.length} demos with localhost URLs`);

    // Update each demo widget
    const widgetUpdatePromises = demoWidgets.map(demo => {
      const newDemoUrl = `${baseUrl}/demo/${demo._id}`;
      
      return db.collection('widgets').updateOne(
        { _id: demo._id },
        { 
          $set: { 
            'demoSettings.demoUrl': newDemoUrl,
            updatedAt: new Date()
          }
        }
      );
    });

    // Update each demo
    const demoUpdatePromises = demos.map(demo => {
      const newDemoUrl = `${baseUrl}/demo/${demo._id}`;
      
      return db.collection('demos').updateOne(
        { _id: demo._id },
        { 
          $set: { 
            'demoSettings.demoUrl': newDemoUrl,
            updatedAt: new Date()
          }
        }
      );
    });

    await Promise.all([...widgetUpdatePromises, ...demoUpdatePromises]);

    const totalUpdated = demoWidgets.length + demos.length;
    console.log(`Updated ${totalUpdated} demo URLs to use base URL: ${baseUrl}`);

    return res.status(200).json({
      message: `Successfully updated ${totalUpdated} demo URLs`,
      baseUrl: baseUrl,
      widgetsUpdated: demoWidgets.length,
      demosUpdated: demos.length,
      totalUpdated: totalUpdated
    });

  } catch (error) {
    console.error('Error updating demo URLs:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
