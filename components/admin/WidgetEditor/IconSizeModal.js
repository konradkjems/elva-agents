import { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ImageZoomModal({ isOpen, onClose, imageSettings, onSave, widgetName, brandingTitle }) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Customize Image Zoom</h2>
            <p className="text-sm text-gray-500 mt-1">Adjust zoom and positioning of uploaded images</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Controls Panel */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-8">
              {/* Avatar Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assistant Avatar</h3>
                
                {/* Zoom */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zoom Level
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={localSettings.avatarZoom}
                    onChange={(e) => handleSettingChange('avatarZoom', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span className="font-medium">{localSettings.avatarZoom.toFixed(1)}x</span>
                    <span>3.0x</span>
                  </div>
                </div>

                {/* Horizontal Offset */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horizontal Position
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={localSettings.avatarOffsetX}
                    onChange={(e) => handleSettingChange('avatarOffsetX', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Left</span>
                    <span className="font-medium">{localSettings.avatarOffsetX}px</span>
                    <span>Right</span>
                  </div>
                </div>

                {/* Vertical Offset */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vertical Position
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={localSettings.avatarOffsetY}
                    onChange={(e) => handleSettingChange('avatarOffsetY', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Up</span>
                    <span className="font-medium">{localSettings.avatarOffsetY}px</span>
                    <span>Down</span>
                  </div>
                </div>
              </div>

              {/* Logo Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Company Logo</h3>
                
                {/* Zoom */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zoom Level
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={localSettings.logoZoom}
                    onChange={(e) => handleSettingChange('logoZoom', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span className="font-medium">{localSettings.logoZoom.toFixed(1)}x</span>
                    <span>3.0x</span>
                  </div>
                </div>

                {/* Horizontal Offset */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horizontal Position
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={localSettings.logoOffsetX}
                    onChange={(e) => handleSettingChange('logoOffsetX', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Left</span>
                    <span className="font-medium">{localSettings.logoOffsetX}px</span>
                    <span>Right</span>
                  </div>
                </div>

                {/* Vertical Offset */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vertical Position
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={localSettings.logoOffsetY}
                    onChange={(e) => handleSettingChange('logoOffsetY', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Up</span>
                    <span className="font-medium">{localSettings.logoOffsetY}px</span>
                    <span>Down</span>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 p-6 bg-gray-50 overflow-y-auto">
            <div className="space-y-8">
              <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
              
              {/* Avatar Preview */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Assistant Avatar</h4>
                <div className="flex items-center space-x-3 p-3 bg-blue-500 rounded-lg">
                  <div 
                    className="bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden"
                    style={{ width: '40px', height: '40px' }}
                  >
                    {widgetName && brandingTitle ? (
                      <div 
                        className="w-full h-full bg-cover bg-center rounded-full"
                        style={{
                          backgroundImage: `url('https://via.placeholder.com/200x200/4f46e5/ffffff?text=${generateAIIcon(widgetName, brandingTitle)}')`,
                          transform: `scale(${localSettings.avatarZoom}) translate(${localSettings.avatarOffsetX}px, ${localSettings.avatarOffsetY}px)`,
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {generateAIIcon(widgetName, brandingTitle)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-base">AI Assistant</div>
                    <div className="text-white text-xs opacity-90">Online now</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Zoom: {localSettings.avatarZoom.toFixed(1)}x | Offset: {localSettings.avatarOffsetX}px, {localSettings.avatarOffsetY}px
                </div>
              </div>

              {/* Message Avatar Preview */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Message Avatar</h4>
                <div className="flex items-start space-x-3">
                  <div 
                    className="bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                    style={{ width: '32px', height: '32px' }}
                  >
                    {widgetName && brandingTitle ? (
                      <div 
                        className="w-full h-full bg-cover bg-center rounded-full"
                        style={{
                          backgroundImage: `url('https://via.placeholder.com/200x200/4f46e5/ffffff?text=${generateAIIcon(widgetName, brandingTitle)}')`,
                          transform: `scale(${localSettings.avatarZoom}) translate(${localSettings.avatarOffsetX}px, ${localSettings.avatarOffsetY}px)`,
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <span className="text-white text-xs font-semibold">
                        {generateAIIcon(widgetName, brandingTitle)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-gray-500 mb-2 font-medium">AI Assistant</div>
                    <div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm border border-gray-100">
                      This is a sample message to show the avatar zoom.
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Preview */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Company Logo</h4>
                <div className="flex justify-center">
                  <div 
                    className="bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{ width: '120px', height: '60px' }}
                  >
                    {widgetName && brandingTitle ? (
                      <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url('https://via.placeholder.com/400x200/6b7280/ffffff?text=LOGO')`,
                          transform: `scale(${localSettings.logoZoom}) translate(${localSettings.logoOffsetX}px, ${localSettings.logoOffsetY}px)`,
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <span className="text-gray-500 text-sm font-medium">Company Logo</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Zoom: {localSettings.logoZoom.toFixed(1)}x | Offset: {localSettings.logoOffsetX}px, {localSettings.logoOffsetY}px
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
