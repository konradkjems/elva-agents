import clientPromise from '../../../../lib/mongodb';
import { deleteFromCloudinary } from '../../../../lib/cloudinary';

export default async function handler(req, res) {
  const { demoId } = req.query;

  if (!demoId) {
    return res.status(400).json({ message: 'Demo ID is required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('chatwidgets');

    if (req.method === 'GET') {
      // Get demo widget
      const demo = await db.collection('widgets').findOne({ 
        _id: demoId,
        isDemoMode: true 
      });

      if (!demo) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      return res.status(200).json(demo);
    }

    if (req.method === 'PUT') {
      // Update demo widget
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      
      // Add updated timestamp
      updateData.updatedAt = new Date();

      const result = await db.collection('widgets').updateOne(
        { _id: demoId, isDemoMode: true },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      return res.status(200).json({ 
        message: 'Demo widget updated successfully',
        modifiedCount: result.modifiedCount 
      });
    }

    if (req.method === 'DELETE') {
      // First, get the demo widget to check for screenshot
      const demo = await db.collection('widgets').findOne({ 
        _id: demoId,
        isDemoMode: true 
      });

      if (!demo) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      // Delete screenshot from Cloudinary if it exists
      if (demo.demoSettings?.screenshotPublicId) {
        try {
          const deleteResult = await deleteFromCloudinary(demo.demoSettings.screenshotPublicId);
          if (deleteResult.success) {
            console.log(`📸 Screenshot deleted from Cloudinary: ${demo.demoSettings.screenshotPublicId}`);
          } else {
            console.warn(`📸 Failed to delete screenshot from Cloudinary: ${deleteResult.error}`);
          }
        } catch (error) {
          console.error('Error deleting screenshot from Cloudinary:', error);
        }
      }

      // Delete demo widget from database
      const result = await db.collection('widgets').deleteOne({ 
        _id: demoId,
        isDemoMode: true 
      });

      return res.status(200).json({ 
        message: 'Demo widget deleted successfully' 
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Demo widget API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
