import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ImageZoomModal({ isOpen, onClose, imageSettings, onSave, widgetName, brandingTitle, avatarUrl, logoUrl, themeColor }) {
  const [activeTab, setActiveTab] = useState('avatar');
  const [localSettings, setLocalSettings] = useState({
    avatarZoom: 1.0,
    avatarOffsetX: 0,
    avatarOffsetY: 0,
    logoZoom: 1.0,
    logoOffsetX: 0,
    logoOffsetY: 0
  });

  // Helper function to generate smart AI icon
  const generateAIIcon = (widgetName, brandingTitle) => {
    const name = brandingTitle || widgetName || 'AI';
    
    if (name.includes(' ')) {
      const words = name.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return words[0][0].toUpperCase() + words[1][0].toUpperCase();
      }
    }
    
    return name[0]?.toUpperCase() || 'A';
  };

  useEffect(() => {
    if (isOpen && imageSettings) {
      setLocalSettings(imageSettings);
    }
  }, [isOpen, imageSettings]);

  const handleSettingChange = (settingType, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [settingType]: parseFloat(value)
    }));
  };

  const handleSave = () => {
    console.log('ImageZoomModal handleSave called with:', localSettings);
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings({
      avatarZoom: 1.0,
      avatarOffsetX: 0,
      avatarOffsetY: 0,
      logoZoom: 1.0,
      logoOffsetX: 0,
      logoOffsetY: 0
    });
  };

  if (!isOpen) return null;
  
  console.log('ImageZoomModal is open with settings:', localSettings);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Adjust Images</h2>
            <p className="text-sm text-gray-500 mt-1">
              <strong>Avatar:</strong> The assistant's profile picture in chat messages • 
              <strong> Logo:</strong> Your company logo in the widget header and when minimized
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('logo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logo (Header & Minimized)
            </button>
            <button
              onClick={() => setActiveTab('avatar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'avatar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Avatar (Chat Messages)
            </button>
            <button
              onClick={() => setActiveTab('widget')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'widget'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Widget
            </button>
          </nav>
        </div>

        <div className="flex h-[calc(90vh-240px)] overflow-hidden">
          {/* Preview Panel */}
          <div className="w-1/2 p-6 border-r border-gray-200">
            {activeTab === 'avatar' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Avatar Preview</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This is how your assistant's avatar will appear in chat messages next to responses.
                  </p>
                </div>
                
                {/* Avatar Preview Canvas */}
                <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center">
                  <div 
                    className="relative rounded-full shadow-lg overflow-hidden"
                    style={{ 
                      width: '120px', 
                      height: '120px',
                      backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 6px 6px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        style={{
                          transform: `scale(${localSettings.avatarZoom}) translate(${localSettings.avatarOffsetX}px, ${localSettings.avatarOffsetY}px)`,
                          transformOrigin: 'center center',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {generateAIIcon(widgetName, brandingTitle)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">Adjust zoom and position for the avatar in chat messages</p>

                {/* Chat Preview */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Live Chat Preview</h4>
                  <div className="flex items-start space-x-3">
                    <div 
                      className="rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                      style={{ 
                        width: '32px', 
                        height: '32px',
                        backgroundImage: avatarUrl ? 'none' : 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 4px 4px',
                        backgroundColor: avatarUrl ? 'transparent' : (themeColor || '#4f46e5')
                      }}
                    >
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          style={{
                            transform: `scale(${localSettings.avatarZoom}) translate(${localSettings.avatarOffsetX}px, ${localSettings.avatarOffsetY}px)`,
                            transformOrigin: 'center center',
                            borderRadius: '50%'
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: themeColor || '#4f46e5' }}
                        >
                          <span className="text-white text-xs font-semibold">
                            {generateAIIcon(widgetName, brandingTitle)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm border border-gray-100">
                      Hej! 👋 Jeg er Elva og jeg er en virtuel kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This shows how the avatar appears in actual chat messages</p>
                </div>
              </div>
            )}

            {activeTab === 'logo' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Logo Preview</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This logo appears in the widget header and when the widget is minimized.
                  </p>
                </div>
                
                {/* Logo Preview Canvas */}
                <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center">
                  <div 
                    className="relative rounded-lg shadow-lg overflow-hidden"
                    style={{ 
                      width: '200px', 
                      height: '100px',
                      backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 10px 10px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    {logoUrl ? (
                      <img 
                        src={logoUrl}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                        style={{
                          transform: `scale(${localSettings.logoZoom}) translate(${localSettings.logoOffsetX}px, ${localSettings.logoOffsetY}px)`,
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm font-medium">Company Logo</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">Adjust zoom and position for your company logo</p>

                {/* Widget Header Preview */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Widget Header Preview</h4>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div 
                      className="flex-shrink-0 overflow-hidden rounded-lg"
                      style={{ 
                        width: '40px', 
                        height: '24px',
                        backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 4px 4px',
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      {logoUrl ? (
                        <img 
                          src={logoUrl}
                          alt="Company Logo"
                          className="w-full h-full object-contain"
                          style={{
                            transform: `scale(${localSettings.logoZoom}) translate(${localSettings.logoOffsetX}px, ${localSettings.logoOffsetY}px)`,
                            transformOrigin: 'center center'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
                          <span className="text-gray-500 text-xs">Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{brandingTitle || 'AI Assistant'}</div>
                      <div className="text-xs text-gray-500">• Tilgængelig nu</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This shows how the logo appears in the widget header</p>
                </div>
              </div>
            )}

            {activeTab === 'widget' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Complete Widget Preview</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    See how both your logo and avatar appear together in the actual widget.
                  </p>
                </div>
                
                {/* Complete Widget Preview */}
                <div className="bg-transparent rounded-lg p-4 shadow-sm border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Widget Header with Logo</h4>
                  <div 
                    className="flex items-center justify-between p-3 rounded-t-lg"
                    style={{ backgroundColor: themeColor || '#4f46e5' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="flex-shrink-0 overflow-hidden rounded-lg"
                        style={{ 
                          width: '32px', 
                          height: '20px',
                          backgroundImage: logoUrl ? 'none' : 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 4px 4px',
                          backgroundColor: logoUrl ? 'transparent' : '#f9fafb'
                        }}
                      >
                        {logoUrl ? (
                          <img 
                            src={logoUrl}
                            alt="Company Logo"
                            className="w-full h-full object-contain"
                            style={{
                              transform: `scale(${localSettings.logoZoom}) translate(${localSettings.logoOffsetX}px, ${localSettings.logoOffsetY}px)`,
                              transformOrigin: 'center center'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-white bg-opacity-20 flex items-center justify-center rounded">
                            <span className="text-white text-xs">Logo</span>
                          </div>
                        )}
                      </div>
                      <div>
                      <div className="text-sm font-medium text-white">{brandingTitle || 'AI Assistant'}</div>
                      <div className="text-xs text-white opacity-80">• Tilgængelig nu</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-white opacity-80">Online</span>
                    </div>
                  </div>
                  
                  <div className="bg-transparent p-3 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Chat with Avatar</h4>
                    <div className="flex items-start space-x-3">
                        <div 
                          className="rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                          style={{ 
                            width: '28px', 
                            height: '28px',
                            backgroundImage: avatarUrl ? 'none' : 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb)',
                            backgroundSize: '8px 8px',
                            backgroundPosition: '0 0, 4px 4px',
                            backgroundColor: themeColor || '#4f46e5'
                          }}
                        >
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                              style={{
                                transform: `scale(${localSettings.avatarZoom}) translate(${localSettings.avatarOffsetX}px, ${localSettings.avatarOffsetY}px)`,
                                transformOrigin: 'center center',
                                borderRadius: '50%'
                              }}
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: themeColor || '#4f46e5' }}
                            >
                              <span className="text-white text-xs font-semibold">
                                {generateAIIcon(widgetName, brandingTitle)}
                              </span>
                            </div>
                          )}
                      </div>
                      <div className="bg-white text-gray-800 px-3 py-2 rounded-2xl text-sm max-w-xs shadow-sm border border-gray-100">
                        Hej! Hvordan kan jeg hjælpe dig i dag?
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This shows how both images appear together in the widget</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="w-1/2 p-6 bg-gray-50 overflow-y-auto">
            {activeTab === 'avatar' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Avatar Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Adjust how the assistant's avatar appears in chat messages. This is the profile picture that shows next to AI responses.
                  </p>
                </div>
                
                {/* Zoom Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Avatar Zoom Level
                    <span className="text-xs text-gray-500 ml-2">({localSettings.avatarZoom.toFixed(1)}x)</span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleSettingChange('avatarZoom', Math.max(0.5, localSettings.avatarZoom - 0.1))}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <span className="text-gray-600 font-medium">-</span>
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={localSettings.avatarZoom}
                        onChange={(e) => handleSettingChange('avatarZoom', e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => handleSettingChange('avatarZoom', Math.min(3.0, localSettings.avatarZoom + 0.1))}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <span className="text-gray-600 font-medium">+</span>
                    </button>
                    <span className="text-sm font-medium text-gray-700 w-12 text-center">
                      {localSettings.avatarZoom.toFixed(1)}x
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logo' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Logo Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Adjust how your company logo appears in the widget header and when the widget is minimized. This represents your brand in the widget interface.
                  </p>
                </div>
                
                {/* Zoom Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Logo Zoom Level
                    <span className="text-xs text-gray-500 ml-2">({localSettings.logoZoom.toFixed(1)}x)</span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleSettingChange('logoZoom', Math.max(0.5, localSettings.logoZoom - 0.1))}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <span className="text-gray-600 font-medium">-</span>
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={localSettings.logoZoom}
                        onChange={(e) => handleSettingChange('logoZoom', e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => handleSettingChange('logoZoom', Math.min(3.0, localSettings.logoZoom + 0.1))}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <span className="text-gray-600 font-medium">+</span>
                    </button>
                    <span className="text-sm font-medium text-gray-700 w-12 text-center">
                      {localSettings.logoZoom.toFixed(1)}x
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'widget' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Widget Overview</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This tab shows how both your logo and avatar work together in the complete widget interface.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Tips</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span><strong>Avatar:</strong> Use for the AI assistant's personality - appears next to chat messages</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span><strong>Logo:</strong> Your company branding - appears in header and when minimized</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>Both images can be zoomed and positioned independently</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
