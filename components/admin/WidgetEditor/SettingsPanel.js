import { useState } from 'react';
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
  MagnifyingGlassIcon,
  StarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ColorPicker from './ColorPicker';
import FileUpload from './FileUpload';
import AdvancedSettings from './AdvancedSettings';
import ImageZoomModal from './ImageZoomModal';

export default function SettingsPanel({ settings, onChange, onSave, saving }) {
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

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      <div className="px-6 py-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Widget Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Customize your widget's appearance, behavior, and integration
          </p>
        </div>
        
        <Accordion type="single" collapsible defaultValue="appearance" className="space-y-4">
          <AccordionItem value="appearance" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <PaintBrushIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Appearance Settings */}
              <div className="space-y-8">
                {/* Color Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Color Scheme
                  </h4>
                  
                  <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Primary Theme Color
                    </label>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div
                            className="w-14 h-14 rounded-xl border-2 border-gray-300 dark:border-gray-600 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                            style={{ backgroundColor: settings.appearance?.themeColor || '#3b82f6' }}
                            onClick={() => document.getElementById('themeColor').click()}
                          />
                          <input
                            id="themeColor"
                            type="color"
                            value={settings.appearance?.themeColor || '#3b82f6'}
                            onChange={(e) => handleFieldChange('appearance', 'themeColor', e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-xl"
                          />
                        </div>
                        <input
                          type="text"
                          value={settings.appearance?.themeColor || '#3b82f6'}
                          onChange={(e) => handleFieldChange('appearance', 'themeColor', e.target.value)}
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md transition-shadow"
                          placeholder="#3b82f6"
                        />
                      </div>
                  </div>
                </div>

                {/* Theme Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-green-600" />
                    Theme Mode
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                            className={
                              `p-4 rounded-lg border-2 transition-all duration-200 ` +
                              (
                              settings.appearance?.theme === theme.value
                                  ? `
                                      border-blue-500 
                                      bg-blue-50 text-blue-700 
                                      dark:border-blue-400
                                      dark:bg-blue-950
                                      dark:text-blue-200
                                    `
                                  : `
                                      border-gray-200 
                                      bg-white text-gray-700 
                                      hover:border-gray-300 hover:bg-gray-50
                                      dark:border-gray-700
                                      dark:bg-gray-900
                                      dark:text-gray-200
                                      dark:hover:border-gray-500
                                      dark:hover:bg-gray-800
                                    `
                              )
                            }
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-2">{theme.icon}</div>
                              <div className="font-medium text-sm">{theme.label}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{theme.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <strong>Note:</strong> Theme affects the overall appearance of the widget. 
                      Light theme uses light backgrounds, Dark theme uses dark backgrounds, 
                      and Auto theme follows the user's system preference.
                    </div>
                  </div>
                </div>

                {/* Visual Effects */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Visual Effects
                  </h4>
                  
                  <div className="space-y-4">
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Use Gradient Colors
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable backdrop blur effect
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <PaintBrushIcon className="w-5 h-5 mr-2 text-green-600" />
                    Dimensions & Layout
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        value={settings.appearance?.width || 450}
                        onChange={(e) => handleFieldChange('appearance', 'width', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          validationErrors['appearance.width'] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        min="300"
                        max="800"
                      />
                      {validationErrors['appearance.width'] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['appearance.width']}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        value={settings.appearance?.height || 600}
                        onChange={(e) => handleFieldChange('appearance', 'height', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          validationErrors['appearance.height'] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        min="400"
                        max="800"
                      />
                      {validationErrors['appearance.height'] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['appearance.height']}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Border Radius (px)
                      </label>
                      <input
                        type="number"
                        value={settings.appearance?.borderRadius || 20}
                        onChange={(e) => handleFieldChange('appearance', 'borderRadius', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          validationErrors['appearance.borderRadius']
                            ? 'border-red-300 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        min="0"
                        max="50"
                      />
                      {validationErrors['appearance.borderRadius'] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['appearance.borderRadius']}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Placement
                      </label>
                      <select
                        value={settings.appearance?.placement || 'bottom-right'}
                        onChange={(e) => handleFieldChange('appearance', 'placement', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Animation Speed
                      </label>
                      <select
                        value={settings.appearance?.animationSpeed || 'normal'}
                        onChange={(e) => handleFieldChange('appearance', 'animationSpeed', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="slow">Slow</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom CSS */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
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
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="/* Add custom CSS here */&#10;.widget-container {&#10;  /* Your custom styles */&#10;}"
                    />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Add custom CSS to further customize your widget's appearance. Use classes like <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.widget-container</code> to target specific elements.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="messages" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Messages</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Message Settings */}
              <div className="space-y-8">
                {/* Welcome & Initial Messages */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-green-600" />
                    Welcome & Initial Messages
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Welcome Message
                      </label>
                      <textarea
                        value={settings.messages?.welcomeMessage || ''}
                        onChange={(e) => handleFieldChange('messages', 'welcomeMessage', e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst."
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This message appears when users first open the chat
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Input Placeholder
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.inputPlaceholder || ''}
                        onChange={(e) => handleFieldChange('messages', 'inputPlaceholder', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Skriv en besked her"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Typing Indicator Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.typingText || ''}
                        onChange={(e) => handleFieldChange('messages', 'typingText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="AI tænker..."
                      />
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.messages?.showTypingText !== false}
                          onChange={(e) => handleFieldChange('messages', 'showTypingText', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 shadow-sm focus:border-blue-300 dark:focus:border-blue-600 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Show typing text with dots
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        When disabled, only animated dots will be shown without any text
                      </p>
                    </div>
                  </div>
                </div>

                {/* Popup Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Popup Behavior
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Popup Message
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.popupMessage || ''}
                        onChange={(e) => handleFieldChange('messages', 'popupMessage', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Hej! 👋 Har du brug for hjælp?"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Message shown in the popup bubble when widget is closed
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Banner Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.bannerText || ''}
                        onChange={(e) => handleFieldChange('messages', 'bannerText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="X-Virksomhed står ikke til ansvar for svarene, der kun er vejledende."
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Disclaimer text shown under the header (optional)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Disclaimer Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.disclaimerText || ''}
                        onChange={(e) => handleFieldChange('messages', 'disclaimerText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Opgiv ikke personlige oplysninger"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Warning text shown above the input field
                      </p>
                    </div>

                    {/* Labels Section */}
                    <div className="border-t pt-6 mt-6">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Menu & Conversation Labels
                      </h5>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Ny samtale" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.newConversationLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'newConversationLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Ny samtale"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Label for the "New conversation" button in the menu
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Tidligere samtaler" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.conversationHistoryLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'conversationHistoryLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Tidligere samtaler"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Label for the "Conversation history" button and header
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Samtale indlæst" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.conversationLoadedLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'conversationLoadedLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Samtale indlæst"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Notification message when a conversation is loaded
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "I dag" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.todayLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'todayLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="I dag"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Label for conversations from today
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "I går" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.yesterdayLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'yesterdayLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="I går"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Label for conversations from yesterday
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Days Suffix (for "2d", "3d", etc.)
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.daysAgoSuffix || ''}
                            onChange={(e) => handleFieldChange('messages', 'daysAgoSuffix', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="d"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Suffix for days ago (e.g., "2d" = 2 + "d")
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Beskeder" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.messagesLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'messagesLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="beskeder"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Label for message count (e.g., "5 beskeder")
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Ingen tidligere samtaler" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.noConversationsLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'noConversationsLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Ingen tidligere samtaler"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Message shown when there are no conversations
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Start en samtale..." Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.startConversationLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'startConversationLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Start en samtale for at se den her"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Helper text shown when there are no conversations
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "Samtale slettet" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.conversationDeletedLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'conversationDeletedLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Samtale slettet"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Notification message when a conversation is deleted
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            "New conversation started" Label
                          </label>
                          <input
                            type="text"
                            value={settings.messages?.newConversationStartedLabel || ''}
                            onChange={(e) => handleFieldChange('messages', 'newConversationStartedLabel', e.target.value)}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="New conversation started"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Notification message when a new conversation is started
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Popup Delay (milliseconds)
                      </label>
                      <input
                        type="number"
                        value={settings.messages?.popupDelay || 5000}
                        onChange={(e) => handleFieldChange('messages', 'popupDelay', parseInt(e.target.value))}
                        className={`block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          validationErrors['messages.popupDelay'] ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        min="0"
                        max="30000"
                      />
                      {validationErrors['messages.popupDelay'] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          {validationErrors['messages.popupDelay']}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        How long to wait before showing the popup message (0 = show immediately)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Suggested Responses */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Suggested Responses (Max 5)
                  </h4>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
                            className="flex-1 rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Response
                      </button>
                    )}
                    
                    {/* Max limit notice */}
                    {(settings.messages?.suggestedResponses || ['']).length >= 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Maximum 5 responses reached
                      </p>
                    )}
                  </div>
                </div>

                {/* Behavior Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-orange-600" />
                    Behavior Settings
                  </h4>
                  
                  <div className="space-y-4">
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Auto-close after inactivity
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Close Button Text
                      </label>
                      <input
                        type="text"
                        value={settings.messages?.closeButtonText || 'Close'}
                        onChange={(e) => handleFieldChange('messages', 'closeButtonText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Close"
                      />
                    </div>
                  </div>
                </div>

                {/* Voice Input Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-indigo-600" />
                    Voice Input (Diktering)
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Enable Voice Input */}
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Voice Input
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Allow users to dictate messages using their microphone
                          </p>
              </div>
                        <Switch
                          checked={settings.messages?.voiceInput?.enabled !== false}
                          onChange={(checked) => handleFieldChange('messages', 'voiceInput', {
                            ...settings.messages?.voiceInput,
                            enabled: checked
                          })}
                          className={`${
                            settings.messages?.voiceInput?.enabled !== false ? 'bg-indigo-600' : 'bg-gray-200'
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                        >
                          <span
                            className={`${
                              settings.messages?.voiceInput?.enabled !== false ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>
                      </div>
                    </Switch.Group>

                    {/* Voice Input Configuration */}
                    {settings.messages?.voiceInput?.enabled !== false && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Voice Language
                          </label>
                          <select
                            value={settings.messages?.voiceInput?.language || 'da-DK'}
                            onChange={(e) => handleFieldChange('messages', 'voiceInput', {
                              ...settings.messages?.voiceInput,
                              language: e.target.value
                            })}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="da-DK">Dansk (Danmark)</option>
                            <option value="en-US">English (US)</option>
                            <option value="en-GB">English (UK)</option>
                            <option value="sv-SE">Svenska (Sverige)</option>
                            <option value="no-NO">Norsk (Norge)</option>
                            <option value="de-DE">Deutsch (Deutschland)</option>
                            <option value="fr-FR">Français (France)</option>
                            <option value="es-ES">Español (España)</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Language for speech recognition
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Voice Button Position
                          </label>
                          <select
                            value={settings.messages?.voiceInput?.buttonPosition || 'left'}
                            onChange={(e) => handleFieldChange('messages', 'voiceInput', {
                              ...settings.messages?.voiceInput,
                              buttonPosition: e.target.value
                            })}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="left">Left side of input</option>
                            <option value="right">Right side of input</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Position of the microphone button in the input field
                          </p>
                        </div>

                        <Switch.Group>
                          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Continuous Recording
                              </Switch.Label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Keep recording until manually stopped
                              </p>
                            </div>
                            <Switch
                              checked={settings.messages?.voiceInput?.continuousRecording || false}
                              onChange={(checked) => handleFieldChange('messages', 'voiceInput', {
                                ...settings.messages?.voiceInput,
                                continuousRecording: checked
                              })}
                              className={`${
                                settings.messages?.voiceInput?.continuousRecording ? 'bg-indigo-600' : 'bg-gray-200'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                            >
                              <span
                                className={`${
                                  settings.messages?.voiceInput?.continuousRecording ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </div>
                        </Switch.Group>

                        <Switch.Group>
                          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Auto-send on Complete
                              </Switch.Label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Automatically send message when voice input stops
                              </p>
                            </div>
                            <Switch
                              checked={settings.messages?.voiceInput?.autoSendOnComplete || false}
                              onChange={(checked) => handleFieldChange('messages', 'voiceInput', {
                                ...settings.messages?.voiceInput,
                                autoSendOnComplete: checked
                              })}
                              className={`${
                                settings.messages?.voiceInput?.autoSendOnComplete ? 'bg-indigo-600' : 'bg-gray-200'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                            >
                              <span
                                className={`${
                                  settings.messages?.voiceInput?.autoSendOnComplete ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </div>
                        </Switch.Group>
                      </div>
                    )}

                    {/* Information Panel */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                          <p className="font-medium mb-1">Voice Input Information</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Uses browser's built-in speech recognition</li>
                            <li>• Works best in Chrome, Edge, and Safari</li>
                            <li>• Requires microphone permission from user</li>
                            <li>• Speech is processed locally in the browser</li>
                            <li>• No audio data is sent to our servers</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Image Upload (GPT-4.1 Vision)
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Enable Image Upload */}
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Image Upload
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Allow users to upload images for AI analysis (requires GPT-4.1 or vision-capable model)
                          </p>
                        </div>
                        <Switch
                          checked={settings.imageUpload?.enabled || settings.imageupload?.enabled || false}
                          onChange={(checked) => handleFieldChange('imageupload', 'enabled', checked)}
                          className={`${
                            settings.imageUpload?.enabled || settings.imageupload?.enabled ? 'bg-purple-600' : 'bg-gray-200'
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                        >
                          <span
                            className={`${
                              settings.imageUpload?.enabled || settings.imageupload?.enabled ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>
                      </div>
                    </Switch.Group>

                    {/* Information Panel */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-purple-800 dark:text-purple-300">
                          <p className="font-medium mb-1">Image Upload Information</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Maximum file size: 5MB</li>
                            <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
                            <li>• Images auto-compressed to 1024x1024 for optimal performance</li>
                            <li>• Saves ~73% on API token costs through compression</li>
                            <li>• Images stored securely in Cloudinary CDN</li>
                            <li>• Requires GPT-4.1 or vision-capable model in your OpenAI prompt</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Cards Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-emerald-600" />
                    Product Recommendation Cards
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Enable Product Cards */}
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enable Product Cards
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Allow AI to display product recommendations as visual cards
                          </p>
                        </div>
                        <Switch
                          checked={settings.messages?.productCards?.enabled !== false}
                          onChange={(checked) => handleFieldChange('messages', 'productCards', {
                            ...settings.messages?.productCards,
                            enabled: checked
                          })}
                          className={`${
                            settings.messages?.productCards?.enabled !== false ? 'bg-emerald-600' : 'bg-gray-200'
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                        >
                          <span
                            className={`${
                              settings.messages?.productCards?.enabled !== false ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>
                      </div>
                    </Switch.Group>

                    {/* Product Cards Configuration */}
                    {settings.messages?.productCards?.enabled !== false && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Card Layout
                            </label>
                            <select
                              value={settings.messages?.productCards?.layout || 'horizontal'}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                layout: e.target.value
                              })}
                              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="horizontal">Horizontal Scroll</option>
                              <option value="grid">Grid Layout</option>
                              <option value="vertical">Vertical Stack</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              How product cards are arranged
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Cards per Row
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="4"
                              value={settings.messages?.productCards?.cardsPerRow || 3}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                cardsPerRow: parseInt(e.target.value)
                              })}
                              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Maximum cards per row (for grid layout)
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Card Style
                            </label>
                            <select
                              value={settings.messages?.productCards?.cardStyle || 'standard'}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                cardStyle: e.target.value
                              })}
                              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="minimal">Minimal</option>
                              <option value="standard">Standard</option>
                              <option value="detailed">Detailed</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Visual style of product cards
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Price Currency
                            </label>
                            <input
                              type="text"
                              value={settings.messages?.productCards?.priceCurrency || 'kr.'}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                priceCurrency: e.target.value
                              })}
                              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="kr."
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Default currency symbol
                            </p>
                          </div>
                        </div>

                        <Switch.Group>
                          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Show Price
                              </Switch.Label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Display product prices on cards
                              </p>
                            </div>
                            <Switch
                              checked={settings.messages?.productCards?.showPrice !== false}
                              onChange={(checked) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                showPrice: checked
                              })}
                              className={`${
                                settings.messages?.productCards?.showPrice !== false ? 'bg-emerald-600' : 'bg-gray-200'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                            >
                              <span
                                className={`${
                                  settings.messages?.productCards?.showPrice !== false ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </div>
                        </Switch.Group>

                        <Switch.Group>
                          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                              <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Auto-fetch Product Data
                              </Switch.Label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Automatically fetch product images and details from URLs
                              </p>
                            </div>
                            <Switch
                              checked={settings.messages?.productCards?.autoFetchProductData || false}
                              onChange={(checked) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                autoFetchProductData: checked
                              })}
                              className={`${
                                settings.messages?.productCards?.autoFetchProductData ? 'bg-emerald-600' : 'bg-gray-200'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                            >
                              <span
                                className={`${
                                  settings.messages?.productCards?.autoFetchProductData ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </div>
                        </Switch.Group>
                      </div>
                    )}

                    {/* Information Panel */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-emerald-800 dark:text-emerald-300">
                          <p className="font-medium mb-1">Product Cards Information</p>
                          <ul className="space-y-1 text-xs">
                            <li>• AI can display products using [PRODUCTS] markup format</li>
                            <li>• Cards show product image, name, and price</li>
                            <li>• Cards are clickable links to product pages</li>
                            <li>• Supports multiple layout options</li>
                            <li>• Mobile-responsive with horizontal scroll</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="branding" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <BuildingOfficeIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Branding</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Branding Settings */}
              <div className="space-y-8">
                {/* Company Information */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Company Information
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Widget Title
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.title || ''}
                        onChange={(e) => handleFieldChange('branding', 'title', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Elva AI kundeservice Agent"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Main title displayed in the widget header
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assistant Name
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.assistantName || ''}
                        onChange={(e) => handleFieldChange('branding', 'assistantName', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Elva Assistant"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Name of your AI assistant
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.companyName || ''}
                        onChange={(e) => handleFieldChange('branding', 'companyName', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Elva Solutions"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Your company or organization name
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        "Drevet af" Text
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.poweredByText || ''}
                        onChange={(e) => handleFieldChange('branding', 'poweredByText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Powered by Elva"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Text shown as the attribution line (e.g., "Drevet af Elva")
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        "Tilgængelig nu" Text
                      </label>
                      <input
                        type="text"
                        value={settings.branding?.availableNowText || ''}
                        onChange={(e) => handleFieldChange('branding', 'availableNowText', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Available now"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Text shown when agent is online (e.g., "Tilgængelig nu")
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Assets */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-gray-100">Visual Assets</span>
                  </h4>
                  
                  <div className="space-y-6">
                    <FileUpload
                      currentUrl={settings.branding?.avatarUrl || ''}
                      onUpload={(url) => handleFieldChange('branding', 'avatarUrl', url)}
                      onRemove={() => handleFieldChange('branding', 'avatarUrl', '')}
                      label="Assistant Avatar"
                      aspectRatio="1:1"
                      labelClassName="text-gray-800 dark:text-gray-100"
                    />

                    {/* Avatar Background Color */}
                    <div className="space-y-3">
                      <Switch.Group>
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div>
                            <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Use Avatar Background Color
                            </Switch.Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Show background color behind avatar (even when image is uploaded)
                            </p>
                          </div>
                          <Switch
                            checked={settings.branding?.useAvatarBackgroundColor !== false}
                            onChange={(checked) => handleFieldChange('branding', 'useAvatarBackgroundColor', checked)}
                            className={`${
                              settings.branding?.useAvatarBackgroundColor !== false ? 'bg-blue-600' : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${
                                settings.branding?.useAvatarBackgroundColor !== false ? 'translate-x-6' : 'translate-x-1'
                              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                          </Switch>
                        </div>
                      </Switch.Group>

                      {settings.branding?.useAvatarBackgroundColor !== false && (
                        <div>
                          <ColorPicker
                            label="Avatar Background Color"
                            color={settings.branding?.avatarBackgroundColor || settings.appearance?.themeColor || '#4f46e5'}
                            onChange={(color) => handleFieldChange('branding', 'avatarBackgroundColor', color)}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Background color for avatar circle
                          </p>
                        </div>
                      )}
                    </div>

                    <FileUpload
                      currentUrl={settings.branding?.logoUrl || ''}
                      onUpload={(url) => handleFieldChange('branding', 'logoUrl', url)}
                      onRemove={() => handleFieldChange('branding', 'logoUrl', '')}
                      label="Company Logo"
                      aspectRatio="16:9"
                      labelClassName="text-gray-800 dark:text-gray-100"
                    />

                    {/* Image Zoom Customization */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-3">
                        Image Zoom & Position
                      </label>
                      <button
                        onClick={() => setIsImageZoomModalOpen(true)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-100">Customize Image Zoom</span>
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Adjust zoom level and positioning of uploaded images
                      </p>
                    </div>
                  </div>
                </div>

                {/* Branding Options */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-green-600" />
                    Branding Options
                  </h4>
                  
                  <div className="space-y-4">
                    <Switch.Group>
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div>
                          <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Show branding elements
                          </Switch.Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="satisfaction" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Satisfaction Rating</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Satisfaction Rating Settings */}
              <div className="space-y-8">
                {/* Satisfaction Rating Configuration */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <StarIcon className="w-5 h-5 mr-2 text-yellow-600" />
                    Satisfaction Rating
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Enable Satisfaction Rating */}
                    <div>
                      <Switch.Group>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Enable Satisfaction Rating
                            </Switch.Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Allow users to rate their conversation experience
                            </p>
                          </div>
                          <Switch
                            checked={settings.satisfaction?.enabled !== false}
                            onChange={(checked) => handleFieldChange('satisfaction', 'enabled', checked)}
                            className={`${
                              settings.satisfaction?.enabled !== false ? 'bg-yellow-600' : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${
                                settings.satisfaction?.enabled !== false ? 'translate-x-6' : 'translate-x-1'
                              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                          </Switch>
                        </div>
                      </Switch.Group>
                    </div>

                    {/* Trigger Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Trigger After Messages
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={settings.satisfaction?.triggerAfter || 3}
                          onChange={(e) => handleFieldChange('satisfaction', 'triggerAfter', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="3"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Minimum messages before rating can appear
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Inactivity Delay (seconds)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={settings.satisfaction?.inactivityDelay ? settings.satisfaction.inactivityDelay / 1000 : 30}
                          onChange={(e) => handleFieldChange('satisfaction', 'inactivityDelay', parseInt(e.target.value) * 1000)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="30"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Seconds of inactivity before showing rating
                        </p>
                      </div>
                    </div>

                    {/* Prompt Text */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Rating Prompt Text
                      </label>
                      <input
                        type="text"
                        value={settings.satisfaction?.promptText || 'How would you rate this conversation so far?'}
                        onChange={(e) => handleFieldChange('satisfaction', 'promptText', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="How would you rate this conversation so far?"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The question shown to users when asking for a rating
                      </p>
                    </div>


                    {/* Rating Scale Preview */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Rating Scale
                      </label>
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Poor</span>
                        <div className="flex gap-2">
                          <span className="text-2xl">🙁</span>
                          <span className="text-2xl">😞</span>
                          <span className="text-2xl">😐</span>
                          <span className="text-2xl">😊</span>
                          <span className="text-2xl">🤩</span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Excellent</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        5-point emoji rating scale (not configurable)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Information Panel */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium text-blue-900 mb-2">
                        How Satisfaction Rating Works
                      </h5>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Rating appears as an AI message after the specified inactivity period</li>
                        <li>• Users can rate with emojis and optionally provide text feedback</li>
                        <li>• Ratings are automatically aggregated for analytics</li>
                        <li>• Data helps improve conversation quality and user experience</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="support" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <ClipboardDocumentListIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Support Request</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Manual Review Settings */}
              <div className="space-y-8">
                {/* Manual Review Configuration */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-2 text-red-600" />
                    Manual Review System
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Enable Manual Review */}
                    <div>
                      <Switch.Group>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Enable Support Request
                            </Switch.Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Allow users to request support from your team
                            </p>
                          </div>
                          <Switch
                            checked={settings.manualReview?.enabled !== false}
                            onChange={(checked) => handleFieldChange('manualReview', 'enabled', checked)}
                            className={`${
                              settings.manualReview?.enabled !== false ? 'bg-red-600' : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${
                                settings.manualReview?.enabled !== false ? 'translate-x-6' : 'translate-x-1'
                              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                          </Switch>
                        </div>
                      </Switch.Group>
                    </div>

                    {/* Support Request Settings */}
                    {settings.manualReview?.enabled !== false && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Button Text
                          </label>
                          <input
                            type="text"
                            value={settings.manualReview?.buttonText || 'Request Support'}
                            onChange={(e) => handleFieldChange('manualReview', 'buttonText', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Request Support"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Text displayed on the support request button
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Form Title
                          </label>
                          <input
                            type="text"
                            value={settings.manualReview?.formTitle || 'Request Support'}
                            onChange={(e) => handleFieldChange('manualReview', 'formTitle', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Request Support"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Title displayed at the top of the contact form
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Form Description
                          </label>
                          <textarea
                            value={settings.manualReview?.formDescription || 'Please provide your contact information and describe what you need help with. Our team will review your conversation and get back to you.'}
                            onChange={(e) => handleFieldChange('manualReview', 'formDescription', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Please provide your contact information and describe what you need help with..."
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Description shown above the contact form
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Success Message
                          </label>
                          <textarea
                            value={settings.manualReview?.successMessage || 'Thank you for your request! Our team will review your conversation and contact you within 24 hours.'}
                            onChange={(e) => handleFieldChange('manualReview', 'successMessage', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="Thank you for your request! Our team will review..."
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Message shown after successful submission
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Information Panel */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">How Support Requests Work</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Users can request support from any conversation</li>
                            <li>• Contact form collects name, email, and phone number</li>
                            <li>• Full conversation history is sent to your team</li>
                            <li>• Requests appear in the admin dashboard for review</li>
                            <li>• You can track status: pending, in review, completed</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advanced" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Cog6ToothIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Advanced Settings</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Advanced Settings */}
              <div className="space-y-6">
                <AdvancedSettings settings={settings} onChange={onChange} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="embed" className="border rounded-lg bg-white dark:bg-gray-800">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <CodeBracketIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Embed Code</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Embed Code Settings */}
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <CodeBracketIcon className="w-6 h-6 mr-2" />
                    Widget Integration
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-6">
                    Copy the code below and add it to your website before the closing &lt;/body&gt; tag.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Widget ID
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={settings._id || 'widget-id'}
                          readOnly
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm font-mono text-gray-900 dark:text-gray-100"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Embed Code
                      </label>
                      <div className="relative">
                        <textarea
                          readOnly
                          value={`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm font-mono resize-none text-gray-900 dark:text-gray-100"
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
        themeColor={settings.appearance?.themeColor || settings.theme?.buttonColor}
        avatarBackgroundColor={settings.branding?.avatarBackgroundColor}
        useAvatarBackgroundColor={settings.branding?.useAvatarBackgroundColor !== false}
      />
    </div>
  );
}
