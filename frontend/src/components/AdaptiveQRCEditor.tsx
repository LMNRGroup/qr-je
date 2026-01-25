import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import { 
  X, 
  Loader2,
  Sparkles,
  Save,
  Timer,
  Users,
  Globe,
  Copy,
  Download,
  ExternalLink,
  Upload,
  File as FileIcon,
  Link as LinkIcon,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdaptiveConfig } from '@/types/qr';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';

interface AdaptiveContent {
  id: string;
  name: string;
  url: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: 'image' | 'pdf';
  fileName?: string;
  fileDataUrl?: string;
  file?: File;
  inputType: 'url' | 'file';
  uploading?: boolean;
  uploadProgress?: number;
  uploadError?: string;
}

interface TimeRule {
  id: string;
  contentId: string;
  startTime?: string;
  endTime?: string;
  days?: string[];
  startDate?: string;
  endDate?: string;
}

interface VisitRule {
  id: string;
  contentId: string;
  visitNumber: 1 | 2;
}

type RuleType = 'time' | 'visit' | null;

interface AdaptiveQRCEditorProps {
  adaptiveQRC: any;
  userProfile: any;
  onSave: (config: AdaptiveConfig, qrName: string) => Promise<void>;
  onClose: () => void;
  isMobile?: boolean;
  isMobileV2?: boolean;
}

export const AdaptiveQRCEditor = ({
  adaptiveQRC,
  userProfile,
  onSave,
  onClose,
  isMobile = false,
  isMobileV2 = false,
}: AdaptiveQRCEditorProps) => {
  const [qrName, setQrName] = useState(adaptiveQRC?.name || '');
  const [ruleType, setRuleType] = useState<RuleType>(null);
  const [contents, setContents] = useState<AdaptiveContent[]>([]);
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  const [visitRules, setVisitRules] = useState<VisitRule[]>([]);
  const [defaultContentId, setDefaultContentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'contents' | 'rules' | 'preview'>('contents');
  const qrRef = useRef<QRPreviewHandle>(null);
  const contentFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const appBaseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');

  const QR_ASSETS_BUCKET = 'qr-assets';
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
  const STORAGE_KEY = 'qrc.storage.usage';
  const MAX_STORAGE_BYTES = 25 * 1024 * 1024; // 25MB

  // Helper functions for file upload (same as wizard)
  const dataUrlToBlob = (dataUrl: string) => {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  };

  const getStorageUsage = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  };

  const addStorageUsage = (bytes: number) => {
    if (typeof window === 'undefined') return;
    try {
      const current = getStorageUsage();
      const updated = current + bytes;
      localStorage.setItem(STORAGE_KEY, String(updated));
      window.dispatchEvent(new CustomEvent('qrc:storage-update', { detail: updated }));
    } catch {
      // Ignore storage errors
    }
  };

  const checkStorageLimit = (additionalBytes: number): { allowed: boolean; current: number; limit: number; available: number } => {
    const current = getStorageUsage();
    const limit = MAX_STORAGE_BYTES;
    const available = limit - current;
    const allowed = current + additionalBytes <= limit;
    return { allowed, current, limit, available };
  };

  const readAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Invalid file data'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const compressImageFile = async (
    file: File,
    { maxDimension = 2000, quality = 0.80 }: { maxDimension?: number; quality?: number } = {}
  ): Promise<string> => {
    const dataUrl = await readAsDataUrl(file);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });
    
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    try {
      const webpDataUrl = canvas.toDataURL('image/webp', quality);
      if (webpDataUrl && webpDataUrl.length < dataUrl.length * 0.8) {
        return webpDataUrl;
      }
    } catch {
      // WebP not supported
    }
    
    return canvas.toDataURL('image/jpeg', quality);
  };

  const uploadQrAsset = async (file: File, folder: 'files' | 'menus' | 'logos', dataUrl?: string): Promise<{ url: string; size: number } | null> => {
    if (!isSupabaseConfigured) {
      throw new Error('Storage is not configured yet.');
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be signed in to upload files.');
    }
    
    try {
      const extension = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'png');
      const fileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = `${folder}/${fileName}`;
      
      let payload: Blob | File;
      let compressedSize: number;
      
      if (dataUrl) {
        const blob = dataUrlToBlob(dataUrl);
        payload = blob;
        compressedSize = blob.size;
      } else {
        payload = file;
        compressedSize = file.size;
      }
      
      const storageCheck = checkStorageLimit(compressedSize);
      if (!storageCheck.allowed) {
        const availableMB = (storageCheck.available / (1024 * 1024)).toFixed(1);
        const neededMB = (compressedSize / (1024 * 1024)).toFixed(1);
        throw new Error(`Storage limit exceeded. You have ${availableMB}MB available, but need ${neededMB}MB.`);
      }
      
      const { error } = await supabase.storage
        .from(QR_ASSETS_BUCKET)
        .upload(filePath, payload, { upsert: true, contentType: file.type });
      
      if (error) {
        throw new Error(error.message || 'Failed to upload file.');
      }
      
      addStorageUsage(compressedSize);
      
      const { data } = supabase.storage.from(QR_ASSETS_BUCKET).getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file.');
      }
      return { url: data.publicUrl, size: compressedSize };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Upload failed: ${String(error)}`);
    }
  };

  // Load existing config
  useEffect(() => {
    if (adaptiveQRC?.options?.adaptive) {
      const adaptive = adaptiveQRC.options.adaptive;
      setQrName(adaptiveQRC.name || '');
      
      if (adaptive.slots && adaptive.slots.length > 0) {
        const loadedContents = adaptive.slots.map((slot: any, index: number) => ({
          id: slot.id || crypto.randomUUID(),
          name: slot.name || `Content ${index + 1}`,
          url: slot.url || '',
          fileUrl: slot.fileUrl,
          fileSize: slot.fileSize,
          fileType: slot.fileType,
          fileName: slot.fileUrl ? slot.fileUrl.split('/').pop() : undefined,
          inputType: slot.fileUrl ? 'file' : 'url',
        }));
        setContents(loadedContents);
        if (adaptive.defaultSlot) {
          setDefaultContentId(adaptive.defaultSlot);
        }
      }

      // Determine rule type
      if (adaptive.dateRules && adaptive.dateRules.length > 0) {
        setRuleType('time');
        const loadedRules = adaptive.dateRules.map((rule: any) => ({
          id: crypto.randomUUID(),
          contentId: rule.slot || '',
          startTime: rule.startTime,
          endTime: rule.endTime,
          days: rule.days,
          startDate: rule.startDate,
          endDate: rule.endDate,
        }));
        setTimeRules(loadedRules);
      } else if (adaptive.firstReturn) {
        setRuleType('visit');
        const loadedRules: VisitRule[] = [];
        if (adaptive.firstReturn.firstSlot) {
          loadedRules.push({
            id: crypto.randomUUID(),
            contentId: adaptive.firstReturn.firstSlot,
            visitNumber: 1,
          });
        }
        if (adaptive.firstReturn.returnSlot) {
          loadedRules.push({
            id: crypto.randomUUID(),
            contentId: adaptive.firstReturn.returnSlot,
            visitNumber: 2,
          });
        }
        setVisitRules(loadedRules);
      }
    }
  }, [adaptiveQRC]);

  const handleContentChange = (id: string, field: 'url' | 'name' | 'inputType', value: string) => {
    setContents(contents.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      // When switching input type, clear the other field
      if (field === 'inputType') {
        if (value === 'url') {
          updated.fileUrl = undefined;
          updated.fileSize = undefined;
          updated.fileType = undefined;
          updated.file = undefined;
          updated.fileDataUrl = undefined;
          updated.fileName = undefined;
        } else {
          updated.url = '';
        }
      }
      return updated;
    }));
  };

  const handleContentFileUpload = async (contentId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      toast.error('Please upload a PDF, PNG, or JPEG file.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
      toast.error(`File is too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`);
      return;
    }

    setContents(contents.map(c => 
      c.id === contentId 
        ? { ...c, uploading: true, uploadProgress: 0, uploadError: undefined }
        : c
    ));

    try {
      const progressInterval = setInterval(() => {
        setContents(prev => prev.map(c => {
          if (c.id === contentId && c.uploading) {
            return { ...c, uploadProgress: Math.min(90, (c.uploadProgress || 0) + Math.random() * 10) };
          }
          return c;
        }));
      }, 200);

      let compressed = '';
      let fileType: 'image' | 'pdf' = isPdf ? 'pdf' : 'image';
      
      if (isImage) {
        toast.info('Compressing image...');
        compressed = await compressImageFile(file, { maxDimension: 2000, quality: 0.80 });
      } else if (isPdf) {
        toast.info('Preparing PDF...');
      }

      const result = await uploadQrAsset(file, 'files', compressed || undefined);
      
      clearInterval(progressInterval);
      
      if (!result?.url) {
        throw new Error('Upload returned no URL.');
      }

      setContents(prev => prev.map(c => {
        if (c.id === contentId) {
          return {
            ...c,
            fileUrl: result.url,
            fileSize: result.size,
            fileType,
            fileName: file.name,
            uploading: false,
            uploadProgress: 100,
            uploadError: undefined,
          };
        }
        return c;
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success('File uploaded successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file.';
      setContents(prev => prev.map(c => 
        c.id === contentId 
          ? { ...c, uploading: false, uploadProgress: 0, uploadError: message }
          : c
      ));
      toast.error(message);
    }
  };

  const handleAddContent = () => {
    if (ruleType === 'time' && contents.length < 3) {
      setContents([...contents, { 
        id: crypto.randomUUID(), 
        name: `Content ${contents.length + 1}`,
        url: '', 
        inputType: 'url'
      }]);
    }
  };

  const handleRemoveContent = (id: string) => {
    if (contents.length > 2) {
      setContents(contents.filter(c => c.id !== id));
      setTimeRules(timeRules.filter(r => r.contentId !== id));
      setVisitRules(visitRules.filter(r => r.contentId !== id));
      if (defaultContentId === id) {
        setDefaultContentId('');
      }
    }
  };

  const handleAddTimeRule = () => {
    const validContents = contents.filter(c => 
      c.name.trim().length > 0 && 
      (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
    );
    if (validContents.length > 0) {
      setTimeRules([...timeRules, {
        id: crypto.randomUUID(),
        contentId: validContents[0].id,
        startTime: '09:00',
        endTime: '17:00',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      }]);
    }
  };

  const handleRemoveTimeRule = (id: string) => {
    setTimeRules(timeRules.filter(r => r.id !== id));
  };

  const handleTimeRuleChange = (id: string, field: keyof TimeRule, value: any) => {
    setTimeRules(timeRules.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const handleDayToggle = (ruleId: string, day: string) => {
    setTimeRules(timeRules.map(r => {
      if (r.id !== ruleId) return r;
      const days = r.days || [];
      const newDays = days.includes(day)
        ? days.filter(d => d !== day)
        : [...days, day];
      return { ...r, days: newDays };
    }));
  };

  const handleVisitRuleChange = (visitNumber: 1 | 2, contentId: string) => {
    const existing = visitRules.find(r => r.visitNumber === visitNumber);
    if (existing) {
      setVisitRules(visitRules.map(r => 
        r.visitNumber === visitNumber ? { ...r, contentId } : r
      ));
    } else {
      setVisitRules([...visitRules, { id: crypto.randomUUID(), contentId, visitNumber }]);
    }
  };

  const buildAdaptiveConfig = (): AdaptiveConfig => {
    const validContents = contents.filter(c => 
      c.name.trim().length > 0 && 
      (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
    );
    const slots = validContents.map(c => {
      const slot: any = {
        id: c.id,
        name: c.name.trim(),
      };
      if (c.fileUrl) {
        slot.fileUrl = c.fileUrl;
        slot.fileSize = c.fileSize;
        slot.fileType = c.fileType;
        slot.url = c.fileUrl;
      } else if (c.url.trim().length > 0) {
        slot.url = c.url.trim();
      }
      return slot;
    });

    const config: AdaptiveConfig = {
      slots,
      defaultSlot: defaultContentId || validContents[0]?.id || '',
    };

    if (ruleType === 'time') {
      config.dateRules = timeRules.map(rule => ({
        slot: rule.contentId,
        startTime: rule.startTime,
        endTime: rule.endTime,
        days: rule.days && rule.days.length > 0 ? rule.days : undefined,
        startDate: rule.startDate || undefined,
        endDate: rule.endDate || undefined,
      }));
    } else if (ruleType === 'visit') {
      const firstRule = visitRules.find(r => r.visitNumber === 1);
      const returnRule = visitRules.find(r => r.visitNumber === 2);
      config.firstReturn = {
        enabled: true,
        firstSlot: firstRule?.contentId || '',
        returnSlot: returnRule?.contentId || '',
      };
    }

    if (userProfile?.timezone) {
      config.timezone = userProfile.timezone;
    }

    return config;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const config = buildAdaptiveConfig();
      await onSave(config, qrName);
      toast.success('Adaptive QRC™ updated successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update Adaptive QRC™';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const previewContent = useMemo(() => {
    if (adaptiveQRC?.shortUrl) {
      return adaptiveQRC.shortUrl.replace('/r/', '/adaptive/');
    }
    return `${appBaseUrl}/adaptive/preview`;
  }, [adaptiveQRC, appBaseUrl]);

  const previewOptions = useMemo(() => ({
    content: previewContent,
    size: 256,
    fgColor: '#D4AF37',
    bgColor: '#1a1a1a',
    errorCorrectionLevel: 'M' as const,
    cornerStyle: 'rounded' as const,
  }), [previewContent]);

  const handleCopyUrl = () => {
    if (previewContent) {
      navigator.clipboard.writeText(previewContent);
      toast.success('URL copied to clipboard!');
    }
  };

  const handleDownloadQR = () => {
    qrRef.current?.download();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#0b0f14] via-[#1a1a1a] to-[#0b0f14] overflow-y-auto">
      {/* Gold gradient overlay - MORE GOLD! */}
      <div className="fixed inset-0 bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-amber-900/30 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 min-h-screen">
        {/* Gold Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 backdrop-blur-xl border-b-2 border-amber-400/50 shadow-lg shadow-amber-500/20">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-400/20 border border-amber-400/30">
                <Sparkles className="h-8 w-8 text-amber-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 bg-clip-text text-transparent drop-shadow-lg">
                  Edit Adaptive QRC™
                </h1>
                <p className="text-xs text-amber-200/80 uppercase tracking-[0.3em] mt-1">
                  Premium Content Routing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid lg:grid-cols-[1fr_450px] gap-8">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-amber-500/20">
                {[
                  { id: 'contents', label: 'Contents', icon: Globe },
                  { id: 'rules', label: 'Rules', icon: ruleType === 'time' ? Timer : Users },
                  { id: 'preview', label: 'Preview', icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
                      activeTab === tab.id
                        ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                        : 'border-transparent text-muted-foreground hover:text-amber-300/80'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Contents Tab */}
                {activeTab === 'contents' && (
                  <motion.div
                    key="contents"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-amber-300 mb-2">Content URLs</h2>
                          <p className="text-sm text-amber-200/70">
                            Manage the URLs that will be shown based on your rules
                          </p>
                        </div>
                        {ruleType === 'time' && contents.length < 3 && (
                          <Button
                            variant="outline"
                            onClick={handleAddContent}
                            className="border-amber-400/50 text-amber-300 hover:bg-amber-500/20"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Content
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {contents.map((content, index) => (
                          <div
                            key={content.id}
                            className="rounded-xl p-4 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/50">
                                  {index + 1}
                                </div>
                                <div>
                                  {ruleType === 'visit' && (
                                    <p className="text-xs text-amber-300/60 mb-1">
                                      {index === 0 ? 'First Visit' : 'Second Visit'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {contents.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveContent(content.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            {/* Content Name Input */}
                            <div className="mb-4">
                              <Label className="text-sm font-semibold text-amber-200 mb-2 block">Content Name</Label>
                              <Input
                                value={content.name}
                                onChange={(e) => handleContentChange(content.id, 'name', e.target.value)}
                                placeholder={ruleType === 'visit' 
                                  ? (index === 0 ? 'First Visit Content' : 'Second Visit Content')
                                  : `Content ${index + 1} Name`}
                                className="h-11 bg-amber-900/40 border-amber-500/40 focus:border-amber-400 text-amber-100 placeholder:text-amber-500/50"
                              />
                            </div>

                            {/* Input Type Toggle */}
                            <div className="mb-4">
                              <Label className="text-sm font-semibold text-amber-200 mb-2 block">Content Type</Label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleContentChange(content.id, 'inputType', 'url')}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                    content.inputType === 'url'
                                      ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                                      : 'border-amber-500/20 bg-amber-900/40 text-amber-300/60 hover:border-amber-500/40'
                                  }`}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                  URL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleContentChange(content.id, 'inputType', 'file')}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                    content.inputType === 'file'
                                      ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                                      : 'border-amber-500/20 bg-amber-900/40 text-amber-300/60 hover:border-amber-500/40'
                                  }`}
                                >
                                  <FileIcon className="h-4 w-4" />
                                  File
                                </button>
                              </div>
                            </div>

                            {/* URL Input */}
                            {content.inputType === 'url' && (
                              <div>
                                <Label className="text-sm font-semibold text-amber-200 mb-2 block">URL</Label>
                                <Input
                                  value={content.url}
                                  onChange={(e) => handleContentChange(content.id, 'url', e.target.value)}
                                  placeholder="https://example.com"
                                  className="h-11 bg-amber-900/40 border-amber-500/40 focus:border-amber-400 text-amber-100 placeholder:text-amber-500/50"
                                />
                              </div>
                            )}

                            {/* File Upload */}
                            {content.inputType === 'file' && (
                              <div>
                                <Label className="text-sm font-semibold text-amber-200 mb-2 block">File (PDF, PNG, or JPEG)</Label>
                                {content.fileUrl ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                      <FileIcon className="h-5 w-5 text-amber-400" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-amber-200">{content.fileName || 'Uploaded file'}</p>
                                        <p className="text-xs text-amber-300/60">
                                          {content.fileType?.toUpperCase()} • {content.fileSize ? `${(content.fileSize / (1024 * 1024)).toFixed(2)}MB` : ''}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setContents(contents.map(c => 
                                            c.id === content.id 
                                              ? { ...c, fileUrl: undefined, fileSize: undefined, fileType: undefined, fileName: undefined }
                                              : c
                                          ));
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <input
                                      ref={(el) => {
                                        contentFileInputRefs.current[content.id] = el;
                                      }}
                                      type="file"
                                      accept=".pdf,.png,.jpeg,.jpg"
                                      onChange={(e) => handleContentFileUpload(content.id, e)}
                                      className="hidden"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => contentFileInputRefs.current[content.id]?.click()}
                                      disabled={content.uploading}
                                      className="w-full border-amber-400/50 text-amber-300 hover:bg-amber-500/20 h-11"
                                    >
                                      {content.uploading ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Uploading...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-2" />
                                          Upload File
                                        </>
                                      )}
                                    </Button>
                                    {content.uploadProgress !== undefined && content.uploadProgress > 0 && content.uploadProgress < 100 && (
                                      <div className="relative h-2 bg-amber-900/40 rounded-full overflow-hidden">
                                        <div
                                          className="absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 transition-all duration-300"
                                          style={{ width: `${content.uploadProgress}%` }}
                                        >
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                        </div>
                                      </div>
                                    )}
                                    {content.uploadError && (
                                      <p className="text-xs text-red-400">{content.uploadError}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Rules Tab */}
                {activeTab === 'rules' && (
                  <motion.div
                    key="rules"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {ruleType === 'time' && (
                      <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-amber-300 mb-2">Time Rules</h2>
                            <p className="text-sm text-amber-200/70">
                              Configure when each content should be displayed
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={handleAddTimeRule}
                            className="border-amber-400/50 text-amber-300 hover:bg-amber-500/20"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Rule
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {timeRules.map((rule, index) => (
                            <div
                              key={rule.id}
                              className="rounded-xl p-5 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-amber-200">Rule {index + 1}</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTimeRule(rule.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm text-amber-200/80 mb-2 block">Content</Label>
                                  <select
                                    value={rule.contentId}
                                    onChange={(e) => handleTimeRuleChange(rule.id, 'contentId', e.target.value)}
                                    className="w-full h-11 rounded-xl border border-amber-500/40 bg-amber-900/40 px-3 text-amber-100"
                                  >
                                    {contents.filter(c => 
                                      c.name.trim().length > 0 && 
                                      (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
                                    ).map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} {c.fileUrl ? '(File)' : '(URL)'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm text-amber-200/80 mb-2 block">Start Time</Label>
                                    <Input
                                      type="time"
                                      value={rule.startTime || ''}
                                      onChange={(e) => handleTimeRuleChange(rule.id, 'startTime', e.target.value)}
                                      className="bg-amber-900/40 border-amber-500/40 text-amber-100"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm text-amber-200/80 mb-2 block">End Time</Label>
                                    <Input
                                      type="time"
                                      value={rule.endTime || ''}
                                      onChange={(e) => handleTimeRuleChange(rule.id, 'endTime', e.target.value)}
                                      className="bg-amber-900/40 border-amber-500/40 text-amber-100"
                                    />
                                  </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm text-amber-200/80 mb-2 block">Start Date (Optional)</Label>
                                    <Input
                                      type="date"
                                      value={rule.startDate || ''}
                                      onChange={(e) => handleTimeRuleChange(rule.id, 'startDate', e.target.value)}
                                      className="bg-amber-900/40 border-amber-500/40 text-amber-100"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm text-amber-200/80 mb-2 block">End Date (Optional)</Label>
                                    <Input
                                      type="date"
                                      value={rule.endDate || ''}
                                      onChange={(e) => handleTimeRuleChange(rule.id, 'endDate', e.target.value)}
                                      className="bg-amber-900/40 border-amber-500/40 text-amber-100"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm text-amber-200/80 mb-3 block">Days of Week</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleDayToggle(rule.id, day)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                          rule.days?.includes(day)
                                            ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/50 scale-105'
                                            : 'bg-amber-900/40 text-amber-300/60 hover:bg-amber-800/40 hover:text-amber-200 border border-amber-500/20'
                                        }`}
                                      >
                                        {day}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ruleType === 'visit' && (
                      <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20">
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold text-amber-300 mb-2">Visit Rules</h2>
                          <p className="text-sm text-amber-200/70">
                            Assign content for first and second visits
                          </p>
                        </div>
                        <div className="space-y-4">
                          {[
                            { number: 1 as const, label: 'First Visit' },
                            { number: 2 as const, label: 'Second Visit' },
                          ].map(({ number, label }) => {
                            const rule = visitRules.find(r => r.visitNumber === number);
                            const contentId = rule?.contentId || '';
                            return (
                              <div
                                key={number}
                                className="rounded-xl p-5 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30"
                              >
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/50">
                                    {number}
                                  </div>
                                  <h3 className="font-semibold text-amber-200">{label}</h3>
                                </div>
                                <select
                                  value={contentId}
                                  onChange={(e) => handleVisitRuleChange(number, e.target.value)}
                                  className="w-full h-11 rounded-xl border border-amber-500/40 bg-amber-900/40 px-3 text-amber-100"
                                >
                                  <option value="">Select content...</option>
                                  {contents.filter(c => 
                                    c.name.trim().length > 0 && 
                                    (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
                                  ).map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} {c.fileUrl ? '(File)' : '(URL)'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Preview Tab */}
                {activeTab === 'preview' && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-amber-300 mb-2">QR Code Preview</h2>
                        <p className="text-sm text-amber-200/70">
                          Your Adaptive QRC™ preview
                        </p>
                      </div>
                      <div className="flex justify-center mb-6">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-2 border-amber-500/40 shadow-2xl shadow-amber-500/30">
                          <QRPreview
                            ref={qrRef}
                            content={previewContent}
                            options={previewOptions}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-900/30 border border-amber-500/30">
                          <Globe className="h-4 w-4 text-amber-400" />
                          <span className="text-sm text-amber-200 flex-1 truncate">{previewContent}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyUrl}
                            className="text-amber-300 hover:text-amber-200 hover:bg-amber-500/20"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleDownloadQR}
                            className="flex-1 border-amber-400/50 text-amber-300 hover:bg-amber-500/20"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.open(previewContent, '_blank')}
                            className="flex-1 border-amber-400/50 text-amber-300 hover:bg-amber-500/20"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Name Editor */}
              <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20">
                <Label className="text-sm font-semibold text-amber-200 mb-3 block">Adaptive QRC™ Name</Label>
                <Input
                  value={qrName}
                  onChange={(e) => setQrName(e.target.value.slice(0, 50))}
                  placeholder="My Adaptive QRC™"
                  className="h-12 bg-amber-900/40 border-amber-500/40 focus:border-amber-400 text-amber-100 mb-2"
                  maxLength={50}
                />
                <p className="text-xs text-amber-300/60">{qrName.length}/50</p>
              </div>

              {/* Quick Stats */}
              <div className="glass-panel rounded-2xl p-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20">
                <h3 className="text-lg font-semibold text-amber-300 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-200/70">Contents</span>
                    <span className="text-lg font-bold text-amber-300">{contents.filter(c => c.url.trim()).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-200/70">Rule Type</span>
                    <span className="text-lg font-bold text-amber-300 capitalize">{ruleType || 'None'}</span>
                  </div>
                  {ruleType === 'time' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-amber-200/70">Time Rules</span>
                      <span className="text-lg font-bold text-amber-300">{timeRules.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black hover:opacity-90 font-bold text-lg shadow-2xl shadow-amber-500/50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
