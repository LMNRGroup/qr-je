import { cn } from '@/lib/utils';

interface ErrorCorrectionSelectorProps {
  value: 'L' | 'M' | 'Q' | 'H';
  onChange: (value: 'L' | 'M' | 'Q' | 'H') => void;
}

const levels: { value: 'L' | 'M' | 'Q' | 'H'; label: string; desc: string }[] = [
  { value: 'L', label: 'L', desc: '7%' },
  { value: 'M', label: 'M', desc: '15%' },
  { value: 'Q', label: 'Q', desc: '25%' },
  { value: 'H', label: 'H', desc: '30%' },
];

export function ErrorCorrectionSelector({ value, onChange }: ErrorCorrectionSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Error Correction
        <span className="text-xs text-muted-foreground ml-2">
          (Higher = more recoverable)
        </span>
      </label>
      <div className="flex gap-2">
        {levels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg border transition-all duration-200 text-center',
              value === level.value
                ? 'border-primary bg-primary/10 text-primary glow-sm'
                : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="font-semibold">{level.label}</span>
            <span className="block text-xs opacity-70">{level.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
