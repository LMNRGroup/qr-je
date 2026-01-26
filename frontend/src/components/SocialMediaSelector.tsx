import { Instagram, Music2, Facebook, MessageCircle, Youtube, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook' | 'whatsapp' | 'youtube' | 'x' | null;

interface SocialMediaSelectorProps {
  platform: SocialPlatform;
  handle: string;
  onPlatformChange: (platform: SocialPlatform) => void;
  onHandleChange: (handle: string) => void;
  isMobileV2?: boolean;
}

const SOCIAL_PLATFORMS: Array<{
  id: SocialPlatform;
  name: string;
  icon: typeof Instagram;
  baseUrl: string;
  placeholder: string;
  color: string;
}> = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    baseUrl: 'https://instagram.com/',
    placeholder: 'username',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    baseUrl: 'https://tiktok.com/@',
    placeholder: 'username',
    color: 'from-black to-gray-800',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    baseUrl: 'https://facebook.com/',
    placeholder: 'username',
    color: 'from-blue-600 to-blue-700',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    baseUrl: 'https://wa.me/',
    placeholder: 'phone number',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    baseUrl: 'https://youtube.com/@',
    placeholder: 'channel name',
    color: 'from-red-600 to-red-700',
  },
  {
    id: 'x',
    name: 'X (Former Twitter)',
    icon: Twitter,
    baseUrl: 'https://x.com/',
    placeholder: 'username',
    color: 'from-black to-gray-900',
  },
];

export function SocialMediaSelector({
  platform,
  handle,
  onPlatformChange,
  onHandleChange,
  isMobileV2 = false,
}: SocialMediaSelectorProps) {
  const selectedPlatform = SOCIAL_PLATFORMS.find((p) => p.id === platform);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select Social Media Platform</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SOCIAL_PLATFORMS.map((social) => {
            const Icon = social.icon;
            const isSelected = platform === social.id;
            return (
              <button
                key={social.id}
                type="button"
                onClick={() => onPlatformChange(social.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border/60 bg-secondary/40 hover:border-primary/60 hover:bg-secondary/60'
                )}
              >
                <div
                  className={cn(
                    'p-3 rounded-lg bg-gradient-to-br',
                    isSelected ? social.color : 'bg-muted'
                  )}
                >
                  <Icon className={cn('h-6 w-6', isSelected ? 'text-white' : 'text-muted-foreground')} />
                </div>
                <span className={cn('text-xs font-medium text-center', isSelected ? 'text-primary' : 'text-muted-foreground')}>
                  {social.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {platform && (
        <div className="space-y-3">
          <Label htmlFor="social-handle" className="text-sm font-medium">
            {selectedPlatform?.name} Handle
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center px-3 py-2 bg-secondary/40 border border-border/60 rounded-l-md text-sm text-muted-foreground whitespace-nowrap">
              {selectedPlatform?.baseUrl}
            </div>
            <Input
              id="social-handle"
              type="text"
              placeholder={selectedPlatform?.placeholder}
              value={handle}
              onChange={(e) => {
                // Remove @ symbol if user types it
                const value = e.target.value.replace(/^@/, '');
                onHandleChange(value);
              }}
              className="rounded-l-none flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your {selectedPlatform?.name} {selectedPlatform?.id === 'whatsapp' ? 'phone number' : 'handle'} without the @ symbol
          </p>
        </div>
      )}
    </div>
  );
}
