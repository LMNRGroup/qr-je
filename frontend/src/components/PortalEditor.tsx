import { Plus, X, Link as LinkIcon, Type, Palette, Square, Circle, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface PortalLink {
  url: string;
  name: string;
}

export interface PortalCustomization {
  backgroundColor: string;
  backgroundImage?: string;
  buttonColor: string;
  buttonStyle: 'square' | 'rounded' | 'minimal';
  fontFamily: string;
  fontColor: string;
}

interface PortalEditorProps {
  links: PortalLink[];
  onLinksChange: (links: PortalLink[]) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  template: number; // 1, 2, or 3
  onTemplateChange: (template: number) => void;
  customization: PortalCustomization;
  onCustomizationChange: (customization: PortalCustomization) => void;
  isMobileV2?: boolean;
}

const TEMPLATES = [
  {
    id: 1,
    name: 'Classic',
    description: 'Clean and professional',
    preview: 'bg-gradient-to-br from-blue-500 to-purple-600',
  },
  {
    id: 2,
    name: 'Modern',
    description: 'Bold and vibrant',
    preview: 'bg-gradient-to-br from-pink-500 to-orange-500',
  },
  {
    id: 3,
    name: 'Minimal',
    description: 'Simple and elegant',
    preview: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900',
  },
];

const BUTTON_STYLES = [
  { id: 'square' as const, label: 'Square', icon: Square },
  { id: 'rounded' as const, label: 'Rounded', icon: Circle },
  { id: 'minimal' as const, label: 'Minimal', icon: Minus },
];

const FONT_FAMILIES = [
  { id: 'inter', label: 'Inter', value: 'Inter, sans-serif' },
  { id: 'roboto', label: 'Roboto', value: 'Roboto, sans-serif' },
  { id: 'poppins', label: 'Poppins', value: 'Poppins, sans-serif' },
  { id: 'montserrat', label: 'Montserrat', value: 'Montserrat, sans-serif' },
];

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Green', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
];

export function PortalEditor({
  links,
  onLinksChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  template,
  onTemplateChange,
  customization,
  onCustomizationChange,
  isMobileV2 = false,
}: PortalEditorProps) {
  const [activeTab, setActiveTab] = useState<'links' | 'design'>('links');

  const addLink = () => {
    if (links.length < 3) {
      onLinksChange([...links, { url: '', name: '' }]);
    }
  };

  const removeLink = (index: number) => {
    onLinksChange(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: 'url' | 'name', value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onLinksChange(updated);
  };

  const updateCustomization = (field: keyof PortalCustomization, value: any) => {
    onCustomizationChange({ ...customization, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab('links')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'links'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <LinkIcon className="inline h-4 w-4 mr-2" />
          Links
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('design')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'design'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Palette className="inline h-4 w-4 mr-2" />
          Design
        </button>
      </div>

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="portal-title" className="text-sm font-medium">
              Portal Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="portal-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="My Links"
              className="bg-secondary/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="portal-description" className="text-sm font-medium">
              Portal Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="portal-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add a description for your portal..."
              rows={3}
              className="bg-secondary/40 resize-none"
            />
          </div>

          {/* Links */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Links (up to 3)</Label>
              {links.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLink}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Link
                </Button>
              )}
            </div>

            {links.map((link, index) => (
              <div key={index} className="space-y-2 p-4 border border-border/60 rounded-lg bg-secondary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Link {index + 1}</span>
                  {links.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLink(index)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    value={link.name}
                    onChange={(e) => updateLink(index, 'name', e.target.value)}
                    placeholder="Link Name"
                    className="bg-background"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                    className="bg-background"
                  />
                </div>
              </div>
            ))}

            {links.length === 0 && (
              <div className="text-center py-8 border border-dashed border-border/60 rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">No links added yet</p>
                <Button type="button" variant="outline" onClick={addLink} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Link
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Design Tab */}
      {activeTab === 'design' && (
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Template</Label>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTemplateChange(t.id)}
                  className={cn(
                    'relative p-4 rounded-lg border-2 transition-all text-left',
                    template === t.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border/60 bg-secondary/40 hover:border-primary/60'
                  )}
                >
                  <div className={cn('h-16 rounded mb-2', t.preview)} />
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  {template === t.id && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Background Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => updateCustomization('backgroundColor', color.value)}
                  className={cn(
                    'h-10 rounded-lg border-2 transition-all',
                    customization.backgroundColor === color.value
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-border/60 hover:border-primary/60'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <Input
              type="color"
              value={customization.backgroundColor}
              onChange={(e) => updateCustomization('backgroundColor', e.target.value)}
              className="w-full h-10"
            />
          </div>

          {/* Button Color */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Button Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => updateCustomization('buttonColor', color.value)}
                  className={cn(
                    'h-10 rounded-lg border-2 transition-all',
                    customization.buttonColor === color.value
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-border/60 hover:border-primary/60'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <Input
              type="color"
              value={customization.buttonColor}
              onChange={(e) => updateCustomization('buttonColor', e.target.value)}
              className="w-full h-10"
            />
          </div>

          {/* Button Style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Button Style</Label>
            <div className="grid grid-cols-3 gap-3">
              {BUTTON_STYLES.map((style) => {
                const Icon = style.icon;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateCustomization('buttonStyle', style.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      customization.buttonStyle === style.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/60 bg-secondary/40 hover:border-primary/60'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{style.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Font Family</Label>
            <select
              value={customization.fontFamily}
              onChange={(e) => updateCustomization('fontFamily', e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.id} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Color */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Font Color</Label>
            <Input
              type="color"
              value={customization.fontColor}
              onChange={(e) => updateCustomization('fontColor', e.target.value)}
              className="w-full h-10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
