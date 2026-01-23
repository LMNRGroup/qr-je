import { Bell, ChevronDown, ChevronUp, LogIn, LogOut, Trash2, User, UserPlus } from 'lucide-react';
import { cloneElement, isValidElement, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function UserMenu({ trigger, onSignOut }: { trigger?: React.ReactNode; onSignOut?: () => Promise<void> }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileV2, setIsMobileV2] = useState(false);
  const [userFeed, setUserFeed] = useState<Array<{ id: string; message: string; createdAt: number }>>([]);
  const [dismissedSystemIds, setDismissedSystemIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);

  const displayName = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, string> | undefined;
    const rawName = metadata?.first_name || metadata?.full_name || metadata?.name || '';
    if (rawName.trim()) return rawName.trim().split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  }, [user]);

  const systemNotifications = useMemo(
    () => [
      {
        id: 'system-welcome-2026-01',
        message:
          `Hey ${displayName}.\n\n` +
          'Just a quick heads-up. We’re early. We’re building fast. And yeah — you might see a bug or two along the way.\n\n' +
          'If something feels off, know this: it’s being worked on, and you’re part of why this thing is getting better every day.\n\n' +
          'Thanks for being here this early. That actually means more than you think.\n\n' +
          '— Erwin, Luminar Apps 🚀',
        createdAt: new Date('2026-01-21T00:00:00Z').getTime(),
      },
    ],
    [displayName]
  );

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    if (onSignOut) {
      // Use the custom signout handler (with animation) if provided
      await onSignOut();
    } else {
      // Fallback to default signout
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    }
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
    const key = `qrc.feed.seen.${user.id}`;
    const stored = window.localStorage.getItem(key);
    setLastSeenAt(stored ? Number(stored) : 0);
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadFeed = () => {
      try {
        const raw = window.localStorage.getItem('qrc.feed.user');
        const parsed = raw ? (JSON.parse(raw) as Array<{ id: string; message: string; createdAt: number }>) : [];
        const next = Array.isArray(parsed) ? parsed.slice(0, 10) : [];
        setUserFeed(next);
        if (next.length !== parsed?.length) {
          window.localStorage.setItem('qrc.feed.user', JSON.stringify(next));
        }
      } catch {
        setUserFeed([]);
      }
    };
    const loadStorageUsage = () => {
      try {
        const stored = window.localStorage.getItem('qrc.storage.usage');
        setStorageUsage(stored ? Number(stored) : 0);
      } catch {
        setStorageUsage(0);
      }
    };
    loadFeed();
    loadStorageUsage();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'qrc.feed.user') {
        loadFeed();
      } else if (event.key === 'qrc.storage.usage') {
        loadStorageUsage();
      }
    };
    const handleCustom = () => loadFeed();
    const handleStorageUpdate = () => loadStorageUsage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('qrc:feed-update', handleCustom as EventListener);
    window.addEventListener('qrc:storage-update', handleStorageUpdate as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('qrc:feed-update', handleCustom as EventListener);
      window.removeEventListener('qrc:storage-update', handleStorageUpdate as EventListener);
    };
  }, []);

  const headerName = displayName === 'there' ? 'Your' : displayName;

  const visibleSystem = systemNotifications.filter((note) => !dismissedSystemIds.has(note.id)).slice(0, 2);
  const visibleUser = userFeed
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(0, 10));
  const latestNotificationAt = useMemo(() => {
    const systemLatest = systemNotifications.reduce((max, note) => Math.max(max, note.createdAt), 0);
    const userLatest = userFeed.reduce((max, note) => Math.max(max, note.createdAt), 0);
    return Math.max(systemLatest, userLatest);
  }, [systemNotifications, userFeed]);
  const hasNotifications = visibleSystem.length + visibleUser.length > 0;
  const hasUnread = latestNotificationAt > lastSeenAt;
  const userNotificationCount = Math.min(userFeed.length, 10);
  const markFeedSeen = () => {
    if (!user?.id) return;
    setLastSeenAt(latestNotificationAt);
    window.localStorage.setItem(`qrc.feed.seen.${user.id}`, String(latestNotificationAt));
  };

  const handleClearFeed = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('qrc.feed.user', JSON.stringify([]));
    setUserFeed([]);
    window.dispatchEvent(new CustomEvent('qrc:feed-update'));
    toast.success('Feed cleared');
  };


  const notificationBadge = userNotificationCount > 0
    ? (
        <span className="absolute -top-1 -right-1 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm">
          {userNotificationCount}
        </span>
      )
    : null;
  const defaultTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative overflow-visible h-9 w-9 rounded-full border border-border bg-secondary/50 hover:bg-secondary"
    >
      {notificationBadge}
      <User className="h-4 w-4" />
    </Button>
  );
  const triggerNode = trigger && isValidElement(trigger)
    ? cloneElement(trigger, {
        className: `relative overflow-visible ${trigger.props.className ?? ''}`.trim(),
        children: (
          <>
            {notificationBadge}
            {trigger.props.children}
          </>
        ),
      })
    : defaultTrigger;

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open && user) markFeedSeen();
    }}>
      <DropdownMenuTrigger asChild>
        {triggerNode}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass-panel">
        {user ? (
          <>
            {/* Logged in: Show feed and preferences */}
            <div className="px-3 pt-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Feed</p>
              <p className="text-lg font-semibold">{headerName}&apos;s Feed</p>
            </div>
            <div className="px-3 pt-2 pb-3 max-h-64 overflow-y-auto space-y-2">
          {visibleUser.map((note) => {
            const isExpanded = expandedId === note.id;
            const isLong = note.message.length > 120;
            const displayMessage = !isExpanded && isLong
              ? `${note.message.slice(0, 120).trim()}...`
              : note.message;
            return (
              <div
                key={note.id}
                className={`rounded-xl border border-border/70 bg-card/60 p-3 space-y-2 ${
                  isExpanded ? '' : 'h-20 overflow-hidden'
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Activity
                </div>
                <button
                  type="button"
                  className="text-sm text-foreground text-left w-full"
                  onClick={() => setExpandedId((prev) => (prev === note.id ? null : note.id))}
                >
                  <span
                    className={`block ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}
                  >
                    {displayMessage}
                  </span>
                </button>
                {isLong && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedId((prev) => (prev === note.id ? null : note.id))}
                  >
                    <span>{isExpanded ? 'Less' : 'More'}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>
            );
          })}
          {visibleSystem.map((note) => {
            const isExpanded = expandedId === note.id;
            const isLong = note.message.length > 120;
            const displayMessage = !isExpanded && isLong
              ? `${note.message.slice(0, 120).trim()}...`
              : note.message;
            return (
              <div
                key={note.id}
                className={`rounded-xl border border-border/70 bg-secondary/30 p-3 space-y-2 ${
                  isExpanded ? '' : 'h-20 overflow-hidden'
                }`}
              >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  System
                </span>
                </div>
                <button
                  type="button"
                  className="text-sm text-foreground text-left w-full"
                  onClick={() => setExpandedId((prev) => (prev === note.id ? null : note.id))}
                >
                  <span
                    className={`block ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}
                  >
                    {displayMessage}
                  </span>
                </button>
                {isLong && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedId((prev) => (prev === note.id ? null : note.id))}
                  >
                    <span>{isExpanded ? 'Less' : 'More'}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
                {isExpanded && (
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setDismissedSystemIds((prev) => new Set([...Array.from(prev), note.id]))
                  }
                >
                  Clear
                </button>
                )}
              </div>
            );
          })}
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
            {/* Storage Usage Display */}
            <div className="px-3 py-3 space-y-2">
              {(() => {
                const MAX_STORAGE_BYTES = 25 * 1024 * 1024; // 25MB
                const usedMB = (storageUsage / (1024 * 1024)).toFixed(1);
                const totalMB = (MAX_STORAGE_BYTES / (1024 * 1024)).toFixed(0);
                const percentage = Math.min(100, (storageUsage / MAX_STORAGE_BYTES) * 100);
                const isNearLimit = percentage >= 80;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1">
                      <span>Storage</span>
                      <span className={isNearLimit ? 'text-destructive' : ''}>
                        {usedMB}MB / {totalMB}MB
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/30">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isNearLimit
                            ? 'bg-destructive'
                            : percentage >= 60
                              ? 'bg-amber-400'
                              : 'bg-primary'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 pb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border text-destructive hover:bg-destructive/10 hover:text-destructive text-xs uppercase tracking-[0.25em] justify-center"
                onClick={() => setShowSignOutConfirm(true)}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not logged in: Show only Sign Up and Login */}
            <div className="px-3 pt-3 pb-3 space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border hover:bg-secondary/50 text-xs uppercase tracking-[0.25em] justify-start"
                onClick={() => navigate('/login?mode=signup')}
              >
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                Sign Up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border hover:bg-secondary/50 text-xs uppercase tracking-[0.25em] justify-start"
                onClick={() => navigate('/login')}
              >
                <LogIn className="mr-2 h-3.5 w-3.5" />
                Sign In
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent className="rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-xl max-w-lg">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-semibold tracking-tight">Sign Out</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
              Are you sure you want to sign out? Your session will be ended and you'll need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 mt-6 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto border-border uppercase tracking-[0.2em] text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSignOut} 
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 uppercase tracking-[0.2em] text-xs"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
