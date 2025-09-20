import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('chatwidgets');

    // Get the base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Find all demo widgets with localhost URLs
    const demos = await db.collection('widgets').find({ 
      isDemoMode: true,
      'demoSettings.demoUrl': { $regex: /localhost/ }
    }).toArray();

    console.log(`Found ${demos.length} demo widgets with localhost URLs`);

    // Update each demo widget
    const updatePromises = demos.map(demo => {
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

    await Promise.all(updatePromises);

    console.log(`Updated ${demos.length} demo URLs to use base URL: ${baseUrl}`);

    return res.status(200).json({
      message: `Successfully updated ${demos.length} demo URLs`,
      baseUrl: baseUrl,
      updatedCount: demos.length
    });

  } catch (error) {
    console.error('Error updating demo URLs:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
