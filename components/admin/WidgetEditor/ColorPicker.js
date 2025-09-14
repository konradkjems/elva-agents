import { useState, useRef, useEffect } from 'react';

export default function ColorPicker({ color, onChange, label, presetColors = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const pickerRef = useRef(null);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorChange = (newColor) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handlePresetClick = (presetColor) => {
    handleColorChange(presetColor);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="flex items-center space-x-3">
        {/* Color Preview */}
        <div
          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: localColor }}
          onClick={() => setIsOpen(!isOpen)}
        />
        
        {/* Color Input */}
        <input
          type="text"
          value={localColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="#000000"
        />
      </div>

      {/* Color Picker Popup */}
      {isOpen && (
        <div className="absolute z-[9999] mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200" style={{ minWidth: '280px' }}>
          {/* Custom Color Picker */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Choose Color</div>
            <input
              type="color"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-32 rounded-lg border border-gray-300 cursor-pointer"
              style={{ 
                position: 'relative',
                zIndex: 1,
                appearance: 'none',
                background: 'none',
                border: '2px solid #d1d5db'
              }}
            />
          </div>
          
          {/* Preset Colors */}
          {presetColors.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Preset Colors</div>
              <div className="grid grid-cols-6 gap-2">
                {presetColors.map((presetColor, index) => (
                  <button
                    key={index}
                    className="w-8 h-8 rounded border-2 border-gray-300 hover:scale-110 transition-transform hover:border-gray-400"
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handlePresetClick(presetColor)}
                    title={presetColor}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

