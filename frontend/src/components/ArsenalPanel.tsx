import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownAz,
  ArrowDownUp,
  ArrowUpAz,
  Download,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  QrCode,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRHistoryItem, QROptions } from '@/types/qr';
import { deleteQRFromHistory, getQRHistory, updateQR } from '@/lib/api';
import { Button } from '@/components/ui/button';
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

const getDisplayName = (item: QRHistoryItem) => {
  return item.name?.trim() || item.content || `QR-${item.id.slice(0, 6)}`;
};

const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

export function ArsenalPanel() {
  const [items, setItems] = useState<QRHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<QRPreviewHandle>(null);

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
  }, []);

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

  const selectedItem = sortedItems.find((item) => item.id === selectedId) ?? null;
  const isDynamic = selectedItem?.kind === 'dynamic';

  const handleSelect = (item: QRHistoryItem) => {
    setSelectedId(item.id);
    setEditName(getDisplayName(item));
    setEditContent(item.content);
  };

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
    const dynamic = item.kind === 'dynamic';
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${
          dynamic
            ? 'border-cyan-400/60 text-cyan-200 bg-cyan-500/10'
            : 'border-amber-300/60 text-amber-200 bg-amber-300/10'
        }`}
      >
        {dynamic ? <Zap className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
        {dynamic ? 'Dynamic' : 'Static'}
      </span>
    );
  };

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
              <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-2'}>
                {sortedItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const dynamic = item.kind === 'dynamic';
                  const cardOptions: QROptions = {
                    ...item.options,
                    size: 96,
                    content: item.content,
                  };
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`group w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-primary/60 bg-primary/5 shadow-[0_0_18px_rgba(59,130,246,0.12)]'
                          : 'border-border/60 hover:border-primary/40 hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">{getDisplayName(item)}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                          {renderCardBadge(item)}
                        </div>
                        <div className={`rounded-2xl border p-2 ${dynamic ? 'border-cyan-400/40' : 'border-amber-300/40'}`}>
                          <QRPreview options={cardOptions} showCaption={false} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-6">
            {selectedItem ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Selected</p>
                    <h3 className="text-lg font-semibold">{getDisplayName(selectedItem)}</h3>
                  </div>
                  {renderCardBadge(selectedItem)}
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
                    {isWebUrl(selectedItem.content) ? (
                      <img
                        src={`https://image.thum.io/get/width/900/${encodeURIComponent(selectedItem.content)}`}
                        alt="Destination preview"
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
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
                    onClick={() => handleDelete(selectedItem)}
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
    </div>
  );
}
