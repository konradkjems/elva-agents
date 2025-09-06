import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/Layout';
import LivePreview from '../../../../components/admin/WidgetEditor/LivePreview';
import SettingsPanel from '../../../../components/admin/WidgetEditor/SettingsPanel';

export default function WidgetEditor() {
  const router = useRouter();
  const { id } = router.query;
  const [widget, setWidget] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWidget();
    } else if (router.isReady) {
      // If router is ready but no id, set loading to false
      setLoading(false);
    }
  }, [id, router.isReady]);

  const fetchWidget = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/admin/widgets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch widget');
      }
      const data = await response.json();
      setWidget(data);
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch widget:', error);
      alert('Failed to load widget');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/widgets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save widget');
      }
      
      const updatedWidget = await response.json();
      setWidget(updatedWidget);
      alert('Widget saved successfully!');
    } catch (error) {
      console.error('Failed to save widget:', error);
      alert('Failed to save widget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150 cursor-not-allowed">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading widget...
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!widget) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Widget not found</h3>
          <p className="mt-1 text-sm text-gray-500">The widget you're looking for doesn't exist.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/admin')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex h-screen">
        <div className="w-1/2 p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Edit Widget</h1>
            <p className="text-sm text-gray-500">Customize your widget's appearance and behavior</p>
          </div>
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onSave={handleSave}
            saving={saving}
          />
        </div>
        <div className="w-1/2 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">Live Preview</h2>
            <p className="text-sm text-gray-500">See your changes in real-time</p>
          </div>
          <LivePreview widget={widget} settings={settings} />
        </div>
      </div>
    </AdminLayout>
  );
}

