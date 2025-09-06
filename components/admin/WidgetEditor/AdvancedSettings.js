import { useState } from 'react';

export default function AdvancedSettings({ settings, onChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateSetting = (section, key, value) => {
    onChange({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-900">Advanced Settings</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Widget Behavior */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Widget Behavior</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.advanced?.showCloseButton ?? true}
                  onChange={(e) => updateSetting('advanced', 'showCloseButton', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show close button</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.advanced?.showConversationHistory ?? true}
                  onChange={(e) => updateSetting('advanced', 'showConversationHistory', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show conversation history</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.advanced?.showNewChatButton ?? true}
                  onChange={(e) => updateSetting('advanced', 'showNewChatButton', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show new chat button</span>
              </label>
            </div>
          </div>

          {/* Analytics */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Analytics & Tracking</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.advanced?.enableAnalytics ?? true}
                  onChange={(e) => updateSetting('advanced', 'enableAnalytics', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable analytics tracking</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Track Events
                </label>
                <div className="space-y-2">
                  {['message_sent', 'conversation_started', 'widget_opened', 'conversation_closed'].map((event) => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.advanced?.trackEvents?.includes(event) ?? true}
                        onChange={(e) => {
                          const events = settings.advanced?.trackEvents || [];
                          const newEvents = e.target.checked
                            ? [...events, event]
                            : events.filter(e => e !== event);
                          updateSetting('advanced', 'trackEvents', newEvents);
                        }}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {event.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Data Management</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Conversation Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.advanced?.conversationRetention ?? 30}
                  onChange={(e) => updateSetting('advanced', 'conversationRetention', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Conversations
                </label>
                <input
                  type="number"
                  value={settings.advanced?.maxConversations ?? 100}
                  onChange={(e) => updateSetting('advanced', 'maxConversations', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          </div>

          {/* Localization */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Localization</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <select
                  value={settings.advanced?.language ?? 'da'}
                  onChange={(e) => updateSetting('advanced', 'language', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="da">Dansk</option>
                  <option value="en">English</option>
                  <option value="auto">Auto (Browser)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  value={settings.advanced?.timezone ?? 'Europe/Copenhagen'}
                  onChange={(e) => updateSetting('advanced', 'timezone', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="Europe/Copenhagen">Europe/Copenhagen</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

