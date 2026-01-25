import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  ArrowDownAz,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpAz,
  Check,
  Copy,
  Contact,
  Download,
  ExternalLink,
  File,
  LayoutGrid,
  Link,
  List,
  Loader2,
  Mail,
  Phone,
  QrCode,
  Send,
  Sparkles,
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRHistoryItem, QROptions } from '@/types/qr';
import { deleteQRFromHistory, getQRHistory, getScanCounts, updateQR } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'oldest' | 'alpha';
const PAGE_SIZE = 10;
const USER_FEED_KEY = 'qrc.feed.user';
const MAX_USER_FEED = 10;

const getDisplayName = (item: QRHistoryItem, list: QRHistoryItem[] = []) => {
  const name = item.name?.trim();
  if (name) return name.slice(0, 25);
  const unnamed = list
    .filter((entry) => !entry.name?.trim())
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const index = unnamed.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    return `Untitled QRC ${index + 1}`;
  }
  return `Untitled QRC`;
};

// Calculate total storage used by a QR code's files
const calculateQRStorageSize = (item: QRHistoryItem): number => {
  let total = 0;
  const opts = item.options;
  
  // Menu files
  if (opts.menuFiles && Array.isArray(opts.menuFiles)) {
    for (const file of opts.menuFiles) {
      if (file && typeof file === 'object' && 'size' in file && typeof file.size === 'number') {
        total += file.size;
      }
    }
  }
  
  // Menu logo
  if (opts.menuLogoSize && typeof opts.menuLogoSize === 'number') {
    total += opts.menuLogoSize;
  }
  
  // File QRC
  if (opts.fileSize && typeof opts.fileSize === 'number') {
    total += opts.fileSize;
  }
  
  // Adaptive QRC files
  if (opts.adaptive && typeof opts.adaptive === 'object' && 'slots' in opts.adaptive) {
    const slots = opts.adaptive.slots;
    if (Array.isArray(slots)) {
      for (const slot of slots) {
        if (slot && typeof slot === 'object' && 'fileSize' in slot && typeof slot.fileSize === 'number') {
          total += slot.fileSize;
        }
      }
    }
  }
  
  // vCard photo (stored as dataUrl, but we track size)
  // Note: vCard photos are stored in options.photo as dataUrl, but we don't have size stored
  // For now, we'll skip vCard photos in deletion cleanup (they're small anyway)
  
  return total;
};

// Delete file from Supabase storage
const deleteFileFromStorage = async (fileUrl: string) => {
  if (!fileUrl || (!fileUrl.includes('/storage/v1/object/public/') && !fileUrl.includes('/storage/v1/object/sign/'))) return;
  
  try {
    // Extract file path from public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/qr-assets/files/[filename]
    // Or signed URL format: https://[project].supabase.co/storage/v1/object/sign/qr-assets/files/[filename]?...
    let urlParts: string[];
    if (fileUrl.includes('/storage/v1/object/public/')) {
      urlParts = fileUrl.split('/storage/v1/object/public/');
    } else {
      urlParts = fileUrl.split('/storage/v1/object/sign/');
    }
    
    if (urlParts.length < 2) return;
    
    // Remove query params if present
    const pathWithQuery = urlParts[1];
    const pathOnly = pathWithQuery.split('?')[0];
    const pathParts = pathOnly.split('/');
    if (pathParts.length < 3) return; // Should be: bucket/folder/filename
    
    const bucket = pathParts[0];
    const folder = pathParts[1];
    const filename = pathParts.slice(2).join('/');
    const filePath = `${folder}/${filename}`;
    
    const supabase = (await import('@/lib/supabase')).default;
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    
    if (error) {
      console.warn('[ArsenalPanel] Failed to delete file from storage:', error);
    }
  } catch (error) {
    console.warn('[ArsenalPanel] Error deleting file from storage:', error);
  }
};

// Free storage when QR is deleted
const freeQRStorage = async (item: QRHistoryItem) => {
  const size = calculateQRStorageSize(item);
  const opts = item.options;
  
  // Delete files from Supabase storage
  if (opts.fileUrl && typeof opts.fileUrl === 'string') {
    await deleteFileFromStorage(opts.fileUrl);
  }
  
  // Delete menu files
  if (opts.menuFiles && Array.isArray(opts.menuFiles)) {
    for (const file of opts.menuFiles) {
      if (file && typeof file === 'object' && 'url' in file && typeof file.url === 'string') {
        await deleteFileFromStorage(file.url);
      }
    }
  }
  
  // Delete menu logo
  if (opts.menuLogoDataUrl && typeof opts.menuLogoDataUrl === 'string' && opts.menuLogoDataUrl.includes('/storage/')) {
    await deleteFileFromStorage(opts.menuLogoDataUrl);
  }
  
  // Delete Adaptive QRC files
  if (opts.adaptive && typeof opts.adaptive === 'object' && 'slots' in opts.adaptive) {
    const slots = opts.adaptive.slots;
    if (Array.isArray(slots)) {
      for (const slot of slots) {
        if (slot && typeof slot === 'object' && 'fileUrl' in slot && typeof slot.fileUrl === 'string') {
          await deleteFileFromStorage(slot.fileUrl);
        }
      }
    }
  }
  
  // Update localStorage storage usage
  if (size > 0 && typeof window !== 'undefined') {
    const current = Number(window.localStorage.getItem('qrc.storage.usage') || '0');
    const updated = Math.max(0, current - size);
    window.localStorage.setItem('qrc.storage.usage', String(updated));
    window.dispatchEvent(new CustomEvent('qrc:storage-update', { detail: updated }));
  }
};

const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

const parseKind = (kind?: string | null) => {
  if (!kind) return { mode: 'static', type: 'url' };
  if (kind === 'vcard') return { mode: 'static', type: 'vcard' };
  if (kind === 'adaptive') return { mode: 'dynamic', type: 'adaptive' };
  if (kind === 'dynamic' || kind === 'static') return { mode: kind, type: 'url' };
  if (kind.includes(':')) {
    const [mode, type] = kind.split(':');
    return {
      mode: mode === 'dynamic' ? 'dynamic' : 'static',
      type: type || 'url',
    };
  }
  return { mode: 'static', type: kind };
};

const getQrPreviewContent = (item: QRHistoryItem) => {
  const parsed = parseKind(item.kind ?? null);
  // Check if item has adaptive config in options
  const isAdaptive = parsed.type === 'adaptive' || 
                     (item.options && typeof item.options === 'object' && 
                      'adaptive' in item.options && item.options.adaptive !== null);
  
  if (isAdaptive && item.shortUrl) {
    // Convert /r/ URL to /adaptive/ URL for adaptive QRCs
    return item.shortUrl.replace('/r/', '/adaptive/');
  }
  
  if (parsed.mode === 'dynamic') {
    return item.shortUrl ?? item.content;
  }
  return item.content;
};

const typeStyles: Record<string, { label: string; icon: typeof Link; card: string; badge: string }> = {
  url: {
    label: 'URL',
    icon: Link,
    card: 'border-border/60',
    badge: 'bg-secondary/40 text-muted-foreground border-border/60',
  },
  phone: {
    label: 'Phone',
    icon: Phone,
    card: 'border-border/60',
    badge: 'bg-secondary/40 text-muted-foreground border-border/60',
  },
  email: {
    label: 'Email',
    icon: Mail,
    card: 'border-border/60',
    badge: 'bg-secondary/40 text-muted-foreground border-border/60',
  },
  file: {
    label: 'File',
    icon: File,
    card: 'border-border/60',
    badge: 'bg-secondary/40 text-muted-foreground border-border/60',
  },
  menu: {
    label: 'Menu',
    icon: Utensils,
    card: 'border-border/60',
    badge: 'bg-secondary/40 text-muted-foreground border-border/60',
  },
  vcard: {
    label: 'VCard',
    icon: Contact,
    card: 'border-border/60',
    badge: 'bg-secondary/40 text-muted-foreground border-border/60',
  },
  adaptive: {
    label: 'Adaptive QRC™',
    icon: Sparkles,
    card: 'border-amber-500/70 bg-amber-500/10 dark:border-amber-400/60 dark:bg-amber-500/10',
    badge: 'border-amber-600/70 text-white bg-amber-600/80 dark:border-amber-400/60 dark:text-amber-200 dark:bg-amber-500/25',
  },
};

const modeStyles: Record<'dynamic' | 'static', { card: string; badge: string }> = {
  dynamic: {
    card: 'border-violet-500/70 bg-violet-500/10 dark:border-violet-400/60 dark:bg-violet-500/10',
    badge:
      'border-violet-600/70 text-white bg-violet-600/80 ' +
      'dark:border-violet-400/60 dark:text-violet-200 dark:bg-violet-500/25',
  },
  static: {
    card: 'border-border/60 bg-secondary/20',
    badge: 'border-border/60 text-muted-foreground bg-secondary/40',
  },
};

export function ArsenalPanel({
  refreshKey,
  onStatsChange,
  onScansChange,
  onRefreshRequest,
  language = 'en',
  timeZone,
  cacheKey,
  topContent,
  onAdaptiveEdit,
}: {
  refreshKey?: number;
  onStatsChange?: (stats: { total: number; dynamic: number }) => void;
  onScansChange?: (total: number) => void;
  onRefreshRequest?: () => void;
  language?: 'en' | 'es';
  timeZone?: string;
  cacheKey?: string;
  topContent?: React.ReactNode;
  onAdaptiveEdit?: (item: QRHistoryItem) => void;
}) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [items, setItems] = useState<QRHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<QRHistoryItem | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<Record<string, NodeJS.Timeout>>({});
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'select'; item: QRHistoryItem }
    | { type: 'cancel' }
    | { type: 'close' }
    | null
  >(null);
  const previewRef = useRef<QRPreviewHandle>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const previousScanCountsRef = useRef<Record<string, number>>({});
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const scanCountsCacheRef = useRef<{ data: Record<string, number>; timestamp: number } | null>(null);
  const SCAN_COUNTS_CACHE_TTL_MS = 15 * 1000; // 15 seconds frontend cache
  const t = (en: string, es: string) => (language === 'es' ? es : en);
  const isMobile = !isDesktop;
  const isMobileUiV2 =
    typeof document !== 'undefined' && document.documentElement.dataset.mobileUi === 'v2';
  const isMobileV2 = isMobile && isMobileUiV2;
  const cacheId = cacheKey ? `qrc.arsenal.cache:${cacheKey}` : null;
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const lastTodayRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isMobileV2 || !import.meta.env.DEV) return;
    const check = () => {
      const offenders: Element[] = [];
      document.querySelectorAll('[data-overflow-check] *').forEach((element) => {
        const node = element as HTMLElement;
        if (node.scrollWidth > node.clientWidth + 1) offenders.push(node);
      });
      if (offenders.length) {
        console.warn('[mobile-v2] overflow offenders', offenders);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [isMobileV2]);

  const loadScanCounts = async (list: QRHistoryItem[], includeSummary = true) => {
    if (!list.length) {
      setScanCounts({});
      onScansChange?.(0);
      previousScanCountsRef.current = {};
      return { counts: {} as Record<string, number>, today: 0 };
    }

    // Check frontend cache first
    const now = Date.now();
    const cached = scanCountsCacheRef.current;
    if (cached && now - cached.timestamp < SCAN_COUNTS_CACHE_TTL_MS) {
      // Use cached data, but still map to item IDs
      const mappedCounts: Record<string, number> = {};
      let totalScans = 0;
      list.forEach((item) => {
        if (!item.random) {
          mappedCounts[item.id] = 0;
          return;
        }
        const key = `${item.id}:${item.random}`;
        const count = cached.data[key] ?? 0;
        mappedCounts[item.id] = count;
        totalScans += count;
      });
      setScanCounts((prev) => ({ ...prev, ...mappedCounts }));
      if (includeSummary) {
        lastTodayRef.current = totalScans;
        onScansChange?.(totalScans);
      }
      return { counts: mappedCounts, today: totalScans };
    }

    // Fetch from API
    try {
      const bulkCounts = await getScanCounts();
      scanCountsCacheRef.current = { data: bulkCounts, timestamp: now };

      // Map bulk response (key: "urlId:urlRandom") to item IDs
      const mappedCounts: Record<string, number> = {};
      let totalScans = 0;
      list.forEach((item) => {
        if (!item.random) {
          mappedCounts[item.id] = 0;
          return;
        }
        const key = `${item.id}:${item.random}`;
        const count = bulkCounts[key] ?? 0;
        mappedCounts[item.id] = count;
        totalScans += count;
      });

      setScanCounts((prev) => ({ ...prev, ...mappedCounts }));

      if (includeSummary) {
        lastTodayRef.current = totalScans;
        onScansChange?.(totalScans);
      }

      // Check for new scans and trigger notifications
      const previousCounts = previousScanCountsRef.current;
      list.forEach((item) => {
        const current = mappedCounts[item.id] ?? 0;
        const previous = previousCounts[item.id] ?? 0;
        if (previous !== undefined && current > previous) {
          const label = getDisplayName(item, list);
          pushScanNotification(label);
        }
      });
      previousScanCountsRef.current = mappedCounts;

      return { counts: mappedCounts, today: totalScans };
    } catch (error) {
      console.error('[ArsenalPanel] failed to load scan counts', error);
      // Fallback: set all to 0
      const zeroCounts: Record<string, number> = {};
      list.forEach((item) => {
        zeroCounts[item.id] = 0;
      });
      setScanCounts((prev) => ({ ...prev, ...zeroCounts }));
      return { counts: zeroCounts, today: 0 };
    }
  };

  const readCache = () => {
    if (!cacheId || typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(cacheId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        ts: number;
        items: QRHistoryItem[];
        scanCounts: Record<string, number>;
        selectedId: string | null;
        editName: string;
        editContent: string;
        today: number;
        page: number;
        sortMode: SortMode;
        viewMode: ViewMode;
      };
      if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeCache = (payload: {
    items: QRHistoryItem[];
    scanCounts: Record<string, number>;
    selectedId: string | null;
    editName: string;
    editContent: string;
    today: number;
    page: number;
    sortMode: SortMode;
    viewMode: ViewMode;
  }) => {
    if (!cacheId || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        cacheId,
        JSON.stringify({
          ts: Date.now(),
          ...payload,
        })
      );
    } catch {
      // Ignore cache write failures (storage full, privacy mode, etc.)
    }
  };

  const getPageItems = (list: QRHistoryItem[]) => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  };

  const getCountTargets = (list: QRHistoryItem[]) => {
    const targets = new Map<string, QRHistoryItem>();
    getPageItems(list).forEach((item) => targets.set(item.id, item));
    if (selectedId) {
      const selected = list.find((item) => item.id === selectedId);
      if (selected) targets.set(selected.id, selected);
    }
    return Array.from(targets.values());
  };

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        // If refreshKey is set, clear cache to force fresh fetch (fixes sync across devices)
        if (refreshKey && cacheId && typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(cacheId);
          } catch {
            // Ignore cache clear errors
          }
        }
        // If refreshKey is set, clear cache to force fresh fetch (fixes sync across devices)
        if (refreshKey && cacheId && typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(cacheId);
          } catch {
            // Ignore cache clear errors
          }
        }
        const canUseCache = !refreshKey;
        const cached = canUseCache ? readCache() : null;
        if (cached) {
          setItems(cached.items ?? []);
          setScanCounts(cached.scanCounts ?? {});
          setPage(cached.page ?? 1);
          setSortMode(cached.sortMode ?? 'newest');
          setViewMode(cached.viewMode ?? 'grid');
          lastTodayRef.current = cached.today ?? 0;
          onScansChange?.(cached.today ?? 0);
          if (cached.items?.length && isDesktop) {
            const fallback = cached.items[0];
            const cachedSelected =
              cached.items.find((item) => item.id === cached.selectedId) ?? fallback;
            if (cachedSelected) {
              setSelectedId(cachedSelected.id);
              setEditName(cachedSelected.name?.trim() ?? '');
              setEditContent(cachedSelected.content);
            }
          }
          setIsLoading(false);
          return;
        }
        const response = await getQRHistory();
        if (response.success) {
          setItems(response.data);
          if (response.data.length > 0 && isDesktop) {
            const first = response.data[0];
            setSelectedId(first.id);
            setEditName(first.name?.trim() ?? '');
            setEditContent(first.content);
          }
          const countsResult = await loadScanCounts(getCountTargets(response.data));
          writeCache({
            items: response.data,
            scanCounts: countsResult.counts,
            selectedId: response.data[0]?.id ?? null,
            editName: response.data[0]?.name?.trim() ?? '',
            editContent: response.data[0]?.content ?? '',
            today: countsResult.today,
            page: 1,
            sortMode,
            viewMode,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load arsenal';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [refreshKey, isDesktop]);

  useEffect(() => {
    if (!items.length) return;
    loadScanCounts(getCountTargets(items), false).then((countsResult) => {
      writeCache({
        items,
        scanCounts: {
          ...scanCounts,
          ...countsResult.counts,
        },
        selectedId,
        editName,
        editContent,
        today: lastTodayRef.current,
        page,
        sortMode,
        viewMode,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedId, items]);

  useEffect(() => {
    if (!items.length) return;
    
    // Only poll when tab is visible
    const isVisible = () => {
      if (typeof document === 'undefined') return true;
      return !document.hidden;
    };

    let interval: number | undefined;
    const pollScans = () => {
      if (!isVisible()) return; // Skip if tab is hidden
      loadScanCounts(items, false);
    };

    // Initial poll
    pollScans();

    // Poll every 45 seconds (reduced from 15s to reduce load)
    interval = window.setInterval(pollScans, 45000);

    // Also poll on visibility change (when tab becomes visible)
    const handleVisibilityChange = () => {
      if (isVisible()) {
        // Clear cache to force fresh fetch when tab becomes visible
        scanCountsCacheRef.current = null;
        pollScans();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sortMode === 'newest') {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortMode === 'oldest') {
      copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      copy.sort((a, b) => getDisplayName(a, items).localeCompare(getDisplayName(b, items)));
    }
    return copy;
  }, [items, sortMode]);

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = sortedItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selectedItem = sortedItems.find((item) => item.id === selectedId) ?? null;
  const selectedDisplayName = selectedItem ? getDisplayName(selectedItem, sortedItems) : '';
  const selectedKind = parseKind(selectedItem?.kind ?? null);
  const isDynamic = selectedKind.mode === 'dynamic';
  const hasUnsavedChanges = Boolean(
    selectedItem &&
      (editName.trim() !== (selectedItem.name?.trim() ?? '') ||
        (isDynamic && editContent.trim() !== selectedItem.content))
  );

  // Scan counts load once per refresh to avoid constant re-renders.

  const applySelection = (item: QRHistoryItem) => {
    setSelectedId(item.id);
    setEditName(item.name?.trim() ?? '');
    setEditContent(item.content);
    setIsEditingTitle(false);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setEditName('');
    setEditContent('');
    setIsEditingTitle(false);
  };

  const handleSelect = (item: QRHistoryItem) => {
    // Check if this is an Adaptive QRC or Dynamic QR code
    const parsed = parseKind(item.kind ?? null);
    const isAdaptive = parsed.type === 'adaptive' || 
                       (item.options && typeof item.options === 'object' && 
                        'adaptive' in item.options && item.options.adaptive !== null);
    
    // If it's Adaptive/Dynamic, open the Adaptive editor instead
    if (isAdaptive && onAdaptiveEdit) {
      onAdaptiveEdit(item);
      return;
    }
    
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'select', item });
      setShowUnsavedPrompt(true);
      return;
    }
    applySelection(item);
    if (!isDesktop && !isMobileV2) {
      window.setTimeout(() => {
        const target = backButtonRef.current ?? detailRef.current;
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 0);
    }
  };

  const resetEdits = () => {
    if (!selectedItem) return;
    setEditName(selectedItem.name?.trim() ?? '');
    setEditContent(selectedItem.content);
    setIsEditingTitle(false);
  };

  const resolveUnsavedAction = async (action: 'save' | 'discard') => {
    const pending = pendingAction;
    setShowUnsavedPrompt(false);
    setPendingAction(null);
    if (action === 'save') {
      await handleSave();
    }
    if (pending?.type === 'select') {
      applySelection(pending.item);
      return;
    }
    if (pending?.type === 'close') {
      clearSelection();
      return;
    }
    if (pending?.type === 'cancel' && action === 'discard') {
      resetEdits();
    }
  };

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleDelete = async (item: QRHistoryItem) => {
    try {
      await deleteQRFromHistory(item.id);
      // Free up storage used by this QR's files (delete files from storage)
      await freeQRStorage(item);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (selectedId === item.id) {
        setSelectedId(null);
        setEditName('');
        setEditContent('');
      }
      toast.success('QR deleted');
      onRefreshRequest?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete QR';
      toast.error(message);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      // Get items before deletion to free storage
      const itemsToDelete = items.filter((item) => selectedIds.has(item.id));
      
      // Free up storage for all deleted QRs (delete files from storage) BEFORE deletion
      await Promise.all(itemsToDelete.map((item) => freeQRStorage(item)));
      
      await Promise.all(ids.map((id) => deleteQRFromHistory(id)));
      
      setItems((prev) => prev.filter((entry) => !selectedIds.has(entry.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      toast.success('Selected QR codes deleted');
      // Trigger refresh to sync across devices and update storage
      onRefreshRequest?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete selected QR codes';
      toast.error(message);
    } finally {
      setShowBulkDelete(false);
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    const payload: { name?: string | null; targetUrl?: string } = {};
    const desiredName = editName.trim();
    const currentName = selectedItem.name?.trim() ?? '';
    if (desiredName !== currentName) {
      payload.name = desiredName.length ? desiredName : null;
    }
    if (isDynamic && editContent.trim() && editContent.trim() !== selectedItem.content) {
      payload.targetUrl = editContent.trim();
    }
    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      return;
    }
    setIsSaving(true);
    try {
      const response = await updateQR(selectedItem.id, payload);
      if (response.data) {
        setItems((prev) => prev.map((entry) => (entry.id === selectedItem.id ? response.data! : entry)));
        setEditName(response.data.name?.trim() ?? '');
        setEditContent(response.data.content);
        toast.success('QR updated');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update QR';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedItem) return;
    const shareUrl = selectedItem.shortUrl ?? selectedItem.content;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!selectedItem) return;
    const shareUrl = selectedItem.shortUrl ?? selectedItem.content;
    const shareTitle = getDisplayName(selectedItem, sortedItems);
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to share link');
    }
  };

  const handleDownload = async (format: 'png' | 'svg' | 'jpeg' | 'pdf') => {
    if (!previewRef.current) return;
    try {
      if (format === 'png') await previewRef.current.downloadPng();
      else if (format === 'svg') await previewRef.current.downloadSvg();
      else if (format === 'jpeg') await previewRef.current.downloadJpeg();
      else await previewRef.current.downloadPdf();
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to download');
    }
  };

  const renderCardBadge = (item: QRHistoryItem) => {
    const parsed = parseKind(item.kind ?? null);
    // Check if item has adaptive config in options
    const isAdaptive = parsed.type === 'adaptive' || 
                       (item.options && typeof item.options === 'object' && 
                        'adaptive' in item.options && item.options.adaptive !== null);
    const itemType = isAdaptive ? 'adaptive' : parsed.type;
    const typeMeta = typeStyles[itemType] ?? typeStyles.url;
    const modeMeta = modeStyles[parsed.mode === 'dynamic' ? 'dynamic' : 'static'];
    const ModeIcon = parsed.mode === 'dynamic' ? Zap : QrCode;
    const TypeIcon = typeMeta.icon;
    return (
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] max-w-full">
        <span
          className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1 ${modeMeta.badge}`}
        >
          <ModeIcon className="h-3 w-3" />
          <span className="truncate">{parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}</span>
        </span>
        <span className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1 ${typeMeta.badge}`}>
          <TypeIcon className="h-3 w-3" />
          <span className="truncate">{typeMeta.label}</span>
        </span>
      </div>
    );
  };

  const getScanCountValue = (item: QRHistoryItem) => scanCounts[item.id] ?? 0;

  const renderScanCount = (
    item: QRHistoryItem,
    size: 'sm' | 'md' | 'lg' = 'md',
    align: 'left' | 'center' | 'right' = 'right'
  ) => {
    const count = getScanCountValue(item);
    const sizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
    const alignClass = align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';
    return (
      <span className={`min-w-[40px] font-semibold tabular-nums ${sizeClass} ${alignClass}`}>
        {count}
      </span>
    );
  };

  const pushScanNotification = (label: string) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(USER_FEED_KEY);
      const parsed = raw ? (JSON.parse(raw) as Array<{ id: string; message: string; createdAt: number }>) : [];
      const next = Array.isArray(parsed) ? parsed : [];
      next.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: `${label} got a scan!`,
        createdAt: Date.now(),
      });
      const trimmed = next.slice(0, MAX_USER_FEED);
      window.localStorage.setItem(USER_FEED_KEY, JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent('qrc:feed-update'));
    } catch {
      // ignore feed errors
    }
  };

  useEffect(() => {
    if (!onStatsChange) return;
    const dynamicCount = items.filter((item) => parseKind(item.kind ?? null).mode === 'dynamic').length;
    onStatsChange({ total: items.length, dynamic: dynamicCount });
  }, [items, onStatsChange]);

  useEffect(() => {
    if (!isDesktop) return;
    if (!pagedItems.length) return;

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      );
    };

    const getGridColumns = () => {
      if (viewMode !== 'grid') return 1;
      if (typeof window === 'undefined') return 1;
      const width = window.innerWidth;
      if (width >= 1536) return 4;
      if (width >= 1280) return 3;
      if (width >= 768) return 2;
      return 1;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === 'Delete') {
        if (!selectedId) return;
        const selected = sortedItems.find((item) => item.id === selectedId);
        if (selected) {
          event.preventDefault();
          setDeleteTarget(selected);
        }
        return;
      }
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
      if (!keys.includes(event.key)) return;

      const currentIndex = pagedItems.findIndex((item) => item.id === selectedId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const cols = getGridColumns();
      let nextIndex = startIndex;

      if (event.key === 'ArrowRight') nextIndex = startIndex + 1;
      if (event.key === 'ArrowLeft') nextIndex = startIndex - 1;
      if (event.key === 'ArrowDown') nextIndex = startIndex + cols;
      if (event.key === 'ArrowUp') nextIndex = startIndex - cols;

      nextIndex = Math.max(0, Math.min(pagedItems.length - 1, nextIndex));
      if (nextIndex !== startIndex) {
        event.preventDefault();
        applySelection(pagedItems[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, pagedItems, selectedId, sortedItems, viewMode]);

  const renderMobileDetailContent = ({ showBackButton }: { showBackButton: boolean }) => {
    if (!selectedItem) {
      return (
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
          {t('Tap a QR to view details.', 'Toca un QR para ver detalles.')}
        </div>
      );
    }

    return (
      <>
        {showBackButton && (
          <button
            ref={backButtonRef}
            type="button"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
            onClick={() => {
              clearSelection();
              if (typeof window !== 'undefined') {
                const container = detailRef.current?.closest('.h-[calc(100dvh-260px)]') as HTMLElement | null;
                if (listScrollRef.current) {
                  listScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (container) {
                  container.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('Back to Arsenal', 'Volver al Arsenal')}
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2 overflow-visible">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="group relative border-border"
              >
                <Download className="h-4 w-4" />
                <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {t('Download', 'Descargar')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card/95 border-border">
              <DropdownMenuItem onClick={() => handleDownload('png')}>PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('svg')}>SVG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('jpeg')}>JPEG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('pdf')}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            variant="outline"
            className="group relative border-border"
            onClick={handleShare}
          >
            <Send className="h-4 w-4" />
            <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
              {t('Share', 'Compartir')}
            </span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="group relative border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteTarget(selectedItem)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-destructive/80 opacity-0 transition group-hover:opacity-100">
              {t('Delete', 'Eliminar')}
            </span>
          </Button>
          {hasUnsavedChanges && (
            <>
              <Button
                size="icon"
                className="group relative bg-gradient-primary text-primary-foreground"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4" />
                <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {isSaving ? t('Saving', 'Guardando') : t('Save', 'Guardar')}
                </span>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="group relative border-border"
                onClick={() => {
                  setPendingAction({ type: 'cancel' });
                  setShowUnsavedPrompt(true);
                }}
              >
                <X className="h-4 w-4" />
                <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {t('Cancel', 'Cancelar')}
                </span>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              {t('Selected', 'Seleccionado')}
            </p>
            <Input
              value={editName}
              placeholder={selectedDisplayName}
              onChange={(event) => setEditName(event.target.value.slice(0, 25))}
              className="bg-secondary/40 border-border max-w-[280px]"
              maxLength={25}
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {renderScanCount(selectedItem)}
            {renderCardBadge(selectedItem)}
          </div>
        </div>

        <div className="flex justify-center">
          <QRPreview
            ref={previewRef}
            options={{
              ...selectedItem.options,
              content: getQrPreviewContent(selectedItem),
              size: 180,
            }}
            showCaption={false}
          />
        </div>
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t('QRC Name', 'Nombre del QRC')}: {editName.trim() || selectedDisplayName}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="group relative w-full text-center text-xs text-muted-foreground truncate hover:text-primary transition"
          title={selectedItem.shortUrl ?? selectedItem.content}
        >
          {selectedItem.shortUrl ?? selectedItem.content}
          <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
            {t('Copy', 'Copiar')}
          </span>
        </button>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {isDynamic ? t('Dynamic URL', 'URL dinamica') : t('QR Destination', 'Destino del QR')}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="group relative w-full text-left rounded-md transition hover:ring-1 hover:ring-primary/40"
          >
            <Input
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              className="bg-secondary/40 border-border pr-14 cursor-pointer transition group-hover:bg-secondary/60"
              readOnly={!isDynamic}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
              {t('Copy', 'Copiar')}
            </span>
          </button>
          {!isDynamic && (
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('Static QR destinations are read-only.', 'Los destinos QR estaticos son de solo lectura.')}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t('Live Preview', 'Vista previa')}
          </p>
          <div className="rounded-2xl border border-border/60 bg-secondary/20 overflow-hidden">
            <div className="flex items-center gap-1.5 bg-card/80 px-3 py-2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-rose-400/70" />
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span className="ml-2">{t('Preview', 'Vista previa')}</span>
            </div>
            {isWebUrl(selectedItem.content) ? (
              <img
                src={`https://image.thum.io/get/width/1200/${selectedItem.content}`}
                alt="Destination preview"
                className="aspect-video w-full object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src = '';
                }}
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                <ExternalLink className="h-6 w-6 text-primary" />
                {t('Preview available for web URLs only.', 'Vista previa disponible solo para URLs web.')}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Toolbar component for reuse
  const renderToolbar = () => (
    <div className={`flex w-full items-center justify-between gap-2 flex-nowrap qrc-arsenal-toolbar ${
      isMobileV2 ? 'sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 pt-2' : ''
    }`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant={isSelectMode ? 'secondary' : 'outline'}
          size="sm"
          className="border-border text-[10px] uppercase tracking-[0.2em] whitespace-nowrap px-2"
          onClick={() => {
            if (isSelectMode) {
              setSelectedIds(new Set());
            }
            setIsSelectMode((prev) => !prev);
          }}
        >
          <span className="truncate">
            {isSelectMode ? t('Cancel Select', 'Cancelar seleccion') : t('Select Multiple', 'Seleccion multiple')}
          </span>
        </Button>
        {isSelectMode && (
          <Button
            variant="outline"
            size="icon"
            className="group relative border-border shrink-0"
            onClick={() => setShowBulkDelete(true)}
            disabled={selectedIds.size === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
              {t('Delete', 'Eliminar')}
            </span>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="inline-flex rounded-full border border-border/60 bg-secondary/30 p-1">
          <button
            type="button"
            className={`h-8 w-8 rounded-full transition ${
              viewMode === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="mx-auto h-4 w-4" />
          </button>
          <button
            type="button"
            className={`h-8 w-8 rounded-full transition ${
              viewMode === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="mx-auto h-4 w-4" />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-[10px] uppercase tracking-[0.2em] px-2"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card/95 border-border">
            <DropdownMenuItem onClick={() => setSortMode('newest')}>
              <ArrowDownAz className="mr-2 h-4 w-4" />
              Newest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode('oldest')}>
              <ArrowUpAz className="mr-2 h-4 w-4" />
              Oldest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode('alpha')}>
              <ArrowDownAz className="mr-2 h-4 w-4" />
              Alphabetical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-overflow-check>
      {!isMobileV2 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {renderToolbar()}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{t('No QR codes yet.', 'Aun no hay codigos QR.')}</p>
          <p className="text-lg font-semibold">
            {t('Create your first QR Code to get started.', 'Crea tu primer Codigo QR para comenzar.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className={`glass-panel rounded-2xl p-4 min-w-0 max-w-full ${
            isMobileV2 ? 'flex flex-col overflow-hidden' : ''
          }`}>
            <ScrollArea
              ref={(node) => {
                if (!node) return;
                listScrollRef.current = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
              }}
              style={{ paddingRight: isMobile ? 12 : 0 }}
              className={
                isDesktop
                  ? 'h-auto max-h-none w-full max-w-full min-w-0 overflow-x-hidden'
                  : isMobileV2
                  ? 'qrc-arsenal-scroll qrc-no-scroll-x max-w-full w-full'
                  : `h-[calc(100dvh-260px)] sm:h-[calc(100dvh-320px)] max-w-full w-full overflow-y-auto`
              }
            >
              <div className="flex flex-col min-h-0">
                {isMobileV2 && renderToolbar()}
                {isMobileV2 && topContent && (
                  <div className="mb-4">
                    {topContent}
                  </div>
                )}
                <div
                  className={`flex-1 min-h-0 ${
                    viewMode === 'grid'
                      ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr min-w-0 max-w-full overflow-x-hidden'
                      : `space-y-2 w-full max-w-full min-w-0 overflow-x-hidden ${isMobileV2 ? 'qrc-arsenal-list' : ''}`
                  }`}
                >
                {pagedItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isChecked = selectedIds.has(item.id);
                  const parsed = parseKind(item.kind ?? null);
                  const typeMeta = typeStyles[parsed.type] ?? typeStyles.url;
                  const modeMeta = modeStyles[parsed.mode === 'dynamic' ? 'dynamic' : 'static'];
                  const isList = viewMode === 'list';
                  const isMobileList = isList && isMobile;
                  const displayName = getDisplayName(item, sortedItems);
                  const previewSize = isDesktop ? 120 : isMobileV2 ? 84 : 72;
                  const cardOptions: QROptions = {
                    ...item.options,
                    size: previewSize,
                    content: getQrPreviewContent(item),
                  };
                  // Long press handler for mobile
                  const handleTouchStart = (e: React.TouchEvent) => {
                    if (!isMobileV2) return;
                    const timer = setTimeout(() => {
                      // Long press detected - show delete option
                      setDeleteTarget(item);
                      // Haptic feedback if available
                      if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                      }
                    }, 500); // 500ms long press
                    setLongPressTimer((prev) => ({ ...prev, [item.id]: timer }));
                  };

                  const handleTouchEnd = (e: React.TouchEvent) => {
                    if (!isMobileV2) return;
                    const timer = longPressTimer[item.id];
                    if (timer) {
                      clearTimeout(timer);
                      setLongPressTimer((prev) => {
                        const next = { ...prev };
                        delete next[item.id];
                        return next;
                      });
                    }
                  };

                  const handleTouchCancel = (e: React.TouchEvent) => {
                    if (!isMobileV2) return;
                    const timer = longPressTimer[item.id];
                    if (timer) {
                      clearTimeout(timer);
                      setLongPressTimer((prev) => {
                        const next = { ...prev };
                        delete next[item.id];
                        return next;
                      });
                    }
                  };

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchCancel}
                      onClick={() => {
                        // Clear any pending long press
                        const timer = longPressTimer[item.id];
                        if (timer) {
                          clearTimeout(timer);
                          setLongPressTimer((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                          return; // Don't trigger click if long press was detected
                        }
                        if (isSelectMode) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) {
                              next.delete(item.id);
                            } else {
                              next.add(item.id);
                            }
                            return next;
                          });
                          return;
                        }
                        handleSelect(item);
                      }}
                      className={`group w-full rounded-2xl border text-left transition overflow-hidden min-w-0 max-w-full ${
                        isSelectMode && isChecked
                          ? 'border-amber-400/80 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                          : isSelected
                          ? 'border-amber-300/70 bg-amber-200/10 shadow-[0_0_18px_rgba(251,191,36,0.2)]'
                          : `${modeMeta.card} hover:border-primary/40 hover:bg-secondary/40`
                      } ${isMobile ? 'p-2.5' : 'p-4'} ${
                        viewMode === 'grid'
                          ? `${isMobile ? 'min-h-[150px]' : 'min-h-[210px]'} h-full flex flex-col justify-between`
                          : ''
                      } ${isMobileV2 ? 'max-w-full' : ''}`}
                    >
                      {isMobileList ? (
                        isMobileV2 ? (
                          <div className="flex flex-col gap-2 min-w-0 w-full overflow-hidden">
                            <div className="min-w-0 space-y-1">
                              <p
                                className="text-[13px] font-semibold leading-snug max-h-[2.6em] overflow-hidden"
                                title={displayName}
                              >
                                {displayName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-full">
                                {item.content}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2 min-w-0">
                              <span
                                className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] ${modeMeta.badge}`}
                              >
                                {parsed.mode === 'dynamic' ? (
                                  <Zap className="h-3 w-3" />
                                ) : (
                                  <QrCode className="h-3 w-3" />
                                )}
                                <span className="truncate">
                                  {parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}
                                </span>
                              </span>
                              <span
                                className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] ${typeMeta.badge}`}
                              >
                                <span className="truncate">{typeMeta.label}</span>
                              </span>
                              <div className="flex justify-end">
                                {renderScanCount(item, 'md', 'center')}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center justify-between gap-3 overflow-hidden ${
                              isMobileV2 ? 'min-w-0 max-w-full' : ''
                            }`}
                          >
                            <div className={`space-y-1 min-w-0 flex-1 overflow-hidden ${isMobileV2 ? 'pr-0' : 'pr-2'}`}>
                              <p className="text-[13px] font-semibold truncate" title={displayName}>
                                {displayName}
                              </p>
                              <p
                                className={`text-[11px] text-muted-foreground truncate ${
                                  isMobileV2 ? 'max-w-full' : 'max-w-[140px]'
                                }`}
                              >
                                {item.content}
                              </p>
                            </div>
                          <div
                            className={`flex items-center justify-end gap-2 text-[9px] uppercase tracking-[0.3em] ${
                              isMobileV2
                                ? 'flex-wrap max-w-full min-w-0'
                                : 'flex-wrap max-w-[45%] min-w-0 overflow-hidden'
                            }`}
                          >
                              <span
                                className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-0.5 ${modeMeta.badge}`}
                              >
                                {parsed.mode === 'dynamic' ? (
                                  <Zap className="h-3 w-3" />
                                ) : (
                                  <QrCode className="h-3 w-3" />
                                )}
                                <span className="sr-only">{parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}</span>
                              </span>
                              <span
                                className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-0.5 ${typeMeta.badge}`}
                              >
                                <span className="truncate">{typeMeta.label}</span>
                              </span>
                              {renderScanCount(item)}
                            </div>
                          </div>
                        )
                      ) : isDesktop && viewMode === 'grid' ? (
                        <div className="flex flex-col gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-semibold truncate" title={displayName}>
                              {displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.3em]">
                            {renderCardBadge(item)}
                            {renderScanCount(item, 'lg')}
                          </div>
                        </div>
                      ) : isMobile && viewMode === 'grid' ? (
                        isMobileV2 ? (
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p
                                className="text-[13px] font-semibold leading-snug max-h-[2.6em] overflow-hidden"
                                title={displayName}
                              >
                                {displayName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{item.content}</p>
                          <div className="mt-2 flex flex-col gap-1 text-[9px] uppercase tracking-[0.3em]">
                                <span
                                  className={`inline-flex w-full items-center justify-center gap-1 rounded-full border px-2 py-0.5 ${typeMeta.badge}`}
                                >
                                  <typeMeta.icon className="h-3 w-3" />
                                  <span className="truncate">{typeMeta.label}</span>
                                </span>
                                <span
                                  className={`inline-flex w-full items-center justify-center gap-1 rounded-full border px-2 py-0.5 ${modeMeta.badge}`}
                                >
                                  {parsed.mode === 'dynamic' ? (
                                    <Zap className="h-3 w-3" />
                                  ) : (
                                    <QrCode className="h-3 w-3" />
                                  )}
                                  <span className="truncate">
                                    {parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}
                                  </span>
                                </span>
                            {renderScanCount(item, 'lg', 'center')}
                              </div>
                            </div>
                            <div
                              className={`shrink-0 border overflow-hidden rounded-lg p-0.5 ${modeMeta.card}`}
                            >
                              <QRPreview
                                options={cardOptions}
                                showCaption={false}
                                innerPadding={4}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-stretch justify-between gap-3 h-full">
                            <div className="flex min-w-0 flex-1 flex-col">
                              <div className="space-y-1">
                                <p className="text-[13px] font-semibold truncate" title={displayName}>
                                  {displayName}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">{item.content}</p>
                              </div>
                              <div className="mt-auto flex items-center gap-2 flex-nowrap text-[9px] uppercase tracking-[0.3em]">
                                <span
                                  className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-0.5 ${modeMeta.badge}`}
                                >
                                  {parsed.mode === 'dynamic' ? (
                                    <Zap className="h-3 w-3" />
                                  ) : (
                                    <QrCode className="h-3 w-3" />
                                  )}
                                  <span className="truncate">{parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}</span>
                                </span>
                                <span
                                  className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-0.5 ${typeMeta.badge}`}
                                >
                                  <typeMeta.icon className="h-3 w-3" />
                                  <span className="truncate">{typeMeta.label}</span>
                                </span>
                                {renderScanCount(item)}
                              </div>
                            </div>
                            <div
                              className={`shrink-0 border overflow-hidden rounded-lg p-0.5 ${modeMeta.card}`}
                            >
                              <QRPreview
                                options={cardOptions}
                                showCaption={false}
                                innerPadding={4}
                              />
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-between gap-3 min-w-0 w-full overflow-hidden">
                          <div className="space-y-2 min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" title={displayName}>
                              {displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2 min-w-0 flex-wrap overflow-hidden">
                            {renderCardBadge(item)}
                            {renderScanCount(item, 'lg')}
                          </div>
                          {!isDesktop && (
                            <div
                              className={`shrink-0 border overflow-hidden ${
                                isMobile ? 'rounded-lg p-0.5' : 'rounded-xl p-1'
                              } ${modeMeta.card}`}
                            >
                              <QRPreview
                                options={cardOptions}
                                showCaption={false}
                                innerPadding={isMobile ? 4 : 12}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            </ScrollArea>
            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>
                  Page {currentPage} / {pageCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-border"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-border"
                    onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                    disabled={currentPage === pageCount}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-6 min-w-0 hidden lg:block">
            {selectedItem ? (
              <>
                <div className="flex flex-wrap items-center gap-2 overflow-visible">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="group relative border-border"
                      >
                        <Download className="h-4 w-4" />
                        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                          {t('Download', 'Descargar')}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card/95 border-border">
                      <DropdownMenuItem onClick={() => handleDownload('png')}>PNG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('svg')}>SVG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('jpeg')}>JPEG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('pdf')}>PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="icon"
                    variant="outline"
                    className="group relative border-border"
                    onClick={handleShare}
                  >
                    <Send className="h-4 w-4" />
                    <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      {t('Share', 'Compartir')}
                    </span>
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="group relative border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(selectedItem)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-destructive/80 opacity-0 transition group-hover:opacity-100">
                      {t('Delete', 'Eliminar')}
                    </span>
                  </Button>
                  {hasUnsavedChanges && (
                    <>
                      <Button
                        size="icon"
                        className="group relative bg-gradient-primary text-primary-foreground"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Check className="h-4 w-4" />
                        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                          {isSaving ? t('Saving', 'Guardando') : t('Save', 'Guardar')}
                        </span>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="group relative border-border"
                        onClick={() => {
                          setPendingAction({ type: 'cancel' });
                          setShowUnsavedPrompt(true);
                        }}
                      >
                        <X className="h-4 w-4" />
                        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                          {t('Cancel', 'Cancelar')}
                        </span>
                      </Button>
                    </>
                  )}
                </div>
                  <div className="space-y-2">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                        {t('Selected', 'Seleccionado')}
                      </p>
                      <Input
                        value={editName}
                        placeholder={selectedDisplayName}
                        onChange={(event) => setEditName(event.target.value.slice(0, 25))}
                        className="bg-secondary/40 border-border max-w-[280px]"
                        maxLength={25}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 max-w-full">
                      {renderScanCount(selectedItem)}
                      {renderCardBadge(selectedItem)}
                    </div>
                  </div>

                <div className="flex justify-center">
                  <QRPreview
                    ref={previewRef}
                    options={{
                      ...selectedItem.options,
                      content: getQrPreviewContent(selectedItem),
                      size: 180,
                    }}
                    showCaption={false}
                  />
                </div>
                <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t('QRC Name', 'Nombre del QRC')}: {editName.trim() || selectedDisplayName}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="group relative w-full text-center text-xs text-muted-foreground truncate hover:text-primary transition"
                  title={selectedItem.shortUrl ?? selectedItem.content}
                >
                  {selectedItem.shortUrl ?? selectedItem.content}
                  <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                    {t('Copy', 'Copiar')}
                  </span>
                </button>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {isDynamic ? t('Dynamic URL', 'URL dinamica') : t('QR Destination', 'Destino del QR')}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="group relative w-full text-left rounded-md transition hover:ring-1 hover:ring-primary/40"
                  >
                    <Input
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      className="bg-secondary/40 border-border pr-14 cursor-pointer transition group-hover:bg-secondary/60"
                      readOnly={!isDynamic}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      {t('Copy', 'Copiar')}
                    </span>
                  </button>
                  {!isDynamic && (
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t('Static QR destinations are read-only.', 'Los destinos QR estaticos son de solo lectura.')}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t('Live Preview', 'Vista previa')}
                  </p>
                  <div className="rounded-2xl border border-border/60 bg-secondary/20 overflow-hidden">
                    <div className="flex items-center gap-1.5 bg-card/80 px-3 py-2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                      <span className="ml-2">{t('Preview', 'Vista previa')}</span>
                    </div>
                    {isWebUrl(selectedItem.content) ? (
                      <img
                        src={`https://image.thum.io/get/width/1200/${selectedItem.content}`}
                        alt="Destination preview"
                        className="aspect-video w-full object-cover"
                        onError={(event) => {
                          (event.currentTarget as HTMLImageElement).src = '';
                        }}
                      />
                    ) : (
                      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                        <ExternalLink className="h-6 w-6 text-primary" />
                        {t('Preview available for web URLs only.', 'Vista previa disponible solo para URLs web.')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a QR from your arsenal to edit or download.
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && sortedItems.length > 0 && (
        <div
          ref={detailRef}
          className={`glass-panel rounded-2xl p-6 space-y-6 lg:hidden ${isMobileV2 ? 'hidden' : ''}`}
        >
          {renderMobileDetailContent({ showBackButton: true })}
        </div>
      )}

      {isMobileV2 && (
        <Drawer
          open={Boolean(selectedItem)}
          onOpenChange={(open) => {
            if (open) return;
            if (hasUnsavedChanges) {
              setPendingAction({ type: 'close' });
              setShowUnsavedPrompt(true);
              return;
            }
            clearSelection();
          }}
        >
          <DrawerContent className="max-h-[90dvh] overflow-hidden qrc-v2-drawer flex flex-col">
            <DrawerHeader className="flex items-center justify-between qrc-v2-drawer-header">
              <DrawerTitle>
                {selectedItem ? getDisplayName(selectedItem, sortedItems) : t('QR Details', 'Detalles del QR')}
              </DrawerTitle>
              <DrawerClose asChild>
                <button type="button" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t('Close', 'Cerrar')}
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-6 qrc-v2-drawer-body">
              {renderMobileDetailContent({ showBackButton: false })}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete selected QR codes?', 'Eliminar codigos QR seleccionados?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `This will permanently delete ${selectedIds.size} QR code${selectedIds.size === 1 ? '' : 's'} from your Arsenal and database.`,
                `Esto eliminara permanentemente ${selectedIds.size} codigo${selectedIds.size === 1 ? '' : 's'} QR de tu Arsenal y la base de datos.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowBulkDelete(false);
                setSelectedIds(new Set());
                setIsSelectMode(false);
              }}
            >
              {t('Cancel', 'Cancelar')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>{t('Delete', 'Eliminar')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete this QR code?', 'Eliminar este codigo QR?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'This removes the QR code and its short URL permanently. This action cannot be undone.',
                'Esto elimina permanentemente el codigo QR y su URL corta. Esta accion no se puede deshacer.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              {t('No, keep it', 'No, mantener')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await handleDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('Yes, delete', 'Si, eliminar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnsavedPrompt} onOpenChange={setShowUnsavedPrompt}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Unsaved changes', 'Cambios sin guardar')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('You have unsaved edits. Save them before leaving?', 'Tienes cambios sin guardar. Guardarlos antes de salir?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-wrap gap-2">
            <AlertDialogCancel onClick={() => setShowUnsavedPrompt(false)}>
              {t('Keep editing', 'Seguir editando')}
            </AlertDialogCancel>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => resolveUnsavedAction('discard')}
            >
              {t('Discard', 'Descartar')}
            </Button>
            <AlertDialogAction onClick={() => resolveUnsavedAction('save')}>
              {t('Save', 'Guardar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
