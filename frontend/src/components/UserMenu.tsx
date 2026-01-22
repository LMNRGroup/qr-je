import { LogOut, RefreshCcw, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileV2, setIsMobileV2] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const enabled = document.documentElement.dataset.mobileUi === 'v2';
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    setIsMobileV2(enabled && isMobile);
  }, []);

  const handleClearCache = async () => {
    if (typeof window === 'undefined') return;
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      toast.success('Cache cleared. Reloading…');
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear cache';
      toast.error(message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-border bg-secondary/50 hover:bg-secondary"
        >
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-panel">
        <div className="px-2 py-2">
          <p className="text-sm font-medium truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Signed in</p>
        </div>
        {isMobileV2 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearCache} className="cursor-pointer">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Clear cache
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
