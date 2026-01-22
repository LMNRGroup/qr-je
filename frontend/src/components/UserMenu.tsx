import { Bell, LogOut, RefreshCcw, Settings, Trash2, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  const [userFeed, setUserFeed] = useState<Array<{ id: string; message: string; createdAt: number }>>([]);
  const [dismissedSystemIds, setDismissedSystemIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const systemNotifications = useMemo(
    () => [
      {
        id: 'system-welcome-2026-01',
        message:
          'Welcome and thanks for joining. We are early in development, so you may see issues. We are working fast to deliver the best experience.',
        createdAt: new Date('2026-01-21T00:00:00Z').getTime(),
      },
    ],
    []
  );

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

  useEffect(() => {
    if (!user?.id) return;
    setDismissedSystemIds(new Set());
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadFeed = () => {
      try {
        const raw = window.localStorage.getItem('qrc.feed.user');
        const parsed = raw ? (JSON.parse(raw) as Array<{ id: string; message: string; createdAt: number }>) : [];
        setUserFeed(Array.isArray(parsed) ? parsed : []);
      } catch {
        setUserFeed([]);
      }
    };
    loadFeed();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'qrc.feed.user') {
        loadFeed();
      }
    };
    const handleCustom = () => loadFeed();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('qrc:feed-update', handleCustom as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('qrc:feed-update', handleCustom as EventListener);
    };
  }, []);

  const displayName = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, string> | undefined;
    const rawName = metadata?.first_name || metadata?.full_name || metadata?.name || '';
    if (rawName.trim()) return rawName.trim().split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'Your';
  }, [user]);

  const visibleSystem = systemNotifications.filter((note) => !dismissedSystemIds.has(note.id)).slice(0, 2);
  const visibleUser = userFeed
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(0, 5 - visibleSystem.length));

  const handleClearFeed = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('qrc.feed.user', JSON.stringify([]));
    setUserFeed([]);
    window.dispatchEvent(new CustomEvent('qrc:feed-update'));
    toast.success('Feed cleared');
  };

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

  const handlePreferences = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('qrc.activeTab', 'settings');
    }
    navigate('/');
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
      <DropdownMenuContent align="end" className="w-80 glass-panel">
        <div className="px-3 pt-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Feed</p>
          <p className="text-lg font-semibold">{displayName}&apos;s Feed</p>
        </div>
        <div className="px-3 pt-2 pb-3 max-h-64 overflow-y-auto space-y-2">
          {visibleSystem.map((note) => (
            <div key={note.id} className="rounded-xl border border-border/70 bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  System
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition"
                  onClick={() =>
                    setDismissedSystemIds((prev) => new Set([...Array.from(prev), note.id]))
                  }
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                className={`text-sm text-foreground text-left ${
                  expandedId === note.id ? '' : 'max-h-[2.8em] overflow-hidden'
                }`}
                onClick={() => setExpandedId((prev) => (prev === note.id ? null : note.id))}
              >
                {note.message}
              </button>
            </div>
          ))}
          {visibleUser.map((note) => (
            <div key={note.id} className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                Activity
              </div>
              <button
                type="button"
                className={`text-sm text-foreground text-left ${
                  expandedId === note.id ? '' : 'max-h-[2.8em] overflow-hidden'
                }`}
                onClick={() => setExpandedId((prev) => (prev === note.id ? null : note.id))}
              >
                {note.message}
              </button>
            </div>
          ))}
          {visibleSystem.length === 0 && visibleUser.length === 0 && (
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 text-sm text-muted-foreground">
              No notifications yet.
            </div>
          )}
        </div>
        <div className="px-3 pb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-border text-xs uppercase tracking-[0.25em]"
            onClick={handleClearFeed}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Clear Feed
          </Button>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePreferences} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Preferences
        </DropdownMenuItem>
        {isMobileV2 && (
          <DropdownMenuItem onClick={handleClearCache} className="cursor-pointer">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Clear cache
          </DropdownMenuItem>
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
