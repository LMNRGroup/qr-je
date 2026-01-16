import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
}

const defaultPresets = [
  '#00d4ff', // Cyan
  '#ffffff', // White
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#000000', // Black
];

export function ColorPicker({ label, value, onChange, presets = defaultPresets }: ColorPickerProps) {
  const isLight = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-10 h-10 rounded-lg border border-border shadow-inner cursor-pointer transition-transform hover:scale-105 checkerboard"
          >
            <div
              className="w-full h-full rounded-lg"
              style={{ backgroundColor: value }}
            />
          </div>
        </div>
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm font-mono uppercase focus:outline-none focus:border-primary input-glow transition-all"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => (
          <motion.button
            key={preset}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(preset)}
            className={cn(
              'relative w-6 h-6 rounded-md border transition-all flex items-center justify-center',
              value.toLowerCase() === preset.toLowerCase()
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/50'
            )}
            style={{ backgroundColor: preset }}
          >
            {value.toLowerCase() === preset.toLowerCase() && (
              <Check 
                className={cn(
                  'h-3.5 w-3.5',
                  isLight(preset) ? 'text-gray-800' : 'text-white'
                )} 
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
