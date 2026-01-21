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
    card: 'border-amber-300/50',
    badge: 'bg-amber-300/10 text-amber-200 border-amber-300/50',
  },
  phone: {
    label: 'Phone',
    icon: Phone,
    card: 'border-emerald-300/50',
    badge: 'bg-emerald-400/10 text-emerald-200 border-emerald-300/50',
  },
  email: {
    label: 'Email',
    icon: Mail,
    card: 'border-sky-300/50',
    badge: 'bg-sky-400/10 text-sky-200 border-sky-300/50',
  },
  file: {
    label: 'File',
    icon: File,
    card: 'border-indigo-300/50',
    badge: 'bg-indigo-400/10 text-indigo-200 border-indigo-300/50',
  },
  menu: {
    label: 'Menu',
    icon: Utensils,
    card: 'border-orange-300/50',
    badge: 'bg-orange-400/10 text-orange-200 border-orange-300/50',
  },
  vcard: {
    label: 'VCard',
    icon: Contact,
    card: 'border-violet-300/50',
    badge: 'bg-violet-400/10 text-violet-200 border-violet-300/50',
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
    | null
  >(null);
  const previewRef = useRef<QRPreviewHandle>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const t = (en: string, es: string) => (language === 'es' ? es : en);
  const isMobile = !isDesktop;
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
    if (!isDesktop && detailRef.current) {
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const ModeIcon = parsed.mode === 'dynamic' ? Zap : QrCode;
    const TypeIcon = typeMeta.icon;
    return (
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] max-w-full">
        <span
          className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1 ${
            parsed.mode === 'dynamic'
              ? 'border-cyan-400/60 text-cyan-200 bg-cyan-500/10'
              : 'border-border/60 text-muted-foreground bg-secondary/40'
          }`}
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

  const renderScanCount = (item: QRHistoryItem) => {
    const count = scanCounts[item.id] ?? 0;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Arsenal</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t('Your QR Arsenal', 'Tu Arsenal QR')}
          </h2>
        </div>
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
              className={
                isDesktop
                  ? 'h-auto max-h-none'
                  : 'h-[calc(100dvh-260px)] sm:h-[calc(100dvh-320px)]'
              }
            >
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr'
                    : 'space-y-2'
                }
              >
                {pagedItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isChecked = selectedIds.has(item.id);
                  const parsed = parseKind(item.kind ?? null);
                  const typeMeta = typeStyles[parsed.type] ?? typeStyles.url;
                  const isList = viewMode === 'list';
                  const isMobileList = isList && isMobile;
                  const displayName = getDisplayName(item, sortedItems);
                  const previewSize = isDesktop ? 120 : 72;
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
                      className={`group w-full rounded-2xl border text-left transition overflow-hidden ${
                        isSelectMode && isChecked
                          ? 'border-primary/60 bg-primary/10 shadow-[0_0_18px_rgba(59,130,246,0.18)]'
                          : isSelected
                          ? 'border-primary/60 bg-primary/5 shadow-[0_0_18px_rgba(59,130,246,0.12)]'
                          : `${typeMeta.card} hover:border-primary/40 hover:bg-secondary/40`
                      } ${isMobile ? 'p-2.5' : 'p-4'} ${
                        viewMode === 'grid'
                          ? `${isMobile ? 'min-h-[150px]' : 'min-h-[210px]'} h-full flex flex-col justify-between`
                          : ''
                      }`}
                    >
                      {isMobileList ? (
                        <div className="space-y-2.5">
                          <div className="space-y-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" title={displayName}>
                              {displayName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.content}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.3em]">
                            <span
                              className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-0.5 ${
                                parsed.mode === 'dynamic'
                                  ? 'border-cyan-400/60 text-cyan-200 bg-cyan-500/10'
                                  : 'border-border/60 text-muted-foreground bg-secondary/40'
                              }`}
                            >
                              <span className="truncate">{parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}</span>
                            </span>
                            <span
                              className={`inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-0.5 ${typeMeta.badge}`}
                            >
                              <span className="truncate">{typeMeta.label}</span>
                            </span>
                            {renderScanCount(item)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" title={displayName}>
                              {displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {renderScanCount(item)}
                              {renderCardBadge(item)}
                            </div>
                          </div>
                          {(isDesktop || viewMode === 'grid') && (
                            <div
                              className={`shrink-0 border overflow-hidden ${
                                isMobile ? 'rounded-lg p-0.5' : 'rounded-xl p-1'
                              } ${typeMeta.card}`}
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
                      {isEditingTitle ? (
                        <Input
                          value={editName}
                          placeholder={selectedDisplayName}
                          onChange={(event) => setEditName(event.target.value.slice(0, 25))}
                          onBlur={() => setIsEditingTitle(false)}
                          className="bg-secondary/40 border-border max-w-[280px]"
                          maxLength={25}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-lg font-semibold truncate text-left hover:text-primary transition"
                          title={selectedDisplayName}
                          onClick={() => setIsEditingTitle(true)}
                        >
                          {selectedDisplayName}
                        </button>
                      )}
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
                    {t('QR Name', 'Nombre del QR')}
                  </p>
                  <Input
                    value={editName}
                    placeholder={selectedDisplayName}
                    className="bg-secondary/40 border-border"
                    readOnly
                  />
                </div>

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
        <div ref={detailRef} className="glass-panel rounded-2xl p-6 space-y-6 lg:hidden">
          {selectedItem ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
                onClick={() => {
                  clearSelection();
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('Back to Arsenal', 'Volver al Arsenal')}
              </button>
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
                  {isEditingTitle ? (
                    <Input
                      value={editName}
                      placeholder={selectedDisplayName}
                      onChange={(event) => setEditName(event.target.value.slice(0, 25))}
                      onBlur={() => setIsEditingTitle(false)}
                      className="bg-secondary/40 border-border max-w-[280px]"
                      maxLength={25}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-lg font-semibold truncate text-left hover:text-primary transition"
                      title={selectedDisplayName}
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {selectedDisplayName}
                    </button>
                  )}
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
                  {t('QR Name', 'Nombre del QR')}
                </p>
                <Input
                  value={editName}
                  placeholder={selectedDisplayName}
                  className="bg-secondary/40 border-border"
                  readOnly
                />
              </div>

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
            <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
              {t('Tap a QR to view details.', 'Toca un QR para ver detalles.')}
            </div>
          )}
        </div>
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
