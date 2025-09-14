import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/Layout';
import LivePreview from '../../../../components/admin/WidgetEditor/LivePreview';
import SettingsPanel from '../../../../components/admin/WidgetEditor/SettingsPanel';
import { 
  ArrowLeftIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

export default function WidgetEditor() {
  const router = useRouter();
  const { id } = router.query;
  const [widget, setWidget] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWidget();
    } else if (router.isReady) {
      // If router is ready but no id, set loading to false
      setLoading(false);
    }
  }, [id, router.isReady]);

  useEffect(() => {
    // Track unsaved changes
    if (widget && JSON.stringify(widget) !== JSON.stringify(settings)) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [widget, settings]);

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
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    
    console.log('Saving widget with settings:', settings);
    console.log('Branding imageSettings:', settings.branding?.imageSettings);
    
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
      setSaveStatus('success');
      setHasUnsavedChanges(false);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save widget:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmbedCode = () => {
    const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`;
    navigator.clipboard.writeText(embedCode);
    setShowEmbedModal(true);
    setTimeout(() => setShowEmbedModal(false), 2000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="inline-flex items-center px-6 py-3 font-semibold leading-6 text-sm shadow-lg rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 transition ease-in-out duration-150">
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
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Widget not found</h3>
          <p className="text-sm text-gray-500 mb-8">The widget you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {settings.branding?.title || 'Widget Editor'}
              </h1>
              <p className="text-sm text-gray-500">
                Customize your widget's appearance and behavior
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Save Status Indicator */}
            {saveStatus && (
              <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                saveStatus === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {saveStatus === 'success' ? (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Saved successfully!
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                    Save failed
                  </>
                )}
              </div>
            )}
            
            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && !saveStatus && (
              <div className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                Unsaved changes
              </div>
            )}
            
            {/* Embed Code Button */}
            <button
              onClick={handleCopyEmbedCode}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Embed Code
            </button>
            
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                saving || !hasUnsavedChanges
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Settings Panel */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onSave={handleSave}
            saving={saving}
          />
        </div>
        
        {/* Preview Panel */}
        <div className="w-1/2 bg-gray-50 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Live Preview</h2>
              <p className="text-sm text-gray-500">
                See your changes in real-time. Click the chat button to test interactions.
              </p>
            </div>
            <LivePreview widget={widget} settings={settings} />
          </div>
        </div>
      </div>

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Embed Code Copied!
            </h3>
            <p className="text-sm text-gray-500 text-center">
              The embed code has been copied to your clipboard. Paste it before the closing &lt;/body&gt; tag on your website.
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  }
}

