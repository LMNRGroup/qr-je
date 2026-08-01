import { Bell, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function SystemNotificationTab() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const displayName = useMemo(() => {
    if (!user) return 'there';
    const metadata = user.user_metadata as Record<string, string> | undefined;
    const rawName = metadata?.first_name || metadata?.full_name || metadata?.name || '';
    if (rawName.trim()) return rawName.trim().split(' ')[0];
    if (user.email) return user.email.split('@')[0];
    return 'there';
  }, [user]);

  const systemNotifications = useMemo(
    () => [
      {
        id: 'system-welcome-2026-01',
        message:
          `Hey ${displayName}.\n\n` +
          `Just a quick heads-up. We're early. We're building fast. And yeah — you might see a bug or two along the way.\n\n` +
          `If something feels off, know this: it's being worked on, and you're part of why this thing is getting better every day.\n\n` +
          `Thanks for being here this early. That actually means more than you think.\n\n` +
          `— Erwin, Luminar Apps 🚀`,
        createdAt: new Date('2026-01-21T00:00:00Z').getTime(),
      },
    ],
    [displayName]
  );

  useEffect(() => {
    if (!user?.id) return;
    const dismissedKey = `qrc.system.dismissed.${user.id}`;
    const readKey = `qrc.system.read.${user.id}`;
    try {
      const dismissedStored = window.localStorage.getItem(dismissedKey);
      if (dismissedStored) {
        setDismissedIds(new Set(JSON.parse(dismissedStored)));
      }
      const readStored = window.localStorage.getItem(readKey);
      if (readStored) {
        setReadIds(new Set(JSON.parse(readStored)));
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  const visibleNotifications = systemNotifications.filter((note) => !dismissedIds.has(note.id));
  const unreadNotifications = visibleNotifications.filter((note) => !readIds.has(note.id));

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && user?.id) {
      // Mark all visible notifications as read when dialog opens
      const newReadIds = new Set([...Array.from(readIds), ...visibleNotifications.map(n => n.id)]);
      setReadIds(newReadIds);
      try {
        const readKey = `qrc.system.read.${user.id}`;
        window.localStorage.setItem(readKey, JSON.stringify(Array.from(newReadIds)));
      } catch {
        // ignore
      }
    }
  };

  const handleDismiss = (id: string) => {
    if (!user?.id) return;
    const next = new Set([...Array.from(dismissedIds), id]);
    setDismissedIds(next);
    try {
      const key = `qrc.system.dismissed.${user.id}`;
      window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
    if (visibleNotifications.length === 1) {
      setIsOpen(false);
    }
  };

  if (!user || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bottom-left tab */}
      <button
        type="button"
        onClick={() => handleOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border/60 bg-secondary/80 backdrop-blur-sm px-3 py-2 shadow-lg hover:bg-secondary transition-colors group"
        aria-label="System notifications"
      >
        <Bell className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground hidden sm:inline">System</span>
        {!isOpen && unreadNotifications.length > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {unreadNotifications.length}
          </span>
        )}
      </button>

      {/* Dialog for full notification */}
      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              System Notification
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-[0.3em] text-muted-foreground pt-1">
              Important updates from Luminar Apps
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {visibleNotifications.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3"
              >
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {note.message}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs uppercase tracking-[0.2em]"
                    onClick={() => handleDismiss(note.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
