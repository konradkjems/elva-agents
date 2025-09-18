import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const presetColors = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#6366f1', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'
];

export default function ColorPicker({ color, onChange, label }) {
  const [localColor, setLocalColor] = useState(color);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const handleColorChange = (newColor) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handlePresetClick = (presetColor) => {
    handleColorChange(presetColor);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex items-center space-x-3">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-12 h-10 p-0 border-2 hover:scale-105 transition-transform",
                "relative overflow-hidden"
              )}
              style={{ backgroundColor: localColor }}
            >
              <span className="sr-only">Pick a color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Custom Color</Label>
                <div className="mt-2">
                  <input
                    type="color"
                    value={localColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-20 rounded-md border border-input cursor-pointer"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Preset Colors</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {presetColors.map((presetColor, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-8 h-8 p-0 hover:scale-110 transition-transform"
                      style={{ backgroundColor: presetColor }}
                      onClick={() => handlePresetClick(presetColor)}
                    >
                      <span className="sr-only">{presetColor}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          type="text"
          value={localColor}
          onChange={(e) => handleColorChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  );
}

