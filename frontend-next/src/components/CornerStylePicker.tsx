import { motion } from 'framer-motion';
import { Square, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CornerStylePickerProps {
  value: 'square' | 'rounded' | 'dots';
  onChange: (value: 'square' | 'rounded' | 'dots') => void;
}

const styles: { value: 'square' | 'rounded' | 'dots'; label: string; icon: React.ReactNode }[] = [
  { value: 'square', label: 'Square', icon: <Square className="h-4 w-4" /> },
  { value: 'rounded', label: 'Rounded', icon: <div className="h-4 w-4 border-2 border-current rounded" /> },
  { value: 'dots', label: 'Dots', icon: <Circle className="h-4 w-4" /> },
];

export function CornerStylePicker({ value, onChange }: CornerStylePickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Corner Style</label>
      <div className="grid grid-cols-3 gap-2">
        {styles.map((style) => (
          <button
            key={style.value}
            onClick={() => onChange(style.value)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200',
              value === style.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {value === style.value && (
              <motion.div
                layoutId="corner-style-indicator"
                className="absolute inset-0 border-2 border-primary rounded-lg"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            {style.icon}
            <span className="text-xs">{style.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
