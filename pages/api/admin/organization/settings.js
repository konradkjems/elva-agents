import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import clientPromise from '../../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');
    const userId = new ObjectId(session.user.id);
    const organizationId = new ObjectId(session.user.currentOrganizationId);

    // Get organization
    const organization = await db.collection('organizations').findOne({
      _id: organizationId,
      deletedAt: { $exists: false }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

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
        updatedAt: new Date(),
        lastEditedBy: userId,
        lastEditedAt: new Date()
      };

      // Initialize settings if it doesn't exist
      if (!organization.settings) {
        updateData.settings = {};
      }

      // Update support email
      if (supportEmail !== undefined) {
        updateData['settings.supportEmail'] = supportEmail.trim() || null;
      }

      await db.collection('organizations').updateOne(
        { _id: organizationId },
        { $set: updateData }
      );

      console.log('✅ Organization settings updated:', {
        organizationId: organizationId.toString(),
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
