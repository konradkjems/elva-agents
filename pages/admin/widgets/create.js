import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/Layout';

export default function CreateWidget() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    openai: {
      promptId: '',
      version: '26',
      model: 'gpt-4o-mini'
    },
    appearance: {
      theme: 'light',
      themeColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      width: 450,
      height: 600,
      placement: 'bottom-right',
      borderRadius: 20,
      shadow: '0 20px 60px rgba(0,0,0,0.15)',
      backdropBlur: true,
      animationSpeed: 'normal',
      customCSS: '',
      useGradient: true
    },
    messages: {
      welcomeMessage: 'Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.',
      inputPlaceholder: 'Skriv en besked her',
      typingText: 'AI tænker...',
      suggestedResponses: [
        'Hvad er fordelene ved at bruge Elva Solutions?',
        'Hvad koster det at få en AI-Agent?',
        'Kan jeg prøve det gratis?',
        'Hvordan kan jeg få en AI til min virksomhed?'
      ],
      popupMessage: 'Hej! 👋 Har du brug for hjælp?',
      popupDelay: 5000,
      autoClose: false,
      closeButtonText: 'Close'
    },
    branding: {
      title: 'Elva AI kundeservice Agent',
      assistantName: 'Elva Assistant',
      avatarUrl: '',
      logoUrl: '',
      companyName: 'Elva Solutions',
      customLogo: false,
      showBranding: true
    },
    advanced: {
      showCloseButton: true,
      showConversationHistory: true,
      showNewChatButton: true,
      enableAnalytics: true,
      trackEvents: ['message_sent', 'conversation_started', 'widget_opened'],
      conversationRetention: 30,
      maxConversations: 100,
      language: 'da',
      timezone: 'Europe/Copenhagen'
    },
    analytics: {
      totalConversations: 0,
      totalMessages: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      lastActivity: new Date(),
      monthlyStats: {}
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (section, key, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create widget');
      }

      const newWidget = await response.json();
      router.push(`/admin/widgets/${newWidget._id}`);
    } catch (error) {
      console.error('Error creating widget:', error);
      setError('Failed to create widget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Widget</h1>
          <p className="mt-2 text-sm text-gray-600">
            Set up a new AI chat widget with your preferred settings
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Widget Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', 'name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="My Customer Service Widget"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.branding.companyName}
                  onChange={(e) => handleInputChange('branding', 'companyName', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Your Company"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', 'description', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Describe what this widget will be used for..."
                />
              </div>
            </div>
          </div>

          {/* OpenAI Configuration */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">OpenAI Configuration</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Prompt ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.openai.promptId}
                  onChange={(e) => handleInputChange('openai', 'promptId', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="pmpt_..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.openai.version}
                  onChange={(e) => handleInputChange('openai', 'version', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="26"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Model
                </label>
                <select
                  value={formData.openai.model}
                  onChange={(e) => handleInputChange('openai', 'model', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Settings</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Theme Color
                </label>
                <input
                  type="color"
                  value={formData.appearance.themeColor}
                  onChange={(e) => handleInputChange('appearance', 'themeColor', e.target.value)}
                  className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Placement
                </label>
                <select
                  value={formData.appearance.placement}
                  onChange={(e) => handleInputChange('appearance', 'placement', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Widget Title
                </label>
                <input
                  type="text"
                  value={formData.branding.title}
                  onChange={(e) => handleInputChange('branding', 'title', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="AI Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Welcome Message
                </label>
                <input
                  type="text"
                  value={formData.messages.welcomeMessage}
                  onChange={(e) => handleInputChange('messages', 'welcomeMessage', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Hello! How can I help you?"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Creating...' : 'Create Widget'}
            </button>
          </div>
        </form>
        
        {/* Embed Code Preview */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">🚀 Widget Integration Preview</h3>
          <p className="text-sm text-blue-700 mb-4">
            Once you create the widget, you'll be able to copy the embed code and add it to your website.
          </p>
          
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Embed Code Preview:</h4>
            <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
              <pre>{`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/WIDGET_ID"></script>`}</pre>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Replace WIDGET_ID with your actual widget ID after creation.
            </p>
          </div>
          
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-medium text-green-900 mb-2">✅ After Creation:</h4>
            <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
              <li>Go to the widget editor</li>
              <li>Click on the "Embed Code" tab</li>
              <li>Copy the generated embed code</li>
              <li>Add it to your website before the closing &lt;/body&gt; tag</li>
            </ol>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
