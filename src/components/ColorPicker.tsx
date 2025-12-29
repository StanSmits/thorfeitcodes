import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (newValue: string) => {
    setInputValue(newValue);
    // Validate hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    handleChange(hexColor);
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(text)) {
      onChange(text);
    }
  };

  // Convert hex to HSL for custom theme
  const hexToHsl = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const hslValue = hexToHsl(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={label}>{label}</Label>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <div className="flex gap-2">
        <Input
          type="color"
          id={`${label}-color`}
          value={value}
          onChange={handleColorInputChange}
          className="h-10 w-20 cursor-pointer"
        />
        <Input
          type="text"
          value={inputValue}
          onChange={handleTextInputChange}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="text-xs text-muted-foreground pt-1">
        <div>HSL: {hslValue}</div>
      </div>
    </div>
  );
}
