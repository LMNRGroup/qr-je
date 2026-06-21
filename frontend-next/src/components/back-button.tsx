'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Small client island for the "go back" control used on content pages.
 * Lets the surrounding page stay a server component.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className={className ?? 'flex-shrink-0'}
      aria-label="Go back"
    >
      <X className="h-5 w-5" />
    </Button>
  );
}
