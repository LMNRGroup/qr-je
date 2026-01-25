import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import { 
  ArrowRight, 
  ArrowLeft, 
  Timer, 
  Users, 
  Plus, 
  X, 
  Loader2,
  Sparkles,
  Check,
  Calendar,
  Globe,
  Upload,
  File as FileIcon,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdaptiveConfig } from '@/types/qr';

interface AdaptiveContent {
  id: string;
  name: string;
  url: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: 'image' | 'pdf';
  fileName?: string;
  fileDataUrl?: string; // For caching before upload
  file?: File; // For caching before upload
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

interface AdaptiveQRCWizardProps {
  user: any;
  userProfile: any;
  onComplete: (config: AdaptiveConfig, qrName: string) => Promise<void>;
  onCancel: () => void;
  existingAdaptiveQRC?: any;
  isMobile?: boolean;
  isMobileV2?: boolean;
}

export const AdaptiveQRCWizard = ({
  user,
  userProfile,
  onComplete,
  onCancel,
  existingAdaptiveQRC,
  isMobile = false,
  isMobileV2 = false,
}: AdaptiveQRCWizardProps) => {
  const [step, setStep] = useState(1);
  const [qrName, setQrName] = useState(existingAdaptiveQRC?.name || 'My Adaptive QRC™');
  const [ruleType, setRuleType] = useState<RuleType>(null);
  const [contents, setContents] = useState<AdaptiveContent[]>([]);
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  const [visitRules, setVisitRules] = useState<VisitRule[]>([]);
  const [defaultContentId, setDefaultContentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const qrRef = useRef<QRPreviewHandle>(null);
  const contentFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const appBaseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');

  const QR_ASSETS_BUCKET = 'qr-assets';
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
  const STORAGE_KEY = 'qrc.storage.usage';
  const MAX_STORAGE_BYTES = 25 * 1024 * 1024; // 25MB (matches Index.tsx)

  // Helper functions for file upload
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

  const compressPdf = async (file: File): Promise<Blob> => {
    // PDFs can't be compressed client-side effectively
    return file;
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
      
      const { error, data: uploadData } = await supabase.storage
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

  // Initialize contents based on rule type
  useEffect(() => {
    if (ruleType === 'time' && contents.length === 0) {
      setContents([
        { id: crypto.randomUUID(), name: 'Content 1', url: '', inputType: 'url' },
        { id: crypto.randomUUID(), name: 'Content 2', url: '', inputType: 'url' },
      ]);
    } else if (ruleType === 'visit' && contents.length === 0) {
      setContents([
        { id: crypto.randomUUID(), name: 'First Visit', url: '', inputType: 'url' },
        { id: crypto.randomUUID(), name: 'Second Visit', url: '', inputType: 'url' },
      ]);
    }
  }, [ruleType]);

  // Load existing config if editing
  useEffect(() => {
    if (existingAdaptiveQRC?.options?.adaptive) {
      const adaptive = existingAdaptiveQRC.options.adaptive;
      setQrName(existingAdaptiveQRC.name || 'My Adaptive QRC™');
      
      if (adaptive.slots && adaptive.slots.length > 0) {
        const loadedContents = adaptive.slots.map((slot: any, index: number) => ({
          id: slot.id || crypto.randomUUID(),
          name: slot.name || `Content ${index + 1}`,
          url: slot.url || '',
          fileUrl: slot.fileUrl,
          fileSize: slot.fileSize,
          fileType: slot.fileType,
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
  }, [existingAdaptiveQRC]);

  const canProceed = useMemo(() => {
    if (step === 1) return qrName.trim().length > 0;
    if (step === 2) return ruleType !== null;
    if (step === 3) {
      if (ruleType === 'time') {
        // Need at least 2 contents with valid URLs or files, max 3
        // Each content must have a name and either a URL or a file
        const validContents = contents.filter(c => 
          c.name.trim().length > 0 && 
          (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
        );
        return validContents.length >= 2 && validContents.length <= 3;
      } else if (ruleType === 'visit') {
        // Need exactly 2 contents with valid URLs or files
        const validContents = contents.filter(c => 
          c.name.trim().length > 0 && 
          (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
        );
        return validContents.length === 2;
      }
      return false;
    }
    if (step === 4) {
      if (ruleType === 'time') {
        // Need at least one time rule configured
        return timeRules.length > 0 && timeRules.every(rule => {
          const content = contents.find(c => c.id === rule.contentId);
          return content && content.name.trim().length > 0 && 
            (content.url.trim().length > 0 || content.fileUrl || (content.file && content.inputType === 'file'));
        });
      } else if (ruleType === 'visit') {
        // Need both visit rules configured
        return visitRules.length === 2 && visitRules.every(rule => {
          const content = contents.find(c => c.id === rule.contentId);
          return content && content.name.trim().length > 0 && 
            (content.url.trim().length > 0 || content.fileUrl || (content.file && content.inputType === 'file'));
        });
      }
      return false;
    }
    return true;
  }, [step, qrName, ruleType, contents, timeRules, visitRules]);

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

    // Validate file type
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      toast.error('Please upload a PDF, PNG, or JPEG file.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
      toast.error(`File is too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`);
      return;
    }

    // Update content state to show uploading
    setContents(contents.map(c => 
      c.id === contentId 
        ? { ...c, uploading: true, uploadProgress: 0, uploadError: undefined }
        : c
    ));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setContents(prev => prev.map(c => {
          if (c.id !== contentId && c.uploading) return c;
          if (c.id === contentId) {
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

      // Update content with file info
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
        // For adaptive QRC, we need a URL to redirect to, so we use the file URL
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

  const handleGenerate = async () => {
    if (!canProceed) return;
    
    setLoading(true);
    try {
      const config = buildAdaptiveConfig();
      await onComplete(config, qrName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create Adaptive QRC™';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const previewContent = useMemo(() => {
    if (existingAdaptiveQRC?.shortUrl) {
      return existingAdaptiveQRC.shortUrl.replace('/r/', '/adaptive/');
    }
    return `${appBaseUrl}/adaptive/preview`;
  }, [existingAdaptiveQRC, appBaseUrl]);

  const previewOptions = useMemo(() => ({
    content: previewContent,
    size: 256,
    fgColor: '#D4AF37',
    bgColor: '#1a1a1a',
    errorCorrectionLevel: 'M' as const,
    cornerStyle: 'rounded' as const,
  }), [previewContent]);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#0b0f14] via-[#1a1a1a] to-[#0b0f14] overflow-y-auto">
      {/* Gold gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-amber-900/20 pointer-events-none" />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-amber-500/20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                  Adaptive QRC™
                </h1>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
                  {existingAdaptiveQRC ? 'Edit Your Adaptive QRC™' : 'Create Your Adaptive QRC™'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className={`container mx-auto px-4 py-4 sm:py-8 ${isMobileV2 ? 'max-w-full' : 'max-w-6xl'}`}>
          <div className={`${isMobileV2 ? 'flex flex-col' : 'grid lg:grid-cols-[1fr_400px]'} gap-4 sm:gap-8`}>
            {/* Main Content */}
            <div className={`space-y-4 sm:space-y-6 ${isMobileV2 ? 'w-full' : ''}`}>
              {/* Step Indicator - Mobile Optimized */}
              <div className={`flex items-center justify-center ${isMobileV2 ? 'gap-1 mb-4' : 'gap-2 mb-8'} overflow-x-auto pb-2`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`${isMobileV2 ? 'w-8 h-8 text-sm' : 'w-10 h-10'} rounded-full flex items-center justify-center font-semibold transition-all ${
                        s === step
                          ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black scale-110 shadow-lg shadow-amber-500/50'
                          : s < step
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                          : 'bg-secondary/40 text-muted-foreground border border-border'
                      }`}
                    >
                      {s < step ? <Check className={isMobileV2 ? 'h-4 w-4' : 'h-5 w-5'} /> : s}
                    </div>
                    {s < 5 && (
                      <div
                        className={`h-1 ${isMobileV2 ? 'w-4' : 'w-8'} transition-all ${
                          s < step ? 'bg-amber-500' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Name */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className={`text-center space-y-2 ${isMobileV2 ? 'mb-4' : 'mb-8'}`}>
                      <h2 className={`${isMobileV2 ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent`}>
                        Name Your Adaptive QRC™
                      </h2>
                      <p className={`${isMobileV2 ? 'text-xs' : ''} text-muted-foreground`}>
                        Give your Adaptive QRC™ a memorable name
                      </p>
                    </div>
                    <div className={`glass-panel rounded-2xl ${isMobileV2 ? 'p-4' : 'p-8'} border border-amber-500/20 shadow-lg shadow-amber-500/10`}>
                      <Label htmlFor="qrName" className={`${isMobileV2 ? 'text-xs' : 'text-sm'} font-medium mb-2 block`}>
                        Adaptive QRC™ Name
                      </Label>
                      <Input
                        id="qrName"
                        value={qrName}
                        onChange={(e) => setQrName(e.target.value.slice(0, 50))}
                        placeholder="My Adaptive QRC™"
                        className={`${isMobileV2 ? 'h-10 text-sm' : 'h-14 text-lg'} bg-secondary/40 border-amber-500/30 focus:border-amber-400`}
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {qrName.length}/50 characters
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Rule Type Selection */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className={`text-center space-y-2 ${isMobileV2 ? 'mb-4' : 'mb-8'}`}>
                      <h2 className={`${isMobileV2 ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent`}>
                        Choose Your Rule Type
                      </h2>
                      <p className={`${isMobileV2 ? 'text-xs' : ''} text-muted-foreground`}>
                        Select how your Adaptive QRC™ will route content
                      </p>
                    </div>
                    <div className={`grid ${isMobileV2 ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4 sm:gap-6`}>
                      <button
                        type="button"
                        onClick={() => setRuleType('time')}
                        className={`glass-panel rounded-2xl p-8 border-2 transition-all text-left group ${
                          ruleType === 'time'
                            ? 'border-amber-400 shadow-lg shadow-amber-500/30 bg-amber-500/10'
                            : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-4 rounded-xl ${
                            ruleType === 'time' 
                              ? 'bg-amber-400/20' 
                              : 'bg-secondary/40'
                          }`}>
                            <Timer className={`h-8 w-8 ${
                              ruleType === 'time' 
                                ? 'text-amber-400' 
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Time & Day Rules</h3>
                            <p className="text-sm text-muted-foreground">Route by time, day, or date</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• 2-3 content options</li>
                          <li>• Time-based routing</li>
                          <li>• Day of week selection</li>
                          <li>• Calendar date ranges</li>
                        </ul>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRuleType('visit')}
                        className={`glass-panel rounded-2xl p-8 border-2 transition-all text-left group ${
                          ruleType === 'visit'
                            ? 'border-amber-400 shadow-lg shadow-amber-500/30 bg-amber-500/10'
                            : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-4 rounded-xl ${
                            ruleType === 'visit' 
                              ? 'bg-amber-400/20' 
                              : 'bg-secondary/40'
                          }`}>
                            <Users className={`h-8 w-8 ${
                              ruleType === 'visit' 
                                ? 'text-amber-400' 
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Visit-Based Rules</h3>
                            <p className="text-sm text-muted-foreground">Route by visitor count</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• 2 content options</li>
                          <li>• First visit content</li>
                          <li>• Second visit content</li>
                          <li>• Automatic detection</li>
                        </ul>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Add Contents */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className={`text-center space-y-2 ${isMobileV2 ? 'mb-4' : 'mb-8'}`}>
                      <h2 className={`${isMobileV2 ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent`}>
                        Add Your Contents
                      </h2>
                      <p className={`${isMobileV2 ? 'text-xs' : ''} text-muted-foreground`}>
                        {ruleType === 'time' 
                          ? 'Add 2-3 contents (URL or File) that will be shown based on time and day rules'
                          : 'Add 2 contents (URL or File) for first and second visits'}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {contents.map((content, index) => (
                        <motion.div
                          key={content.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-panel rounded-2xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/10"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-semibold">
                                {index + 1}
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  {ruleType === 'visit' && (
                                    <span className="text-xs text-muted-foreground mr-2">
                                      {index === 0 ? 'First Visit' : 'Second Visit'}:
                                    </span>
                                  )}
                                </Label>
                              </div>
                            </div>
                            {contents.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveContent(content.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Content Name Input */}
                          <div className="mb-4">
                            <Label htmlFor={`content-name-${content.id}`} className="text-sm font-medium mb-2 block">
                              Content Name
                            </Label>
                            <Input
                              id={`content-name-${content.id}`}
                              value={content.name}
                              onChange={(e) => handleContentChange(content.id, 'name', e.target.value)}
                              placeholder={ruleType === 'visit' 
                                ? (index === 0 ? 'First Visit Content' : 'Second Visit Content')
                                : `Content ${index + 1} Name`}
                              className="h-11 bg-secondary/40 border-amber-500/30 focus:border-amber-400"
                            />
                          </div>

                          {/* Input Type Toggle */}
                          <div className="mb-4">
                            <Label className="text-sm font-medium mb-2 block">Content Type</Label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleContentChange(content.id, 'inputType', 'url')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                  content.inputType === 'url'
                                    ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                                    : 'border-amber-500/20 bg-secondary/40 text-muted-foreground hover:border-amber-500/40'
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
                                    : 'border-amber-500/20 bg-secondary/40 text-muted-foreground hover:border-amber-500/40'
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
                              <Label htmlFor={`content-url-${content.id}`} className="text-sm font-medium mb-2 block">
                                URL
                              </Label>
                              <Input
                                id={`content-url-${content.id}`}
                                value={content.url}
                                onChange={(e) => handleContentChange(content.id, 'url', e.target.value)}
                                placeholder="https://example.com"
                                className="h-11 bg-secondary/40 border-amber-500/30 focus:border-amber-400"
                              />
                            </div>
                          )}

                          {/* File Upload */}
                          {content.inputType === 'file' && (
                            <div>
                              <Label className="text-sm font-medium mb-2 block">File (PDF, PNG, or JPEG)</Label>
                              {content.fileUrl ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <FileIcon className="h-5 w-5 text-amber-400" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{content.fileName || 'Uploaded file'}</p>
                                      <p className="text-xs text-muted-foreground">
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
                                    className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-11"
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
                                    <div className="relative h-2 bg-secondary/40 rounded-full overflow-hidden">
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
                        </motion.div>
                      ))}
                      {ruleType === 'time' && contents.length < 3 && (
                        <Button
                          variant="outline"
                          onClick={handleAddContent}
                          className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Content ({contents.length}/3)
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Configure Rules */}
                {step === 4 && ruleType === 'time' && (
                  <motion.div
                    key="step4-time"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className={`text-center space-y-2 ${isMobileV2 ? 'mb-4' : 'mb-8'}`}>
                      <h2 className={`${isMobileV2 ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent`}>
                        Configure Time Rules
                      </h2>
                      <p className={`${isMobileV2 ? 'text-xs' : ''} text-muted-foreground`}>
                        Set when each content should be shown
                      </p>
                    </div>
                    <div className="space-y-4">
                      {timeRules.map((rule, index) => (
                        <div
                          key={rule.id}
                          className="glass-panel rounded-2xl p-6 border border-amber-500/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Rule {index + 1}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTimeRule(rule.id)}
                              className="text-red-400"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm mb-2 block">Content</Label>
                              <select
                                value={rule.contentId}
                                onChange={(e) => handleTimeRuleChange(rule.id, 'contentId', e.target.value)}
                                className="w-full h-11 rounded-xl border border-amber-500/30 bg-secondary/40 px-3"
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
                                <Label className="text-sm mb-2 block">Start Time</Label>
                                <Input
                                  type="time"
                                  value={rule.startTime || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'startTime', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">End Time</Label>
                                <Input
                                  type="time"
                                  value={rule.endTime || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'endTime', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm mb-2 block">Start Date (Optional)</Label>
                                <Input
                                  type="date"
                                  value={rule.startDate || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'startDate', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">End Date (Optional)</Label>
                                <Input
                                  type="date"
                                  value={rule.endDate || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'endDate', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm mb-2 block">Days of Week</Label>
                              <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleDayToggle(rule.id, day)}
                                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                                      rule.days?.includes(day)
                                        ? 'bg-amber-400 text-black font-semibold shadow-lg shadow-amber-500/50'
                                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60'
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
                      <Button
                        variant="outline"
                        onClick={handleAddTimeRule}
                        className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Rule
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && ruleType === 'visit' && (
                  <motion.div
                    key="step4-visit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className={`text-center space-y-2 ${isMobileV2 ? 'mb-4' : 'mb-8'}`}>
                      <h2 className={`${isMobileV2 ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent`}>
                        Configure Visit Rules
                      </h2>
                      <p className={`${isMobileV2 ? 'text-xs' : ''} text-muted-foreground`}>
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
                            className="glass-panel rounded-2xl p-6 border border-amber-500/20"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-semibold">
                                {number}
                              </div>
                              <h3 className="font-semibold">{label}</h3>
                            </div>
                            <select
                              value={contentId}
                              onChange={(e) => handleVisitRuleChange(number, e.target.value)}
                              className="w-full h-11 rounded-xl border border-amber-500/30 bg-secondary/40 px-3"
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
                  </motion.div>
                )}

                {/* Step 5: Review & Generate */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className={`text-center space-y-2 ${isMobileV2 ? 'mb-4' : 'mb-8'}`}>
                      <h2 className={`${isMobileV2 ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent`}>
                        Review & Generate
                      </h2>
                      <p className={`${isMobileV2 ? 'text-xs' : ''} text-muted-foreground`}>
                        Review your Adaptive QRC™ configuration
                      </p>
                    </div>
                    <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Name</Label>
                        <p className="text-lg font-semibold">{qrName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Rule Type</Label>
                        <p className="text-lg font-semibold capitalize">{ruleType}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Contents</Label>
                        <div className="space-y-2 mt-2">
                          {contents.filter(c => 
                            c.name.trim().length > 0 && 
                            (c.url.trim().length > 0 || c.fileUrl || (c.file && c.inputType === 'file'))
                          ).map((c, i) => (
                            <div key={c.id} className="flex items-start gap-2 text-sm">
                              <span className="text-amber-400 font-semibold">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.fileUrl ? (
                                    <span className="flex items-center gap-1">
                                      <FileIcon className="h-3 w-3" />
                                      {c.fileName || 'Uploaded file'}
                                    </span>
                                  ) : (
                                    c.url
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {ruleType === 'time' && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Time Rules</Label>
                          <p className="text-lg font-semibold">{timeRules.length} rule(s)</p>
                        </div>
                      )}
                      {ruleType === 'visit' && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Visit Rules</Label>
                          <p className="text-lg font-semibold">Configured</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-amber-500/20">
                <Button
                  variant="outline"
                  onClick={() => step > 1 && setStep(step - 1)}
                  disabled={step === 1}
                  className="border-amber-500/30 text-amber-400"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {step < 5 ? (
                  <Button
                    onClick={() => canProceed && setStep(step + 1)}
                    disabled={!canProceed}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold shadow-lg shadow-amber-500/50"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={!canProceed || loading}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold shadow-lg shadow-amber-500/50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Adaptive QRC™
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

                   {/* Preview Panel */}
                   {!isMobileV2 && (
                     <div className="hidden lg:block">
                       <div className="sticky top-24">
                         <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                           <h3 className="text-lg font-semibold mb-4 text-amber-400">Preview</h3>
                           <div className="flex justify-center">
                             <QRPreview
                               ref={qrRef}
                               content={previewContent}
                               options={previewOptions}
                             />
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                   {isMobileV2 && (
                     <div className="glass-panel rounded-2xl p-4 border border-amber-500/20 shadow-lg shadow-amber-500/10 mt-4">
                       <h3 className="text-sm font-semibold mb-3 text-amber-400">Preview</h3>
                       <div className="flex justify-center">
                         <QRPreview
                           ref={qrRef}
                           content={previewContent}
                           options={{ ...previewOptions, size: 200 }}
                         />
                       </div>
                     </div>
                   )}
          </div>
        </div>
      </div>
    </div>
  );
};
