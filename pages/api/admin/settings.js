import { admin } from '../../../lib/supabase/admin';
import { withAdmin } from '../../../lib/auth';

function buildDefaultSettings() {
  return {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        return await getSettings(req, res);
      case 'PUT':
        return await updateSettings(req, res);
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

async function getSettings(req, res) {
  try {
    // Get the single global settings row, or create defaults if none exist
    const { data: row, error } = await admin
      .from('app_settings')
      .select('data')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;

    let settingsData = row?.data;

    if (!settingsData) {
      settingsData = buildDefaultSettings();
      const { error: upsertErr } = await admin
        .from('app_settings')
        .upsert({ id: 1, data: settingsData }, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }

    return res.status(200).json(settingsData);

  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

async function updateSettings(req, res) {
  const { section, settings: newSettings } = req.body;

  if (!section || !newSettings) {
    return res.status(400).json({
      error: 'Section and settings data are required'
    });
  }

  try {
    // Get current settings (or seed defaults)
    const { data: row, error } = await admin
      .from('app_settings')
      .select('data')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;

    const current = row?.data || buildDefaultSettings();

    // Update specific section
    const updatedData = {
      ...current,
      [section]: newSettings,
      updatedAt: new Date().toISOString()
    };

    const { error: upsertErr } = await admin
      .from('app_settings')
      .upsert({ id: 1, data: updatedData }, { onConflict: 'id' });
    if (upsertErr) throw upsertErr;

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}
