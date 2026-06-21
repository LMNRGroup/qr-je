import { Slider } from '@/components/ui/slider';

interface SizeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function SizeSlider({ value, onChange, min = 128, max = 512 }: SizeSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Size</label>
        <span className="text-sm text-primary font-mono">{value}px</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={8}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}px</span>
        <span>{max}px</span>
      </div>
    </div>
  );
}
