import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { Switch } from '@headlessui/react';
import ColorPicker from './ColorPicker';
import FileUpload from './FileUpload';
import AdvancedSettings from './AdvancedSettings';

export default function SettingsPanel({ settings, onChange, onSave, saving }) {
  const [activeTab, setActiveTab] = useState(0);

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
    <div className="h-full bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Widget Settings
        </h3>
        
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Appearance
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Messages
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Branding
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Advanced
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Embed Code
            </Tab>
          </Tab.List>
          
          <Tab.Panels className="mt-4">
            <Tab.Panel>
              {/* Appearance Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Color
                  </label>
                  <input
                    type="color"
                    value={settings.appearance?.themeColor || '#3b82f6'}
                    onChange={(e) => updateSetting('appearance', 'themeColor', e.target.value)}
                    className="block w-full h-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={settings.appearance?.secondaryColor || '#8b5cf6'}
                    onChange={(e) => updateSetting('appearance', 'secondaryColor', e.target.value)}
                    className="block w-full h-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <Switch.Group>
                    <div className="flex items-center justify-between">
                      <Switch.Label className="text-sm font-medium text-gray-700">
                        Use Gradient Colors
                      </Switch.Label>
                      <Switch
                        checked={settings.appearance?.useGradient !== false}
                        onChange={(checked) => updateSetting('appearance', 'useGradient', checked)}
                        className={`${
                          settings.appearance?.useGradient !== false ? 'bg-blue-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.appearance?.useGradient !== false ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Switch.Group>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={settings.appearance?.width || 450}
                    onChange={(e) => updateSetting('appearance', 'width', parseInt(e.target.value))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="300"
                    max="800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={settings.appearance?.height || 600}
                    onChange={(e) => updateSetting('appearance', 'height', parseInt(e.target.value))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="400"
                    max="800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Radius (px)
                  </label>
                  <input
                    type="number"
                    value={settings.appearance?.borderRadius || 20}
                    onChange={(e) => updateSetting('appearance', 'borderRadius', parseInt(e.target.value))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Placement
                  </label>
                  <select
                    value={settings.appearance?.placement || 'bottom-right'}
                    onChange={(e) => updateSetting('appearance', 'placement', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animation Speed
                  </label>
                  <select
                    value={settings.appearance?.animationSpeed || 'normal'}
                    onChange={(e) => updateSetting('appearance', 'animationSpeed', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>

                <div>
                  <Switch.Group>
                    <div className="flex items-center justify-between">
                      <Switch.Label className="text-sm font-medium text-gray-700">
                        Enable backdrop blur effect
                      </Switch.Label>
                      <Switch
                        checked={settings.appearance?.backdropBlur || false}
                        onChange={(checked) => updateSetting('appearance', 'backdropBlur', checked)}
                        className={`${
                          settings.appearance?.backdropBlur ? 'bg-blue-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.appearance?.backdropBlur ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Switch.Group>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom CSS
                  </label>
                  <textarea
                    value={settings.appearance?.customCSS || ''}
                    onChange={(e) => updateSetting('appearance', 'customCSS', e.target.value)}
                    rows={4}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono text-xs"
                    placeholder="/* Add custom CSS here */"
                  />
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Message Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    value={settings.messages?.welcomeMessage || ''}
                    onChange={(e) => updateSetting('messages', 'welcomeMessage', e.target.value)}
                    rows={3}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={settings.messages?.inputPlaceholder || ''}
                    onChange={(e) => updateSetting('messages', 'inputPlaceholder', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Skriv en besked her"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typing Indicator Text
                  </label>
                  <input
                    type="text"
                    value={settings.messages?.typingText || ''}
                    onChange={(e) => updateSetting('messages', 'typingText', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="AI tænker..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Popup Message
                  </label>
                  <input
                    type="text"
                    value={settings.messages?.popupMessage || ''}
                    onChange={(e) => updateSetting('messages', 'popupMessage', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Hej! 👋 Har du brug for hjælp?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Popup Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={settings.messages?.popupDelay || 5000}
                    onChange={(e) => updateSetting('messages', 'popupDelay', parseInt(e.target.value))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="0"
                    max="30000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suggested Responses
                  </label>
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type="text"
                        value={settings.messages?.suggestedResponses?.[index] || ''}
                        onChange={(e) => {
                          const responses = [...(settings.messages?.suggestedResponses || [])];
                          responses[index] = e.target.value;
                          updateSetting('messages', 'suggestedResponses', responses);
                        }}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder={`Foreslået svar ${index + 1}...`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Switch.Group>
                    <div className="flex items-center justify-between">
                      <Switch.Label className="text-sm font-medium text-gray-700">
                        Auto-close after inactivity
                      </Switch.Label>
                      <Switch
                        checked={settings.messages?.autoClose || false}
                        onChange={(checked) => updateSetting('messages', 'autoClose', checked)}
                        className={`${
                          settings.messages?.autoClose ? 'bg-blue-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.messages?.autoClose ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Switch.Group>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Close Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.messages?.closeButtonText || 'Close'}
                    onChange={(e) => updateSetting('messages', 'closeButtonText', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Close"
                  />
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Branding Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Widget Title
                  </label>
                  <input
                    type="text"
                    value={settings.branding?.title || ''}
                    onChange={(e) => updateSetting('branding', 'title', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Elva AI kundeservice Agent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assistant Name
                  </label>
                  <input
                    type="text"
                    value={settings.branding?.assistantName || ''}
                    onChange={(e) => updateSetting('branding', 'assistantName', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Elva Assistant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.branding?.companyName || ''}
                    onChange={(e) => updateSetting('branding', 'companyName', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Elva Solutions"
                  />
                </div>

                <FileUpload
                  currentUrl={settings.branding?.avatarUrl || ''}
                  onUpload={(url) => updateSetting('branding', 'avatarUrl', url)}
                  onRemove={() => updateSetting('branding', 'avatarUrl', '')}
                  label="Assistant Avatar"
                  aspectRatio="1:1"
                />

                <FileUpload
                  currentUrl={settings.branding?.logoUrl || ''}
                  onUpload={(url) => updateSetting('branding', 'logoUrl', url)}
                  onRemove={() => updateSetting('branding', 'logoUrl', '')}
                  label="Company Logo"
                  aspectRatio="16:9"
                />

                <div>
                  <Switch.Group>
                    <div className="flex items-center justify-between">
                      <Switch.Label className="text-sm font-medium text-gray-700">
                        Show branding
                      </Switch.Label>
                      <Switch
                        checked={settings.branding?.showBranding !== false}
                        onChange={(checked) => updateSetting('branding', 'showBranding', checked)}
                        className={`${
                          settings.branding?.showBranding !== false ? 'bg-blue-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            settings.branding?.showBranding !== false ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                      </Switch>
                    </div>
                  </Switch.Group>
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Advanced Settings */}
              <div className="space-y-6">
                <AdvancedSettings settings={settings} onChange={onChange} />
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Embed Code Settings */}
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">🚀 Widget Integration</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Copy the code below and add it to your website before the closing &lt;/body&gt; tag.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Widget ID
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={settings._id || 'widget-id'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(settings._id || 'widget-id')}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                        >
                          📋 Copy ID
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Embed Code
                      </label>
                      <div className="relative">
                        <textarea
                          readOnly
                          value={`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono resize-none"
                        />
                        <button
                          onClick={() => {
                            const code = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`;
                            navigator.clipboard.writeText(code);
                          }}
                          className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-medium text-green-900 mb-2">✅ Integration Steps:</h4>
                      <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                        <li>Copy the embed code above</li>
                        <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                        <li>Save and publish your website</li>
                        <li>The chat widget will appear in the bottom-right corner</li>
                      </ol>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <h4 className="font-medium text-yellow-900 mb-2">💡 Pro Tips:</h4>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>Test the widget on a staging site first</li>
                        <li>Make sure your domain is whitelisted in OpenAI settings</li>
                        <li>The widget automatically adapts to mobile devices</li>
                        <li>Changes to widget settings take effect immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className={`inline-flex justify-center rounded-lg border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
              saving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
