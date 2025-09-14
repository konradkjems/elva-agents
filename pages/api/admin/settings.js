import clientPromise from '../../../lib/mongodb.js';
import { withAdmin } from '../../../lib/auth';

async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db('chatwidgets');
    const settings = db.collection('settings');

    switch (req.method) {
      case 'GET':
        return await getSettings(req, res, settings);
      case 'PUT':
        return await updateSettings(req, res, settings);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

async function getSettings(req, res, settings) {
  try {
    // Get all settings or create default if none exist
    let settingsDoc = await settings.findOne({ _id: 'system' });
    
    if (!settingsDoc) {
      // Create default settings
      const defaultSettings = {
        _id: 'system',
        system: {
          appName: 'Elva Agents',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          debugMode: false,
          maintenanceMode: false
        },
        apiKeys: {
          openaiApiKey: process.env.OPENAI_API_KEY ? '••••••••••••••••' : '',
          cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ? '••••••••••••••••' : '',
          cloudinarySecret: process.env.CLOUDINARY_API_SECRET ? '••••••••••••••••' : ''
        },
        database: {
          connectionString: process.env.MONGODB_URI ? '••••••••••••••••' : '',
          maxConnections: 10,
          timeout: 30000,
          retryAttempts: 3
        },
        security: {
          corsOrigins: '*',
          rateLimitRequests: 100,
          rateLimitWindow: 15,
          enableHttps: false,
          sessionTimeout: 3600
        },
        notifications: {
          emailNotifications: false,
          emailAddress: '',
          slackWebhook: '',
          errorThreshold: 5,
          performanceThreshold: 5000
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await settings.insertOne(defaultSettings);
      settingsDoc = defaultSettings;
    }

    // Remove sensitive data from response
    const safeSettings = { ...settingsDoc };
    delete safeSettings._id;

    return res.status(200).json(safeSettings);

  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

async function updateSettings(req, res, settings) {
  const { section, settings: newSettings } = req.body;

  if (!section || !newSettings) {
    return res.status(400).json({ 
      error: 'Section and settings data are required' 
    });
  }

  try {
    // Get current settings
    let currentSettings = await settings.findOne({ _id: 'system' });
    
    if (!currentSettings) {
      // Create default settings first
      await getSettings(req, res, settings);
      currentSettings = await settings.findOne({ _id: 'system' });
    }

    // Update specific section
    const updateData = {
      [`${section}`]: newSettings,
      updatedAt: new Date()
    };

    const result = await settings.updateOne(
      { _id: 'system' },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Settings updated successfully' 
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}
