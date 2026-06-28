import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../../components/admin/Layout';
import { 
  Cog6ToothIcon,
  KeyIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  BellIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const tabs = [
    { id: 0, name: 'System', icon: Cog6ToothIcon },
    { id: 1, name: 'API Keys', icon: KeyIcon },
    { id: 2, name: 'Database', icon: CircleStackIcon },
    { id: 3, name: 'Security', icon: ShieldCheckIcon },
    { id: 4, name: 'Notifications', icon: BellIcon },
    { id: 5, name: 'Backup', icon: CloudIcon }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (section, newSettings) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, settings: newSettings })
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Settings - Elva Agents</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure your Elva Agents system</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 0 && <SystemSettings settings={settings} onSave={saveSettings} />}
          {activeTab === 1 && <APIKeysSettings settings={settings} onSave={saveSettings} />}
          {activeTab === 2 && <DatabaseSettings settings={settings} onSave={saveSettings} />}
          {activeTab === 3 && <SecuritySettings settings={settings} onSave={saveSettings} />}
          {activeTab === 4 && <NotificationSettings settings={settings} onSave={saveSettings} />}
          {activeTab === 5 && <BackupSettings settings={settings} onSave={saveSettings} />}
        </div>
      </div>
    </Layout>
  );
}

function SystemSettings({ settings, onSave }) {
  const [formData, setFormData] = useState({
    appName: settings?.system?.appName || 'Elva Agents',
    version: settings?.system?.version || '1.0.0',
    environment: settings?.system?.environment || 'development',
    debugMode: settings?.system?.debugMode || false,
    maintenanceMode: settings?.system?.maintenanceMode || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave('system', formData);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application Name
            </label>
            <input
              type="text"
              value={formData.appName}
              onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="debugMode"
              checked={formData.debugMode}
              onChange={(e) => setFormData(prev => ({ ...prev, debugMode: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="debugMode" className="ml-2 text-sm text-gray-700">
              Enable debug mode (shows detailed error messages)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={formData.maintenanceMode}
              onChange={(e) => setFormData(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="maintenanceMode" className="ml-2 text-sm text-gray-700">
              Maintenance mode (disables all widgets)
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save System Settings
        </button>
      </form>
    </div>
  );
}

function APIKeysSettings({ settings, onSave }) {
  const [formData, setFormData] = useState({
    openaiApiKey: settings?.apiKeys?.openaiApiKey ? '••••••••••••••••' : ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only send non-masked values
    const dataToSave = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value && !value.includes('••••')) {
        dataToSave[key] = value;
      }
    });
    onSave('apiKeys', dataToSave);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys Configuration</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Key
          </label>
          <input
            type="password"
            placeholder="Enter new OpenAI API key"
            value={formData.openaiApiKey}
            onChange={(e) => setFormData(prev => ({ ...prev, openaiApiKey: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Get your API key from OpenAI Platform</p>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save API Keys
        </button>
      </form>
    </div>
  );
}

function DatabaseSettings() {
  // The database is now Supabase (Postgres); there is no app-managed MongoDB
  // connection string anymore. Connection config lives in Supabase env vars and
  // schema is managed via SQL migrations (supabase/migrations/*).
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Configuration</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Managed by Supabase</h4>
        <p className="text-sm text-gray-600 mb-4">
          The platform runs on Supabase (Postgres). Connection settings are
          configured via Supabase environment variables and the schema is managed
          through SQL migrations — there is no app-level connection string to set
          here. Use the Supabase dashboard for database administration.
        </p>
        <a
          href="https://supabase.com/dashboard/project/_/database/tables"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Supabase Database
        </a>
      </div>
    </div>
  );
}

function SecuritySettings({ settings, onSave }) {
  const [formData, setFormData] = useState({
    corsOrigins: settings?.security?.corsOrigins || '*',
    rateLimitRequests: settings?.security?.rateLimitRequests || 100,
    rateLimitWindow: settings?.security?.rateLimitWindow || 15,
    enableHttps: settings?.security?.enableHttps || false,
    sessionTimeout: settings?.security?.sessionTimeout || 3600
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave('security', formData);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Configuration</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CORS Origins
          </label>
          <input
            type="text"
            value={formData.corsOrigins}
            onChange={(e) => setFormData(prev => ({ ...prev, corsOrigins: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com,https://app.example.com"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list of allowed origins</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit Requests
            </label>
            <input
              type="number"
              value={formData.rateLimitRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, rateLimitRequests: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit Window (minutes)
            </label>
            <input
              type="number"
              value={formData.rateLimitWindow}
              onChange={(e) => setFormData(prev => ({ ...prev, rateLimitWindow: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableHttps"
              checked={formData.enableHttps}
              onChange={(e) => setFormData(prev => ({ ...prev, enableHttps: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableHttps" className="ml-2 text-sm text-gray-700">
              Force HTTPS connections
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Security Settings
        </button>
      </form>
    </div>
  );
}

function NotificationSettings({ settings, onSave }) {
  const [formData, setFormData] = useState({
    emailNotifications: settings?.notifications?.emailNotifications || false,
    emailAddress: settings?.notifications?.emailAddress || '',
    slackWebhook: settings?.notifications?.slackWebhook || '',
    errorThreshold: settings?.notifications?.errorThreshold || 5,
    performanceThreshold: settings?.notifications?.performanceThreshold || 5000
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave('notifications', formData);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Configuration</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={formData.emailNotifications}
              onChange={(e) => setFormData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="emailNotifications" className="ml-2 text-sm text-gray-700">
              Enable email notifications
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slack Webhook URL
          </label>
          <input
            type="url"
            value={formData.slackWebhook}
            onChange={(e) => setFormData(prev => ({ ...prev, slackWebhook: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://hooks.slack.com/services/..."
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Error Threshold
            </label>
            <input
              type="number"
              value={formData.errorThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, errorThreshold: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Errors per minute before notification</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Performance Threshold (ms)
            </label>
            <input
              type="number"
              value={formData.performanceThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, performanceThreshold: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Response time threshold for alerts</p>
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Notification Settings
        </button>
      </form>
    </div>
  );
}

function BackupSettings() {
  // Database backups are now handled natively by Supabase (automated daily
  // backups + Point-in-Time Recovery). The previous in-app /api/admin/backup
  // and /api/admin/restore endpoints dumped whole collections into a single row
  // and restored by wiping every collection — unscoped across tenants,
  // size-limited, and dangerous — so they have been retired.
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup & Restore</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Managed by Supabase</h4>
        <p className="text-sm text-gray-600 mb-4">
          Database backups are handled automatically by Supabase — daily automated
          backups and Point-in-Time Recovery (PITR). To create an on-demand backup,
          restore a snapshot, or download a dump, use the Supabase dashboard.
        </p>
        <a
          href="https://supabase.com/dashboard/project/_/database/backups"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Supabase Backups
        </a>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  }
}