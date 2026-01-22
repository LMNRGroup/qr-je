import { useEffect, useMemo, useRef, useState } from 'react';
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
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRHistoryItem, QROptions } from '@/types/qr';
import { deleteQRFromHistory, getQRHistory, getScanCount, updateQR } from '@/lib/api';
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

const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

const parseKind = (kind?: string | null) => {
  if (!kind) return { mode: 'static', type: 'url' };
  if (kind === 'vcard') return { mode: 'static', type: 'vcard' };
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
};

const modeStyles: Record<'dynamic' | 'static', { card: string; badge: string }> = {
  dynamic: {
    card: 'border-violet-500/70 bg-gradient-to-br from-violet-500/15 via-transparent to-amber-400/15 dark:border-violet-400/60 dark:from-violet-500/10 dark:to-amber-400/10',
    badge:
      'border-violet-600/70 text-white bg-gradient-to-r from-violet-700/80 to-amber-600/80 ' +
      'dark:border-violet-400/60 dark:text-violet-200 dark:from-violet-500/20 dark:to-amber-400/20',
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
}: {
  refreshKey?: number;
  onStatsChange?: (stats: { total: number; dynamic: number }) => void;
  onScansChange?: (total: number) => void;
  onRefreshRequest?: () => void;
  language?: 'en' | 'es';
  timeZone?: string;
  cacheKey?: string;
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
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
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
      return { counts: {} as Record<string, number>, today: 0 };
    }
    let todayTotal = 0;
    const results = await Promise.all(
      list.map(async (item) => {
        if (!item.random) {
          return { id: item.id, count: 0 };
        }
        try {
          const count = await getScanCount(item.id, item.random);
          return { id: item.id, count };
        } catch {
          return { id: item.id, count: 0 };
        }
      })
    );
    setScanCounts((prev) => {
      const next = { ...prev };
      results.forEach(({ id, count }) => {
        next[id] = count;
      });
      return next;
    });
    const totalScans = results.reduce((sum, { count }) => sum + count, 0);
    if (includeSummary) {
      todayTotal = totalScans;
      lastTodayRef.current = totalScans;
      onScansChange?.(totalScans);
    }
    const counts = results.reduce<Record<string, number>>((acc, { id, count }) => {
      acc[id] = count;
      return acc;
    }, {});
    return { counts, today: todayTotal };
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
      await Promise.all(ids.map((id) => deleteQRFromHistory(id)));
      setItems((prev) => prev.filter((entry) => !selectedIds.has(entry.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      toast.success('Selected QR codes deleted');
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
    const typeMeta = typeStyles[parsed.type] ?? typeStyles.url;
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

  const renderScanCount = (item: QRHistoryItem) => {
    const count = getScanCountValue(item);
    return (
      <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground max-w-full">
        <span className="truncate">{t('Scans', 'Escaneos')} {count}</span>
      </span>
    );
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
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
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

  return (
    <div className="space-y-6" data-overflow-check>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Arsenal</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t('Your QR Arsenal', 'Tu Arsenal QR')}
          </h2>
        </div>
        {isMobileV2 ? (
          <div className="flex w-full items-center justify-between gap-2 flex-nowrap">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Button
                variant={isSelectMode ? 'secondary' : 'outline'}
                size="sm"
                className="border-border text-xs uppercase tracking-[0.25em] min-w-0 max-w-[45%]"
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
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex rounded-full border border-border/60 bg-secondary/30 p-1">
                <button
                  type="button"
                  className={`h-9 w-9 rounded-full transition ${
                    viewMode === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="mx-auto h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`h-9 w-9 rounded-full transition ${
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
                  <Button variant="outline" size="sm" className="border-border text-xs uppercase tracking-[0.25em]">
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
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isSelectMode ? 'secondary' : 'outline'}
              size="sm"
              className="border-border text-xs uppercase tracking-[0.25em]"
              onClick={() => {
                if (isSelectMode) {
                  setSelectedIds(new Set());
                }
                setIsSelectMode((prev) => !prev);
              }}
            >
              {isSelectMode ? t('Cancel Select', 'Cancelar seleccion') : t('Select Multiple', 'Seleccion multiple')}
            </Button>
            {isSelectMode && (
              <Button
                variant="outline"
                size="icon"
                className="group relative border-border"
                onClick={() => setShowBulkDelete(true)}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {t('Delete', 'Eliminar')}
                </span>
              </Button>
            )}
            <div className="inline-flex rounded-full border border-border/60 bg-secondary/30 p-1">
              <button
                type="button"
                className={`h-9 w-9 rounded-full transition ${
                  viewMode === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="mx-auto h-4 w-4" />
              </button>
              <button
                type="button"
                className={`h-9 w-9 rounded-full transition ${
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
                <Button variant="outline" size="sm" className="border-border text-xs uppercase tracking-[0.25em]">
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
        )}
      </div>

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
          <div className="glass-panel rounded-2xl p-4">
            <ScrollArea
              ref={(node) => {
                if (!node) return;
                listScrollRef.current = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
              }}
              className={
                isDesktop
                  ? 'h-auto max-h-none'
                  : `h-[calc(100dvh-260px)] sm:h-[calc(100dvh-320px)] ${
                      isMobileV2 ? 'qrc-arsenal-scroll qrc-no-scroll-x max-w-full' : ''
                    }`
              }
            >
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr'
                    : `space-y-2 w-full max-w-full ${isMobileV2 ? 'qrc-arsenal-list' : ''}`
                }
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
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
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
                          ? 'border-primary/60 bg-primary/10 shadow-[0_0_18px_rgba(59,130,246,0.18)]'
                          : isSelected
                          ? 'border-border/60 bg-secondary/20 shadow-none'
                          : `${modeMeta.card} hover:border-primary/40 hover:bg-secondary/40`
                      } ${isMobile ? 'p-2.5' : 'p-4'} ${
                        viewMode === 'grid'
                          ? `${isMobile ? 'min-h-[150px]' : 'min-h-[210px]'} h-full flex flex-col justify-between`
                          : ''
                      } ${isMobileV2 ? 'max-w-full' : ''}`}
                    >
                      {isMobileList ? (
                        isMobileV2 ? (
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p
                                className="text-[13px] font-semibold leading-snug max-h-[2.6em] overflow-hidden"
                                title={displayName}
                              >
                                {displayName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{item.content}</p>
                            </div>
                            <div className="flex w-[88px] flex-col items-center justify-center gap-1 text-[8px] uppercase tracking-[0.25em] shrink-0">
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
                              <span
                                className={`inline-flex w-full items-center justify-center gap-1 rounded-full border px-2 py-0.5 ${typeMeta.badge}`}
                              >
                                <span className="truncate">{typeMeta.label}</span>
                              </span>
                              <div className="w-full flex items-center justify-center">
                                <div className="mt-1 flex flex-col items-center justify-center">
                                  <span className="text-base font-semibold text-foreground">
                                    {getScanCountValue(item)}
                                  </span>
                                </div>
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
                              className={`flex items-center justify-end gap-2 text-[9px] uppercase tracking-[0.3em] shrink-0 ${
                                isMobileV2 ? 'flex-wrap max-w-full min-w-0' : 'flex-nowrap max-w-[45%] overflow-hidden'
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
                          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
                            {renderCardBadge(item)}
                            {renderScanCount(item)}
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
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-2 min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" title={displayName}>
                              {displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2 shrink-0 flex-nowrap">
                            {renderCardBadge(item)}
                            {renderScanCount(item)}
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
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4" />
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
