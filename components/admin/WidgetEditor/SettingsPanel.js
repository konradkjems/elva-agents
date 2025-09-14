import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { Switch } from '@headlessui/react';
import { 
  PaintBrushIcon, 
  ChatBubbleLeftRightIcon, 
  BuildingOfficeIcon, 
  Cog6ToothIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import ColorPicker from './ColorPicker';
import FileUpload from './FileUpload';
import AdvancedSettings from './AdvancedSettings';
import ImageZoomModal from './ImageZoomModal';

export default function SettingsPanel({ settings, onChange, onSave, saving }) {
  const [activeTab, setActiveTab] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [isImageZoomModalOpen, setIsImageZoomModalOpen] = useState(false);

  const updateSetting = (section, key, value) => {
    // Clear validation error when user makes changes
    if (validationErrors[`${section}.${key}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${key}`];
        return newErrors;
      });
    }

    onChange({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  const validateField = (section, key, value) => {
    const fieldId = `${section}.${key}`;
    
    // Basic validation rules
    if (key === 'width' && (value < 300 || value > 800)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Width must be between 300 and 800 pixels'
      }));
      return false;
    }
    
    if (key === 'height' && (value < 400 || value > 800)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Height must be between 400 and 800 pixels'
      }));
      return false;
    }
    
    if (key === 'borderRadius' && (value < 0 || value > 50)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Border radius must be between 0 and 50 pixels'
      }));
      return false;
    }
    
    if (key === 'popupDelay' && (value < 0 || value > 30000)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Popup delay must be between 0 and 30000 milliseconds'
      }));
      return false;
    }
    
    return true;
  };

  const handleFieldChange = (section, key, value) => {
    validateField(section, key, value);
    updateSetting(section, key, value);
  };

  const tabs = [
    { id: 0, name: 'Appearance', icon: PaintBrushIcon, color: 'blue' },
    { id: 1, name: 'Messages', icon: ChatBubbleLeftRightIcon, color: 'green' },
    { id: 2, name: 'Branding', icon: BuildingOfficeIcon, color: 'purple' },
    { id: 3, name: 'Advanced', icon: Cog6ToothIcon, color: 'orange' },
    { id: 4, name: 'Embed Code', icon: CodeBracketIcon, color: 'indigo' }
  ];

  return (
    <div className="h-full bg-white">
      <div className="px-6 py-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Widget Settings
          </h3>
          <p className="text-sm text-gray-500">
            Customize your widget's appearance, behavior, and integration
          </p>
        </div>
        
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6">
            {tabs.map((tab) => (
              <Tab key={tab.id} className={({ selected }) =>
                `flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selected 
                    ? `bg-white text-${tab.color}-700 shadow-sm border border-${tab.color}-200` 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`
              }>
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          
          <Tab.Panels className="overflow-y-auto max-h-[calc(100vh-300px)]">
            <Tab.Panel>
              {/* Appearance Settings */}
              <div className="space-y-8">
                {/* Color Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Color Scheme
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Primary Theme Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                          style={{ backgroundColor: settings.appearance?.themeColor || '#3b82f6' }}
                          onClick={() => document.getElementById('themeColor').click()}
                        />
                        <input
                          id="themeColor"
                          type="color"
                          value={settings.appearance?.themeColor || '#3b82f6'}
                          onChange={(e) => handleFieldChange('appearance', 'themeColor', e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                          style={{ opacity: 0, position: 'absolute', zIndex: 1 }}
                        />
                        <input
                          type="text"
                          value={settings.appearance?.themeColor || '#3b82f6'}
                          onChange={(e) => handleFieldChange('appearance', 'themeColor', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Secondary Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                          style={{ backgroundColor: settings.appearance?.secondaryColor || '#8b5cf6' }}
                          onClick={() => document.getElementById('secondaryColor').click()}
                        />
                        <input
                          id="secondaryColor"
                          type="color"
                          value={settings.appearance?.secondaryColor || '#8b5cf6'}
                          onChange={(e) => handleFieldChange('appearance', 'secondaryColor', e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                          style={{ opacity: 0, position: 'absolute', zIndex: 1 }}
                        />
                        <input
                          type="text"
                          value={settings.appearance?.secondaryColor || '#8b5cf6'}
                          onChange={(e) => handleFieldChange('appearance', 'secondaryColor', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Theme Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-green-600" />
                    Theme Mode
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Widget Theme
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', label: 'Light', icon: '☀️', description: 'Clean light theme' },
                          { value: 'dark', label: 'Dark', icon: '🌙', description: 'Dark mode theme' },
                          { value: 'auto', label: 'Auto', icon: '🔄', description: 'Follows system preference' }
                        ].map((theme) => (
                          <button
                            key={theme.value}
                            type="button"
                            onClick={() => handleFieldChange('appearance', 'theme', theme.value)}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                              settings.appearance?.theme === theme.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-2">{theme.icon}</div>
                              <div className="font-medium text-sm">{theme.label}</div>
                              <div className="text-xs text-gray-500 mt-1">{theme.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                      <strong>Note:</strong> Theme affects the overall appearance of the widget. 
                      Light theme uses light backgrounds, Dark theme uses dark backgrounds, 
                      and Auto theme follows the user's system preference.
                    </div>
                  </div>
                </div>

                {/* Visual Effects */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Visual Effects
                  </h4>
                  
                  <div className="space-y-4">
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700">
                            Use Gradient Colors
                          </Switch.Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Creates a smooth gradient between primary and secondary colors
                          </p>
                        </div>
                        <Switch
                          checked={settings.appearance?.useGradient !== false}
                          onChange={(checked) => handleFieldChange('appearance', 'useGradient', checked)}
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

                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700">
                            Enable backdrop blur effect
                          </Switch.Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Adds a subtle blur effect behind the widget
                          </p>
                        </div>
                        <Switch
                          checked={settings.appearance?.backdropBlur || false}
                          onChange={(checked) => handleFieldChange('appearance', 'backdropBlur', checked)}
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
                </div>

                {/* Dimensions */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-green-600" />
                    Dimensions & Layout
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        value={settings.appearance?.width || 450}
                        onChange={(e) => handleFieldChange('appearance', 'width', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${
                          validationErrors['appearance.width'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        min="300"
                        max="800"
                      />
                      {validationErrors['appearance.width'] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['appearance.width']}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        value={settings.appearance?.height || 600}
                        onChange={(e) => handleFieldChange('appearance', 'height', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${
                          validationErrors['appearance.height'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        min="400"
                        max="800"
                      />
                      {validationErrors['appearance.height'] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['appearance.height']}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Border Radius (px)
                      </label>
                      <input
                        type="number"
                        value={settings.appearance?.borderRadius || 20}
                        onChange={(e) => handleFieldChange('appearance', 'borderRadius', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${
                          validationErrors['appearance.borderRadius'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        min="0"
                        max="50"
                      />
                      {validationErrors['appearance.borderRadius'] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['appearance.borderRadius']}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Placement
                      </label>
                      <select
                        value={settings.appearance?.placement || 'bottom-right'}
                        onChange={(e) => handleFieldChange('appearance', 'placement', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
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
                        onChange={(e) => handleFieldChange('appearance', 'animationSpeed', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      >
                        <option value="slow">Slow</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom CSS */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CodeBracketIcon className="w-5 h-5 mr-2 text-indigo-600" />
                    Custom Styling
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom CSS
                    </label>
                    <textarea
                      value={settings.appearance?.customCSS || ''}
                      onChange={(e) => handleFieldChange('appearance', 'customCSS', e.target.value)}
                      rows={6}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm font-mono text-xs"
                      placeholder="/* Add custom CSS here */&#10;.widget-container {&#10;  /* Your custom styles */&#10;}"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Add custom CSS to further customize your widget's appearance. Use classes like <code className="bg-gray-200 px-1 rounded">.widget-container</code> to target specific elements.
                    </p>
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Message Settings */}
              <div className="space-y-8">
                {/* Welcome & Initial Messages */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-green-600" />
                    Welcome & Initial Messages
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Welcome Message
                      </label>
                      <textarea
                        value={settings.messages?.welcomeMessage || ''}
                        onChange={(e) => handleFieldChange('messages', 'welcomeMessage', e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This message appears when users first open the chat
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Placeholder
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.inputPlaceholder || ''}
                        onChange={(e) => handleFieldChange('messages', 'inputPlaceholder', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
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
                        onChange={(e) => handleFieldChange('messages', 'typingText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="AI tænker..."
                      />
                    </div>
                  </div>
                </div>

                {/* Popup Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Popup Behavior
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Popup Message
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.popupMessage || ''}
                        onChange={(e) => handleFieldChange('messages', 'popupMessage', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Hej! 👋 Har du brug for hjælp?"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Message shown in the popup bubble when widget is closed
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.bannerText || ''}
                        onChange={(e) => handleFieldChange('messages', 'bannerText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="X-Virksomhed står ikke til ansvar for svarene, der kun er vejledende."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Disclaimer text shown under the header (optional)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disclaimer Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.disclaimerText || ''}
                        onChange={(e) => handleFieldChange('messages', 'disclaimerText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Opgiv ikke personlige oplysninger"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Warning text shown above the input field
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Popup Delay (milliseconds)
                      </label>
                      <input
                        type="number"
                        value={settings.messages?.popupDelay || 5000}
                        onChange={(e) => handleFieldChange('messages', 'popupDelay', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${
                          validationErrors['messages.popupDelay'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        min="0"
                        max="30000"
                      />
                      {validationErrors['messages.popupDelay'] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['messages.popupDelay']}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        How long to wait before showing the popup message (0 = show immediately)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Suggested Responses */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Suggested Responses (Max 5)
                  </h4>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                      These quick response buttons appear when the chat starts
                    </p>
                    
                    {/* Suggested Responses List */}
                    <div className="space-y-2">
                      {(settings.messages?.suggestedResponses || ['']).map((response, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={response}
                            onChange={(e) => {
                              const responses = [...(settings.messages?.suggestedResponses || [''])];
                              responses[index] = e.target.value;
                              handleFieldChange('messages', 'suggestedResponses', responses);
                            }}
                            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm px-3 py-2"
                            placeholder={`Suggested response ${index + 1}...`}
                          />
                          {(settings.messages?.suggestedResponses || ['']).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const responses = [...(settings.messages?.suggestedResponses || [''])];
                                responses.splice(index, 1);
                                handleFieldChange('messages', 'suggestedResponses', responses);
                              }}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Response Button */}
                    {(settings.messages?.suggestedResponses || ['']).length < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const responses = [...(settings.messages?.suggestedResponses || ['']), ''];
                          handleFieldChange('messages', 'suggestedResponses', responses);
                        }}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Response
                      </button>
                    )}
                    
                    {/* Max limit notice */}
                    {(settings.messages?.suggestedResponses || ['']).length >= 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        Maximum 5 responses reached
                      </p>
                    )}
                  </div>
                </div>

                {/* Behavior Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-orange-600" />
                    Behavior Settings
                  </h4>
                  
                  <div className="space-y-4">
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700">
                            Auto-close after inactivity
                          </Switch.Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Automatically close the chat widget after a period of inactivity
                          </p>
                        </div>
                        <Switch
                          checked={settings.messages?.autoClose || false}
                          onChange={(checked) => handleFieldChange('messages', 'autoClose', checked)}
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Close Button Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.closeButtonText || 'Close'}
                        onChange={(e) => handleFieldChange('messages', 'closeButtonText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Close"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Branding Settings */}
              <div className="space-y-8">
                {/* Company Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Company Information
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Widget Title
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.title || ''}
                        onChange={(e) => handleFieldChange('branding', 'title', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Elva AI kundeservice Agent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Main title displayed in the widget header
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assistant Name
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.assistantName || ''}
                        onChange={(e) => handleFieldChange('branding', 'assistantName', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Elva Assistant"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Name of your AI assistant
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.companyName || ''}
                        onChange={(e) => handleFieldChange('branding', 'companyName', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        placeholder="Elva Solutions"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Your company or organization name
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Assets */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Visual Assets
                  </h4>
                  
                  <div className="space-y-6">
                    <FileUpload
                      currentUrl={settings.branding?.avatarUrl || ''}
                      onUpload={(url) => handleFieldChange('branding', 'avatarUrl', url)}
                      onRemove={() => handleFieldChange('branding', 'avatarUrl', '')}
                      label="Assistant Avatar"
                      aspectRatio="1:1"
                    />

                    <FileUpload
                      currentUrl={settings.branding?.logoUrl || ''}
                      onUpload={(url) => handleFieldChange('branding', 'logoUrl', url)}
                      onRemove={() => handleFieldChange('branding', 'logoUrl', '')}
                      label="Company Logo"
                      aspectRatio="16:9"
                    />

                    {/* Image Zoom Customization */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Image Zoom & Position
                      </label>
                      <button
                        onClick={() => setIsImageZoomModalOpen(true)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Customize Image Zoom</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Adjust zoom level and positioning of uploaded images
                      </p>
                    </div>
                  </div>
                </div>

                {/* Branding Options */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-green-600" />
                    Branding Options
                  </h4>
                  
                  <div className="space-y-4">
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700">
                            Show branding elements
                          </Switch.Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Display company logo and branding in the widget
                          </p>
                        </div>
                        <Switch
                          checked={settings.branding?.showBranding !== false}
                          onChange={(checked) => handleFieldChange('branding', 'showBranding', checked)}
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
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
                    <CodeBracketIcon className="w-6 h-6 mr-2" />
                    Widget Integration
                  </h3>
                  <p className="text-sm text-blue-700 mb-6">
                    Copy the code below and add it to your website before the closing &lt;/body&gt; tag.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Widget ID
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={settings._id || 'widget-id'}
                          readOnly
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(settings._id || 'widget-id')}
                          className="px-4 py-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                          Copy ID
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Embed Code
                      </label>
                      <div className="relative">
                        <textarea
                          readOnly
                          value={`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
                        />
                        <button
                          onClick={() => {
                            const code = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`;
                            navigator.clipboard.writeText(code);
                          }}
                          className="absolute top-3 right-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <DocumentDuplicateIcon className="w-3 h-3 mr-1" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Integration Steps
                    </h4>
                    <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
                      <li>Copy the embed code above</li>
                      <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
                      <li>Save and publish your website</li>
                      <li>The chat widget will appear in the bottom-right corner</li>
                    </ol>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-900 mb-3 flex items-center">
                      <InformationCircleIcon className="w-5 h-5 mr-2" />
                      Pro Tips
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
                      <li>Test the widget on a staging site first</li>
                      <li>Make sure your domain is whitelisted in OpenAI settings</li>
                      <li>The widget automatically adapts to mobile devices</li>
                      <li>Changes to widget settings take effect immediately</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={isImageZoomModalOpen}
        onClose={() => setIsImageZoomModalOpen(false)}
        imageSettings={settings.branding?.imageSettings || {
          avatarZoom: 1.0,
          avatarOffsetX: 0,
          avatarOffsetY: 0,
          logoZoom: 1.0,
          logoOffsetX: 0,
          logoOffsetY: 0
        }}
        onSave={(imageSettings) => {
          // Update settings directly to ensure imageSettings are saved
          console.log('Saving imageSettings:', imageSettings);
          onChange({
            ...settings,
            branding: {
              ...settings.branding,
              imageSettings: imageSettings
            }
          });
        }}
        widgetName={settings.name}
        brandingTitle={settings.branding?.title}
        avatarUrl={settings.branding?.avatarUrl}
        logoUrl={settings.branding?.logoUrl}
      />
    </div>
  );
}
