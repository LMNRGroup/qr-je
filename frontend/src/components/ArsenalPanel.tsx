import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownAz,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpAz,
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

const getDisplayName = (item: QRHistoryItem) => {
  return item.name?.trim() || item.content || `QR-${item.id.slice(0, 6)}`;
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
}: {
  refreshKey?: number;
  onStatsChange?: (stats: { total: number; dynamic: number }) => void;
  onScansChange?: (total: number) => void;
  onRefreshRequest?: () => void;
}) {
  const [items, setItems] = useState<QRHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<QRHistoryItem | null>(null);
  const previewRef = useRef<QRPreviewHandle>(null);
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const response = await getQRHistory();
        if (response.success) {
          setItems(response.data);
          if (response.data.length > 0) {
            const first = response.data[0];
            setSelectedId(first.id);
            setEditName(getDisplayName(first));
            setEditContent(first.content);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load arsenal';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [refreshKey]);

  useEffect(() => {
    if (!items.length) {
      setScanCounts({});
      onScansChange?.(0);
      return;
    }
    let isActive = true;
    Promise.all(
      items.map(async (item) => {
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
    ).then((results) => {
      if (!isActive) return;
      const next: Record<string, number> = {};
      let total = 0;
      results.forEach(({ id, count }) => {
        next[id] = count;
        total += count;
      });
      setScanCounts(next);
      onScansChange?.(total);
    });
    return () => {
      isActive = false;
    };
  }, [items, onScansChange]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sortMode === 'newest') {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortMode === 'oldest') {
      copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      copy.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
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
  const selectedKind = parseKind(selectedItem?.kind ?? null);
  const isDynamic = selectedKind.mode === 'dynamic';

  const handleSelect = (item: QRHistoryItem) => {
    setSelectedId(item.id);
    setEditName(getDisplayName(item));
    setEditContent(item.content);
  };

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

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

  const handleSave = async () => {
    if (!selectedItem) return;
    const payload: { name?: string | null; targetUrl?: string } = {};
    if (editName.trim() !== getDisplayName(selectedItem)) {
      payload.name = editName.trim();
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
        setEditName(getDisplayName(response.data));
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
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
            parsed.mode === 'dynamic'
              ? 'border-cyan-400/60 text-cyan-200 bg-cyan-500/10'
              : 'border-border/60 text-muted-foreground bg-secondary/40'
          }`}
        >
          <ModeIcon className="h-3 w-3" />
          {parsed.mode === 'dynamic' ? 'Dynamic' : 'Static'}
        </span>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${typeMeta.badge}`}>
          <TypeIcon className="h-3 w-3" />
          {typeMeta.label}
        </span>
      </div>
    );
  };

  const renderScanCount = (item: QRHistoryItem) => {
    const count = scanCounts[item.id] ?? 0;
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Scans {count}
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
          <h2 className="text-3xl font-semibold tracking-tight">Your QR Arsenal</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <p className="text-sm text-muted-foreground">No QR codes yet.</p>
          <p className="text-lg font-semibold">Create your first QR Code to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel rounded-2xl p-4">
            <ScrollArea className="h-[520px]">
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 auto-rows-fr'
                    : 'space-y-2'
                }
              >
                {pagedItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const parsed = parseKind(item.kind ?? null);
                  const typeMeta = typeStyles[parsed.type] ?? typeStyles.url;
                  const cardOptions: QROptions = {
                    ...item.options,
                    size: 92,
                    content: item.content,
                  };
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`group w-full rounded-2xl border p-4 text-left transition overflow-hidden ${
                        isSelected
                          ? 'border-primary/60 bg-primary/5 shadow-[0_0_18px_rgba(59,130,246,0.12)]'
                          : `${typeMeta.card} hover:border-primary/40 hover:bg-secondary/40`
                      } ${
                        viewMode === 'grid' ? 'min-h-[210px] h-full flex flex-col justify-between' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 min-w-0">
                          <p className="text-sm font-semibold truncate">{getDisplayName(item)}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {renderScanCount(item)}
                            {renderCardBadge(item)}
                          </div>
                        </div>
                        <div
                          className={`rounded-2xl border p-2 shrink-0 ${typeMeta.card}`}
                        >
                          <QRPreview options={cardOptions} showCaption={false} />
                        </div>
                      </div>
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

          <div className="glass-panel rounded-2xl p-6 space-y-6">
            {selectedItem ? (
              <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Selected</p>
                      <h3 className="text-lg font-semibold">{getDisplayName(selectedItem)}</h3>
                    </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {renderScanCount(selectedItem)}
                    {renderCardBadge(selectedItem)}
                  </div>
                  </div>

                <div className="flex justify-center">
                  <QRPreview
                    ref={previewRef}
                    options={{ ...selectedItem.options, content: selectedItem.content, size: 180 }}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">QR Name</p>
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value.slice(0, 25))}
                    className="bg-secondary/40 border-border"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {isDynamic ? 'Dynamic URL' : 'QR Destination'}
                  </p>
                  <Input
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    className="bg-secondary/40 border-border"
                    readOnly={!isDynamic}
                  />
                  {!isDynamic && (
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      Static QR destinations are read-only.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live Preview</p>
                  <div className="rounded-2xl border border-border/60 bg-secondary/20 overflow-hidden">
                    <div className="flex items-center gap-1.5 bg-card/80 px-3 py-2 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                      <span className="ml-2">Preview</span>
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
                        Preview available for web URLs only.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-2 bg-secondary/60 border border-border hover:border-primary hover:bg-primary/10">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card/95 border-border">
                      <DropdownMenuItem onClick={() => handleDownload('png')}>PNG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('svg')}>SVG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('jpeg')}>JPEG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('pdf')}>PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="outline" className="border-border" onClick={handleCopy}>
                    Share
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-primary text-primary-foreground"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(selectedItem)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this QR code?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the QR code and its short URL permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await handleDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
