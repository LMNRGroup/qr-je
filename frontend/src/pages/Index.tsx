import { ColorPicker } from '@/components/ColorPicker';
import { CornerStylePicker } from '@/components/CornerStylePicker';
import { ErrorCorrectionSelector } from '@/components/ErrorCorrectionSelector';
import { HistoryPanel } from '@/components/HistoryPanel';
import { LogoUpload } from '@/components/LogoUpload';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import { SizeSlider } from '@/components/SizeSlider';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createVcard, generateQR } from '@/lib/api';
import { QROptions, defaultQROptions } from '@/types/qr';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Copy,
  Download,
  File,
  Link as LinkIcon,
  Loader2,
  Mail,
  Monitor,
  Phone,
  Plus,
  QrCode,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UPSell_INTERVAL_MS = 30 * 60 * 1000;
const UPSell_LAST_SHOWN_KEY = 'qr.upsell.lastShownAt';
const UPSell_SESSION_KEY = 'qr.upsell.sessionShown';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [options, setOptions] = useState<QROptions>(defaultQROptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastGeneratedContent, setLastGeneratedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'studio' | 'codes' | 'analytics' | 'settings' | 'upgrade'>('studio');
  const [qrMode, setQrMode] = useState<'static' | 'dynamic' | null>(null);
  const [qrType, setQrType] = useState<'website' | 'vcard' | 'email' | 'phone' | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);
  const [isCreateHover, setIsCreateHover] = useState(false);
  const [showAnalyticsIntro, setShowAnalyticsIntro] = useState(false);
  const [analyticsSeen, setAnalyticsSeen] = useState(false);
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [generatedShortUrl, setGeneratedShortUrl] = useState('');
  const [generatedLongUrl, setGeneratedLongUrl] = useState('');
  const [showVcardCustomizer, setShowVcardCustomizer] = useState(false);
  const [vcardPreviewSide, setVcardPreviewSide] = useState<'front' | 'back'>('front');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingCreateScroll, setPendingCreateScroll] = useState(false);
  const [accountForm, setAccountForm] = useState({
    username: '',
    fullName: '',
    email: '',
  });
  const hoverTimeoutRef = useRef<number | null>(null);
  const [vcard, setVcard] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    company: '',
    about: '',
    slug: '',
  });
  const [vcardStyle, setVcardStyle] = useState({
    fontFamily: 'Arial, sans-serif',
    radius: 18,
    frontColor: '#111827',
    frontGradient: '#2563eb',
    frontUseGradient: true,
    backColor: '#0f172a',
    backGradient: '#4f46e5',
    backUseGradient: true,
    logoDataUrl: '',
    profilePhotoDataUrl: '',
    photoZoom: 110,
    photoX: 50,
    photoY: 50,
  });
  const qrRef = useRef<QRPreviewHandle>(null);
  const createSectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const isValidWebsiteUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const candidate = normalizeUrl(trimmed);
    try {
      const url = new URL(candidate);
      const hostname = url.hostname;
      if (!hostname.includes('.')) return false;
      if (!/^[a-z0-9.-]+$/i.test(hostname)) return false;
      const tld = hostname.split('.').pop();
      if (!tld || tld.length < 2) return false;
      return true;
    } catch {
      return false;
    }
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '').trim();

  const isValidPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7;
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48);

  const normalizedWebsiteUrl = useMemo(
    () => normalizeUrl(websiteUrl),
    [websiteUrl]
  );
  const normalizedPhone = useMemo(() => normalizePhone(phoneNumber), [phoneNumber]);
  const isWebsiteValid = useMemo(
    () => isValidWebsiteUrl(websiteUrl),
    [websiteUrl]
  );
  const isEmailValid = useMemo(() => isValidEmail(emailAddress), [emailAddress]);
  const isPhoneValid = useMemo(() => isValidPhone(phoneNumber), [phoneNumber]);
  const vcardSlug = useMemo(
    () => (vcard.slug ? slugify(vcard.slug) : slugify(vcard.name)),
    [vcard.slug, vcard.name]
  );
  const vcardUrl = vcardSlug
    ? `https://qrcode.luminarapps.com/${vcardSlug}`
    : '';
  const generatedContent = qrType === 'website'
    ? (isWebsiteValid ? normalizedWebsiteUrl : '')
    : qrType === 'vcard'
      ? (generatedShortUrl || vcardUrl)
      : qrType === 'email'
        ? (isEmailValid ? `mailto:${emailAddress.trim()}` : '')
        : qrType === 'phone'
          ? (isPhoneValid ? `tel:${normalizedPhone}` : '')
          : '';
  const longFormContent = qrType === 'vcard' ? (generatedLongUrl || vcardUrl) : generatedContent;
  const canGenerate = qrType === 'website'
    ? isWebsiteValid
    : qrType === 'vcard'
      ? Boolean(vcardSlug)
      : qrType === 'email'
        ? isEmailValid
        : qrType === 'phone'
          ? isPhoneValid
          : false;
  const previewUrl = qrType === 'website' ? normalizedWebsiteUrl : vcardUrl;
  const canShowPreview = qrType === 'website' && isWebsiteValid;
  const hasSelectedMode = qrMode !== null;
  const hasSelectedType = qrType !== null;
  const previewContent = hasGenerated
    ? generatedContent
    : hasSelectedType
      ? 'https://preview.qrcodestudio.app'
      : '';

  const updateOption = useCallback(<K extends keyof QROptions>(key: K, value: QROptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    setOptions((prev) => (
      prev.content === generatedContent ? prev : { ...prev, content: generatedContent }
    ));
  }, [generatedContent]);

  useEffect(() => {
    setHasGenerated(Boolean(generatedContent) && generatedContent === lastGeneratedContent);
  }, [generatedContent, lastGeneratedContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || isBooting) return;
    if (!user) {
      sessionStorage.removeItem('qr.welcome.shown');
      return;
    }
    if (sessionStorage.getItem('qr.welcome.shown')) return;

    const metadata = user.user_metadata as Record<string, string> | undefined;
    const rawName = metadata?.first_name || metadata?.full_name || metadata?.name || '';
    const fallbackName = user.email ? user.email.split('@')[0] : 'there';
    const firstName = (rawName.trim() ? rawName.split(' ')[0] : fallbackName).trim();
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    const isNewUser = createdAt && lastSignIn && Math.abs(lastSignIn - createdAt) < 2 * 60 * 1000;
    const displayName = firstName
      ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`
      : 'there';

    setWelcomeMessage(isNewUser ? `Welcome ${displayName}` : 'Welcome Back! Loading your Studio');
    setShowWelcomeIntro(true);
    sessionStorage.setItem('qr.welcome.shown', 'true');
    const timer = window.setTimeout(() => setShowWelcomeIntro(false), 1100);
    return () => window.clearTimeout(timer);
  }, [authLoading, isBooting, user]);

  useEffect(() => {
    if (qrType !== 'vcard') {
      if (generatedShortUrl || generatedLongUrl) {
        setGeneratedShortUrl('');
        setGeneratedLongUrl('');
      }
      return;
    }

    if (generatedLongUrl && generatedLongUrl !== vcardUrl) {
      setGeneratedShortUrl('');
      setGeneratedLongUrl('');
    }
  }, [qrType, vcardUrl, generatedLongUrl, generatedShortUrl]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setShowUpsell(false);
      return;
    }

    const sessionShown = sessionStorage.getItem(UPSell_SESSION_KEY);
    if (sessionShown) {
      setShowUpsell(false);
      return;
    }

    const lastShownRaw = localStorage.getItem(UPSell_LAST_SHOWN_KEY);
    const lastShownAt = lastShownRaw ? Number(lastShownRaw) : 0;
    const now = Date.now();

    if (!lastShownAt || now - lastShownAt >= UPSell_INTERVAL_MS) {
      setShowUpsell(true);
      sessionStorage.setItem(UPSell_SESSION_KEY, 'true');
      localStorage.setItem(UPSell_LAST_SHOWN_KEY, String(now));
    } else {
      setShowUpsell(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (activeTab !== 'analytics') {
      setShowAnalyticsIntro(false);
      return;
    }

    if (analyticsSeen) {
      setShowAnalyticsIntro(false);
      return;
    }

    setShowAnalyticsIntro(true);
    setAnalyticsSeen(true);
    const timer = window.setTimeout(() => {
      setShowAnalyticsIntro(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [activeTab, analyticsSeen]);

  useEffect(() => {
    if (!pendingCreateScroll) return;
    if (activeTab !== 'studio') return;

    const timer = window.setTimeout(() => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingCreateScroll(false);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [activeTab, pendingCreateScroll]);

  const handleGenerate = async () => {
    if (!canGenerate) {
      const message = qrType === 'website'
        ? 'Please enter a valid website URL'
        : qrType === 'email'
          ? 'Please enter a valid email address'
          : qrType === 'phone'
            ? 'Please enter a valid phone number'
            : 'Please add a name or profile slug';
      toast.error(message);
      return;
    }
    if (qrMode === 'dynamic') {
      toast.info('Dynamic QR codes are coming soon. Generating static QR for now.');
    }
    if (!longFormContent.trim()) {
      toast.error('Please enter content to generate');
      return;
    }
    setIsGenerating(true);
    const response = qrType === 'vcard'
      ? await createVcard({
        slug: vcardSlug || null,
        publicUrl: vcardUrl,
        data: {
          profile: vcard,
          style: vcardStyle,
        },
        options: {
          ...options,
          content: vcardUrl,
        },
      })
      : await generateQR(longFormContent, options, qrType ?? undefined);
    setIsGenerating(false);
    if (response.success) {
      if ('url' in response && response.url) {
        setGeneratedShortUrl(response.url.shortUrl);
        setGeneratedLongUrl(response.url.targetUrl);
        setLastGeneratedContent(response.url.shortUrl);
      } else if ('data' in response && response.data) {
        setLastGeneratedContent(response.data.content);
      }
      toast.success('QR code generated!');
      setHasGenerated(true);
    } else {
      toast.error('Failed to generate QR code');
    }
  };

  const handleDownload = async (format: 'png' | 'svg' | 'jpeg' | 'pdf') => {
    if (!qrRef.current) return;
    try {
      if (format === 'png') await qrRef.current.downloadPng();
      else if (format === 'svg') await qrRef.current.downloadSvg();
      else if (format === 'jpeg') await qrRef.current.downloadJpeg();
      else await qrRef.current.downloadPdf();
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleCopy = async () => {
    if (!qrRef.current) return;
    const success = await qrRef.current.copyToClipboard();
    if (success) {
      toast.success('Copied to clipboard!');
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleHistorySelect = (historicOptions: QROptions) => {
    setOptions(historicOptions);
    setQrMode('static');
    setQrType('website');
    setWebsiteUrl(historicOptions.content);
    setLastGeneratedContent(historicOptions.content);
    setHasGenerated(true);
    toast.info('Loaded from history');
  };

  const handleStartStatic = () => {
    setQrMode('static');
    setQrType('website');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setPendingCreateScroll(true);
  };

  const handleStartVcard = () => {
    setQrMode('static');
    setQrType('vcard');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setPendingCreateScroll(true);
  };

  const handleCopyUrl = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const vcardColorPresets = [
    '#111827',
    '#0f172a',
    '#1e293b',
    '#0b132a',
    '#1f2937',
    '#2563eb',
    '#4f46e5',
    '#0891b2',
    '#0f766e',
    '#a855f7',
  ];

  const vcardFontOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Garamond', value: 'Garamond, "Times New Roman", serif' },
  ];

  const makeVcardGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;

  const handleVcardLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setVcardStyle((prev) => ({ ...prev, logoDataUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleVcardPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setVcardStyle((prev) => ({
        ...prev,
        profilePhotoDataUrl: result,
        photoZoom: 110,
        photoX: 50,
        photoY: 50,
      }));
    };
    reader.readAsDataURL(file);
  };

  const vcardFrontStyle = {
    fontFamily: vcardStyle.fontFamily,
    borderRadius: `${vcardStyle.radius}px`,
    background: vcardStyle.frontUseGradient
      ? makeVcardGradient(vcardStyle.frontColor, vcardStyle.frontGradient)
      : vcardStyle.frontColor,
  } as const;

  const vcardBackStyle = {
    fontFamily: vcardStyle.fontFamily,
    borderRadius: `${vcardStyle.radius}px`,
    background: vcardStyle.backUseGradient
      ? makeVcardGradient(vcardStyle.backColor, vcardStyle.backGradient)
      : vcardStyle.backColor,
  } as const;

  const CreateMenu = ({
    align = 'center',
    label = 'Create New',
  }: {
    align?: 'center' | 'right';
    label?: string;
  }) => {
    const openCreateMenu = () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsCreateHover(true);
    };

    const scheduleCloseCreateMenu = () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = window.setTimeout(() => {
        setIsCreateHover(false);
      }, 120);
    };

    return (
      <div
        className={`relative z-[60] group flex items-center gap-3 ${
          align === 'right' ? 'ml-auto' : ''
        }`}
        onBlur={scheduleCloseCreateMenu}
      >
        <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/80 transition group-hover:opacity-0">
          {label}
        </span>

        <div className="relative">
          <button
            type="button"
            aria-label="Create new QR code"
            className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/80 text-primary shadow-sm transition hover:border-primary/50 hover:bg-card/90 hover:shadow-lg"
            onMouseEnter={openCreateMenu}
            onMouseLeave={scheduleCloseCreateMenu}
            onFocus={openCreateMenu}
            onClick={() => {
              handleStartStatic();
              setIsCreateHover(false);
            }}
          >
            <Plus className="h-5 w-5" />
          </button>

          {isCreateHover && (
            <div
              className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100 transition-all duration-200"
              onMouseEnter={openCreateMenu}
              onMouseLeave={scheduleCloseCreateMenu}
            >
              <div className="absolute inset-0 rounded-full border border-border/50 bg-card/50 shadow-[0_0_30px_rgba(15,23,42,0.12)] backdrop-blur-sm" />
              <div className="absolute inset-4 rounded-full border border-primary/20" />

              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleStartStatic();
                    setIsCreateHover(false);
                  }}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
                >
                  <LinkIcon className="h-5 w-5" />
                </button>
                <span className="rounded-full border border-border/60 bg-card/95 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground shadow-sm">
                  Static
                </span>
              </div>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  aria-disabled="true"
                  onClick={() => {
                    toast.info('Dynamic QR is coming soon.');
                    setIsCreateHover(false);
                  }}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground opacity-60 shadow-lg cursor-not-allowed"
                >
                  <Sparkles className="h-5 w-5" />
                </button>
                <span className="rounded-full border border-border/60 bg-card/95 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70 shadow-sm">
                  Dynamic
                </span>
              </div>

              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleStartVcard();
                    setIsCreateHover(false);
                  }}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
                >
                  <User className="h-5 w-5" />
                </button>
                <span className="rounded-full border border-border/60 bg-card/95 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground shadow-sm">
                  Vcard
                </span>
              </div>

              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.info('Upgrade to a Pro Plan to unlock this feature.');
                    setIsCreateHover(false);
                  }}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground shadow-lg transition hover:border-primary/60 hover:text-primary"
                >
                  <File className="h-5 w-5" />
                </button>
                <span className="rounded-full border border-border/60 bg-card/95 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground shadow-sm">
                  File
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {isCreateHover && !showUpsell && !isBooting && activeTab === 'studio' && (
        <div className="fixed inset-0 z-[40] pointer-events-none bg-background/40 backdrop-blur-md transition" />
      )}

      {isBooting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <span className="relative inline-block">
              <span className="text-muted-foreground/70">QR Code Studio</span>
              <span className="absolute inset-0 logo-fill">QR Code Studio</span>
            </span>
          </div>
        </div>
      )}

      {!isBooting && showUpsell && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4">
          <div className="glass-panel rounded-3xl p-8 w-full max-w-md text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Go Pro</p>
            <h2 className="text-2xl font-semibold">Unlimited analytics, insights, and more.</h2>
            <p className="text-sm text-muted-foreground">
              Unlock advanced data, user interactions, and premium exports with QR Code Studio Pro.
            </p>
            <div className="pt-2 space-y-2">
              <Button className="w-full bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs">
                Go Pro
              </Button>
              <button
                type="button"
                className="w-full text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
                onClick={() => setShowUpsell(false)}
              >
                Continue for Free
              </button>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">QR Code Studio</span>
                <span className="absolute inset-0 logo-fill">QR Code Studio</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Generating your QR</p>
          </div>
        </div>
      )}

      {showAnalyticsIntro && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">Intel</span>
                <span className="absolute inset-0 logo-fill">Intel</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Loading insights</p>
          </div>
        </div>
      )}

      {showWelcomeIntro && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">{welcomeMessage}</span>
                <span className="absolute inset-0 logo-fill">{welcomeMessage}</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Loading your workspace</p>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setShowAccountModal(false)}
        >
          <div
            className="glass-panel rounded-3xl p-8 w-full max-w-lg space-y-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">My Account</p>
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <p className="text-sm text-muted-foreground">
                Save your QR codes, track analytics, and sync across devices.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                value={accountForm.username}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Username"
                maxLength={24}
                className="bg-secondary/40 border-border"
              />
              <Input
                value={accountForm.fullName}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Full Name"
                className="bg-secondary/40 border-border"
              />
              <Input
                value={accountForm.email}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email Address"
                type="email"
                className="bg-secondary/40 border-border"
              />
            </div>
            <label className="flex items-start gap-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                I agree to the Terms & Conditions and subscribe for free updates.
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                disabled={!acceptedTerms}
              >
                Create Account
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-xs uppercase tracking-[0.3em]"
                onClick={() => setShowAccountModal(false)}
              >
                Close
              </Button>
            </div>
            <button
              type="button"
              className="w-full text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
              onClick={() => {
                setShowAccountModal(false);
                navigate('/login');
              }}
            >
              Already have an account? <span className="text-primary">Sign In</span>
            </button>
            <div className="text-center">
              <a
                href="/terms"
                className="text-[11px] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-primary"
              >
                View Terms & Conditions
              </a>
            </div>
          </div>
        </div>
      )}

      {showVcardCustomizer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setShowVcardCustomizer(false)}
        >
          <div
            className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-6xl space-y-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">VCard</p>
                <h2 className="text-2xl font-semibold">Customize your card</h2>
                <p className="text-sm text-muted-foreground">
                  Tap the preview to flip between front and back.
                </p>
              </div>
              <Button
                variant="ghost"
                className="text-xs uppercase tracking-[0.3em]"
                onClick={() => setShowVcardCustomizer(false)}
              >
                Close
              </Button>
            </div>

            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  className="relative h-[420px] w-[260px] sm:h-[460px] sm:w-[280px]"
                  onClick={() => setVcardPreviewSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                  aria-label="Flip vcard preview"
                >
                  <div
                    className="absolute inset-0 transition-transform duration-500"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: vcardPreviewSide === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    <div
                      className="absolute inset-0 flex flex-col justify-between p-6 text-left text-white shadow-xl"
                      style={{ ...vcardFrontStyle, backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/70">VCard</p>
                          <h3 className="text-2xl font-semibold">
                            {vcard.name || 'Your Name'}
                          </h3>
                          <p className="text-sm text-white/80">
                            {vcard.company || 'Your Company'}
                          </p>
                        </div>
                        <div
                          className="h-16 w-16 rounded-full border border-white/30 bg-white/10"
                          style={{
                            backgroundImage: vcardStyle.profilePhotoDataUrl
                              ? `url(${vcardStyle.profilePhotoDataUrl})`
                              : undefined,
                            backgroundSize: `${vcardStyle.photoZoom}%`,
                            backgroundPosition: `${vcardStyle.photoX}% ${vcardStyle.photoY}%`,
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      </div>
                      <div className="space-y-2 text-sm text-white/90">
                        <p>{vcard.phone || '+1 (555) 123-4567'}</p>
                        <p>{vcard.email || 'you@example.com'}</p>
                        <p>{vcard.website || 'qrcodestudio.app'}</p>
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">
                        Tap to flip
                      </p>
                    </div>

                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-white shadow-xl"
                      style={{
                        ...vcardBackStyle,
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      {vcardStyle.logoDataUrl ? (
                        <img
                          src={vcardStyle.logoDataUrl}
                          alt="VCard logo"
                          className="h-20 w-20 rounded-xl object-cover border border-white/20"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-xl border border-white/20 flex items-center justify-center text-xs text-white/70">
                          Logo
                        </div>
                      )}
                      <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                        Tap to flip
                      </p>
                    </div>
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">Preview is interactive.</p>
              </div>

                <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Contact Photo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use a professional selfie for services/freelancers or your business logo for a company card.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVcardPhotoChange}
                    className="text-xs text-muted-foreground"
                  />
                  <div className="flex items-center gap-4">
                    <div
                      className="h-20 w-20 rounded-full border border-border bg-secondary/40"
                      style={{
                        backgroundImage: vcardStyle.profilePhotoDataUrl
                          ? `url(${vcardStyle.profilePhotoDataUrl})`
                          : undefined,
                        backgroundSize: `${vcardStyle.photoZoom}%`,
                        backgroundPosition: `${vcardStyle.photoX}% ${vcardStyle.photoY}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                          Zoom
                        </p>
                        <input
                          type="range"
                          min={80}
                          max={180}
                          value={vcardStyle.photoZoom}
                          onChange={(event) =>
                            setVcardStyle((prev) => ({
                              ...prev,
                              photoZoom: Number(event.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                          Position
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={vcardStyle.photoX}
                            onChange={(event) =>
                              setVcardStyle((prev) => ({
                                ...prev,
                                photoX: Number(event.target.value),
                              }))
                            }
                            className="w-full"
                          />
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={vcardStyle.photoY}
                            onChange={(event) =>
                              setVcardStyle((prev) => ({
                                ...prev,
                                photoY: Number(event.target.value),
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Typography
                  </p>
                  <select
                    className="w-full h-11 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                    value={vcardStyle.fontFamily}
                    onChange={(event) =>
                      setVcardStyle((prev) => ({ ...prev, fontFamily: event.target.value }))
                    }
                  >
                    {vcardFontOptions.map((font) => (
                      <option key={font.label} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Corner Radius
                  </p>
                  <input
                    type="range"
                    min={8}
                    max={32}
                    value={vcardStyle.radius}
                    onChange={(event) =>
                      setVcardStyle((prev) => ({
                        ...prev,
                        radius: Number(event.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Front Style
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vcardColorPresets.map((color) => (
                        <button
                          key={`front-${color}`}
                          type="button"
                          aria-label={`Front color ${color}`}
                          className={`h-8 w-8 rounded-full border ${
                            vcardStyle.frontColor === color ? 'border-primary' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setVcardStyle((prev) => ({ ...prev, frontColor: color }))
                          }
                        />
                      ))}
                    </div>
                    <Input
                      value={vcardStyle.frontColor}
                      onChange={(event) =>
                        setVcardStyle((prev) => ({ ...prev, frontColor: event.target.value }))
                      }
                      placeholder="#111827"
                      className="bg-secondary/40 border-border text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="front-gradient"
                        type="checkbox"
                        checked={vcardStyle.frontUseGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            frontUseGradient: event.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="front-gradient" className="text-xs text-muted-foreground">
                        Use gradient
                      </label>
                    </div>
                    {vcardStyle.frontUseGradient && (
                      <Input
                        value={vcardStyle.frontGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            frontGradient: event.target.value,
                          }))
                        }
                        placeholder="#2563eb"
                        className="bg-secondary/40 border-border text-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Back Style
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vcardColorPresets.map((color) => (
                        <button
                          key={`back-${color}`}
                          type="button"
                          aria-label={`Back color ${color}`}
                          className={`h-8 w-8 rounded-full border ${
                            vcardStyle.backColor === color ? 'border-primary' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setVcardStyle((prev) => ({ ...prev, backColor: color }))
                          }
                        />
                      ))}
                    </div>
                    <Input
                      value={vcardStyle.backColor}
                      onChange={(event) =>
                        setVcardStyle((prev) => ({ ...prev, backColor: event.target.value }))
                      }
                      placeholder="#0f172a"
                      className="bg-secondary/40 border-border text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="back-gradient"
                        type="checkbox"
                        checked={vcardStyle.backUseGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            backUseGradient: event.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="back-gradient" className="text-xs text-muted-foreground">
                        Use gradient
                      </label>
                    </div>
                    {vcardStyle.backUseGradient && (
                      <Input
                        value={vcardStyle.backGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            backGradient: event.target.value,
                          }))
                        }
                        placeholder="#4f46e5"
                        className="bg-secondary/40 border-border text-xs"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Back Logo
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVcardLogoChange}
                    className="text-xs text-muted-foreground"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                    onClick={() => setShowVcardCustomizer(false)}
                  >
                    Save Customization
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border uppercase tracking-[0.2em] text-xs"
                    onClick={() => {
                      setVcardPreviewSide('front');
                      setShowVcardCustomizer(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-8 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.28),transparent_60%)] blur-3xl float-slow" />
        <div className="absolute top-4 right-6 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22),transparent_60%)] blur-3xl float-medium" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18),transparent_65%)] blur-3xl float-fast" />
        <div className="absolute inset-x-0 top-1/4 h-72 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-30 glass-panel border-b border-border/50 transition ${
          showUpsell || isBooting ? 'blur-md pointer-events-none select-none' : ''
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text tracking-wide">QR Code Studio</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">Generate • Customize • Share</p>
            </div>
          </div>
          <nav className="hidden lg:flex items-end gap-8 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            {[
              { id: 'studio', label: 'Studio' },
              { id: 'codes', label: 'Arsenal' },
              { id: 'analytics', label: 'Intel' },
              { id: 'settings', label: 'Config' },
              { id: 'upgrade', label: 'Upgrade' },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`relative px-1 pb-2 transition-all before:absolute before:-top-2 before:left-0 before:h-[2px] before:w-full before:rounded-full before:bg-gradient-to-r before:from-primary before:to-amber-200 before:opacity-0 before:transition ${
                    isActive
                      ? 'text-foreground before:opacity-100'
                      : 'text-muted-foreground hover:text-foreground hover:before:opacity-80'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative group">
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center transition hover:border-primary/50"
                aria-label="My Account"
                onClick={() => setShowAccountModal(true)}
              >
                <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
              </button>
              <div className="pointer-events-none absolute right-0 top-full mt-2 w-40 opacity-0 transition group-hover:opacity-100">
                <div className="rounded-xl border border-border/60 bg-card/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
                  <p className="font-semibold">My Account</p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Free Plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`container mx-auto px-4 py-8 transition ${
          showUpsell || isBooting ? 'blur-md pointer-events-none select-none' : ''
        }`}
      >
        {activeTab === 'studio' && (
          <>
            <section id="studio" className="space-y-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Studio</p>
              <h2 className="text-3xl font-semibold tracking-tight">Creative Workspace</h2>
            </div>
            <CreateMenu label="Create New QR" />
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="glass-panel rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
                  <h3 className="text-lg font-semibold">Your QR Arsenal</h3>
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-primary">Active</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Codes', value: '0' },
                  { label: 'Scans Today', value: '0' },
                  { label: 'Dynamic Live', value: '0' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-secondary/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-semibold mt-2">{item.value}</p>
                  </div>
                ))}
              </div>
      </div>

            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Studio Guide</p>
              <h3 className="text-lg font-semibold">Your QR flow</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>1. Choose Static or Dynamic.</p>
                <p>2. Pick URL QR or Virtual Card.</p>
                <p>3. Customize, generate, and export.</p>
              </div>
            </div>
          </div>
        </section>

        <section ref={createSectionRef} id="create" className="mt-14">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Create</p>
              <h2 className="text-3xl font-semibold tracking-tight">Build Your QR</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Step-by-step</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            {/* Left Panel - Input & Preview */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-6 space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold">Step 1 · QR Mode</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Select</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className={qrMode === 'static'
                        ? 'bg-card/80 text-foreground border border-border/70 border-b-transparent rounded-t-xl uppercase tracking-[0.2em] text-xs'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-t-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => {
                        setQrMode('static');
                        setQrType(null);
                        setWebsiteTouched(false);
                      }}
                    >
                      Static
                    </Button>
                    <Button
                      size="sm"
                      className="bg-secondary/40 border border-border/60 text-muted-foreground rounded-t-xl uppercase tracking-[0.2em] text-xs cursor-not-allowed"
                      onClick={() => toast.info('Dynamic QR is a placeholder for now.')}
                    >
                      Dynamic
                    </Button>
                  </div>
                </div>

                {hasSelectedMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Step 2 · QR Type</h3>
                      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Choose</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setQrType('website');
                          setWebsiteTouched(false);
                          setEmailTouched(false);
                          setPhoneTouched(false);
                        }}
                        className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                          qrType === 'website'
                            ? 'border-border/70 bg-card/80'
                            : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">URL QR</p>
                        <p className="mt-2 font-semibold">Open a URL</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrType('vcard')}
                        className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                          qrType === 'vcard'
                            ? 'border-border/70 bg-card/80'
                            : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Virtual Card</p>
                        <p className="mt-2 font-semibold">Share your profile</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQrType('email');
                          setEmailTouched(false);
                        }}
                        className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                          qrType === 'email'
                            ? 'border-border/70 bg-card/80'
                            : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Email</p>
                        <p className="mt-2 font-semibold">Send an email</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQrType('phone');
                          setPhoneTouched(false);
                        }}
                        className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                          qrType === 'phone'
                            ? 'border-border/70 bg-card/80'
                            : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Phone</p>
                        <p className="mt-2 font-semibold">Call a number</p>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Choose Static or Dynamic to unlock QR types.
                  </div>
                )}

                {hasSelectedType ? (
                  qrType === 'website' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Enter URL</h3>
                      </div>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        onBlur={() => setWebsiteTouched(true)}
                        placeholder="example.com or https://example.com"
                        className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                        inputMode="url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a valid website ending in a real domain (.com, .org, .net, etc).
                      </p>
                      {websiteTouched && websiteUrl && !isWebsiteValid && (
                        <p className="text-xs text-destructive">
                          Please enter a valid website URL.
                        </p>
                      )}
                    </div>
                  ) : qrType === 'email' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Enter Email</h3>
                      </div>
                      <Input
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        placeholder="you@example.com"
                        className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                        inputMode="email"
                      />
                      <p className="text-xs text-muted-foreground">
                        QR will open a new email to this address.
                      </p>
                      {emailTouched && emailAddress && !isEmailValid && (
                        <p className="text-xs text-destructive">
                          Please enter a valid email address.
                        </p>
                      )}
                    </div>
                  ) : qrType === 'phone' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Enter Phone</h3>
                      </div>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="+1 (555) 123-4567"
                        className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                        inputMode="tel"
                      />
                      <p className="text-xs text-muted-foreground">
                        QR will start a call to this number.
                      </p>
                      {phoneTouched && phoneNumber && !isPhoneValid && (
                        <p className="text-xs text-destructive">
                          Please enter a valid phone number.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Virtual Card Details</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Input
                          value={vcard.name}
                          onChange={(e) => setVcard((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Full Name"
                          className="bg-secondary/50 border-border"
                        />
                        <Input
                          value={vcard.company}
                          onChange={(e) => setVcard((prev) => ({ ...prev, company: e.target.value }))}
                          placeholder="Company"
                          className="bg-secondary/50 border-border"
                        />
                        <Input
                          value={vcard.phone}
                          onChange={(e) => setVcard((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="Phone"
                          className="bg-secondary/50 border-border"
                        />
                        <Input
                          value={vcard.email}
                          onChange={(e) => setVcard((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="Email"
                          type="email"
                          className="bg-secondary/50 border-border"
                        />
                        <Input
                          value={vcard.website}
                          onChange={(e) => setVcard((prev) => ({ ...prev, website: e.target.value }))}
                          placeholder="Website"
                          className="bg-secondary/50 border-border"
                        />
                        <Input
                          value={vcard.slug}
                          onChange={(e) => setVcard((prev) => ({ ...prev, slug: e.target.value }))}
                          placeholder="Profile Slug (optional)"
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          value={vcard.about}
                          onChange={(e) => setVcard((prev) => ({ ...prev, about: e.target.value }))}
                          placeholder="About Me (max 250 characters)"
                          maxLength={250}
                          className="bg-secondary/50 border-border"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Virtual card hosted at QR Code Studio</span>
                          <span>{vcard.about.length}/250</span>
                        </div>
                        <Input
                          value={vcardUrl || 'https://qrcode.luminarapps.com/your-handle'}
                          readOnly
                          className="bg-secondary/40 border-border text-xs text-muted-foreground"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 border-border uppercase tracking-[0.2em] text-xs"
                        onClick={() => {
                          setShowVcardCustomizer(true);
                          setVcardPreviewSide('front');
                        }}
                      >
                        Customize VCard
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Select a QR type to continue building your code.
                  </div>
                )}

                {hasSelectedType ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="lg"
                      className="gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                      disabled={!canGenerate || isGenerating}
                      onClick={handleGenerate}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating
                        </>
                      ) : (
                        <>Generate My QR Code</>
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="lg"
                          className="gap-2 bg-secondary/60 border border-border hover:border-primary hover:bg-primary/10"
                          disabled={!hasGenerated}
                        >
                          <Download className="h-4 w-4" />
                          Download
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="glass-panel">
                        <DropdownMenuItem onClick={() => handleDownload('png')}>
                          Download PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('svg')}>
                          Download SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('jpeg')}>
                          Download JPEG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 border-border hover:border-primary hover:bg-primary/10"
                      onClick={handleCopy}
                      disabled={!hasGenerated}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Complete steps 1-3 to unlock generate and export actions.
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                {hasSelectedMode && hasSelectedType ? (
                  <QRPreview
                    ref={qrRef}
                    options={options}
                    isGenerating={isGenerating}
                    contentOverride={previewContent}
                    showCaption={hasGenerated}
                  />
                ) : (
                  <div className="glass-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
                    Select a mode and type to preview your QR design.
                  </div>
                )}
              </motion.div>

              {hasGenerated && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-panel rounded-2xl p-6 space-y-4"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Result</p>
                    <h3 className="text-lg font-semibold">Your QR is ready</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Input
                      value={generatedContent}
                      readOnly
                      className="bg-secondary/40 border-border text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-border hover:border-primary hover:bg-primary/10"
                      onClick={handleCopyUrl}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="gap-2 bg-secondary/60 border border-border hover:border-primary hover:bg-primary/10"
                        >
                          <Download className="h-4 w-4" />
                          Download
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="glass-panel">
                        <DropdownMenuItem onClick={() => handleDownload('png')}>
                          Download PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('svg')}>
                          Download SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('jpeg')}>
                          Download JPEG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {canShowPreview && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary hover:text-primary/80 transition"
                      >
                        <Monitor className="h-4 w-4" />
                        Live Preview
                      </a>
                    )}
                  </div>

                  {canShowPreview && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-xl border border-border/60 bg-secondary/30"
                    >
                      <img
                        src={`https://image.thum.io/get/width/1200/${previewUrl}`}
                        alt="Live preview"
                        className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </a>
                  )}
                </motion.div>
              )}
            </div>

            {/* Right Panel - Customization */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              {hasSelectedMode && hasSelectedType ? (
                <div className="glass-panel rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground px-4 pt-2">
                    Step 4 · Customize
                  </p>
                  <Accordion type="multiple" defaultValue={['colors', 'style']} className="space-y-2">
                    <AccordionItem value="colors" className="border-none">
                      <AccordionTrigger className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline">
                        <span className="text-sm font-medium">Colors</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 space-y-5">
                        <ColorPicker
                          label="Foreground Color"
                          value={options.fgColor}
                          onChange={(v) => updateOption('fgColor', v)}
                        />
                        <ColorPicker
                          label="Background Color"
                          value={options.bgColor}
                          onChange={(v) => updateOption('bgColor', v)}
                          presets={['#0A192F', '#D4AF37', '#F5F5F5', '#1F2937', '#111827', '#FFFFFF', '#000000']}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="style" className="border-none">
                      <AccordionTrigger className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline">
                        <span className="text-sm font-medium">Style</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 space-y-5">
                        <SizeSlider
                          value={options.size}
                          onChange={(v) => updateOption('size', v)}
                        />
                        <CornerStylePicker
                          value={options.cornerStyle}
                          onChange={(v) => updateOption('cornerStyle', v)}
                        />
                        <ErrorCorrectionSelector
                          value={options.errorCorrectionLevel}
                          onChange={(v) => updateOption('errorCorrectionLevel', v)}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="logo" className="border-none">
                      <AccordionTrigger className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline">
                        <span className="text-sm font-medium">Logo</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <LogoUpload
                          logo={options.logo}
                          onLogoChange={(v) => updateOption('logo', v)}
                        />
                        {options.logo && (
                          <div className="mt-4">
                            <SizeSlider
                              value={options.logoSize || 50}
                              onChange={(v) => updateOption('logoSize', v)}
                              min={20}
                              max={100}
                            />
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground">
                  Customize colors, style, and logo once you pick a mode and QR type.
                </div>
              )}
            </motion.div>
          </div>
        </section>
          </>
        )}

        {activeTab === 'codes' && (
          <section id="arsenal" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Arsenal</p>
              <h2 className="text-3xl font-semibold tracking-tight">Your QR Arsenal</h2>
            </div>
            {!hasGenerated ? (
              <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
                <p className="text-sm text-muted-foreground">No QR codes yet.</p>
                <p className="text-lg font-semibold">Create your first QR Code to get started.</p>
                <div className="flex items-center justify-center">
                  <CreateMenu label="Create New" />
                </div>
              </div>
            ) : (
              <HistoryPanel onSelect={handleHistorySelect} />
            )}
          </section>
        )}

        {activeTab === 'analytics' && (
          <section id="intel" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Intel</p>
              <h2 className="text-3xl font-semibold tracking-tight">Live Intelligence</h2>
            </div>

            {!hasGenerated ? (
              <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
                <p className="text-sm text-muted-foreground">No intel yet.</p>
                <p className="text-lg font-semibold">Create your first QR Code to view intel.</p>
                <div className="flex items-center justify-center">
                  <CreateMenu label="Create New" />
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="glass-panel rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">QR Code</p>
                      <h3 className="text-lg font-semibold">Active Campaign</h3>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-primary">Live</span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Scan Count', value: '0' },
                      { label: 'Unique Users', value: '0' },
                      { label: 'Avg. Daily', value: '0' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-semibold mt-2">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Scans over time</p>
                    <div className="flex items-end gap-2 h-32">
                      {[0, 0, 0, 0, 0, 0, 0, 0].map((value, index) => (
                        <div
                          key={`${value}-${index}`}
                          className="flex-1 rounded-full bg-gradient-to-t from-primary/30 to-primary/80"
                          style={{ height: `${value}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Top OS</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>iOS</span>
                          <span className="text-primary">0%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Android</span>
                          <span className="text-primary">0%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Desktop</span>
                          <span className="text-primary">0%</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Scans by location</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>San Juan, PR</span>
                          <span className="text-primary">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Brooklyn, NYC</span>
                          <span className="text-primary">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Miami, FL</span>
                          <span className="text-primary">0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass-panel rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">QR Preview</p>
                    <div className="mt-4 flex justify-center">
                      <QRPreview
                        options={options}
                        contentOverride={generatedContent}
                        showCaption={false}
                      />
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Scan Map</p>
                    <div className="relative mt-4 h-48 rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/40 via-secondary/10 to-primary/20 overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.35),transparent_45%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.25),transparent_40%)]" />
                      {[
                        { top: '25%', left: '22%' },
                        { top: '48%', left: '68%' },
                        { top: '62%', left: '38%' },
                        { top: '30%', left: '58%' },
                      ].map((pin, index) => (
                        <div
                          key={`${pin.top}-${pin.left}-${index}`}
                          className="absolute h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                          style={{ top: pin.top, left: pin.left }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section id="config" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Config</p>
              <h2 className="text-3xl font-semibold tracking-tight">Preferences</h2>
            </div>
            <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-4">
              <p>From here you can customize your experience and preferences.</p>
              <p>Please log in or create an account to unlock settings, exports, and team features.</p>
              <div className="flex flex-col sm:flex-row gap-3 text-xs uppercase tracking-[0.3em]">
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 transition"
                  onClick={() => navigate('/login')}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 transition"
                  onClick={() => navigate('/login')}
                >
                  Sign Up
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'upgrade' && (
          <section id="upgrade" className="space-y-10">
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Upgrade</p>
              <h2 className="text-3xl font-semibold tracking-tight">QR Code Studio by Luminar Apps</h2>
              <p className="text-sm text-muted-foreground">Pricing comparison for every team size.</p>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Current plan: <span className="text-foreground font-semibold">FREE FOREVER PLAN</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="glass-panel rounded-2xl p-6 space-y-5 border border-border/60">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Free Forever</p>
                  <h3 className="text-2xl font-semibold">Free Forever</h3>
                  <p className="text-sm text-primary uppercase tracking-[0.25em]">
                    Free Forever – No Credit Card
                  </p>
                </div>
                <div className="text-3xl font-semibold">$0 <span className="text-sm text-muted-foreground">/ month</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="font-semibold text-foreground">1</span> Dynamic QR Code</li>
                  <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
                  <li><span className="font-semibold text-foreground">Basic</span> Intel</li>
                  <li><span className="font-semibold text-foreground">Standard</span> QR Styles</li>
                  <li><span className="font-semibold text-foreground">Community</span> Support</li>
                  <li><span className="font-semibold text-foreground">Watermark</span> Enabled</li>
                </ul>
                <Button
                  disabled
                  className="w-full bg-secondary/60 text-muted-foreground uppercase tracking-[0.2em] text-xs pointer-events-none"
                >
                  View Plan
                </Button>
              </div>

              <div className="glass-panel rounded-2xl p-6 space-y-5 border-2 border-primary/80 shadow-[0_0_40px_rgba(59,130,246,0.25)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pro</p>
                  <span className="rounded-full bg-primary/10 text-primary text-[10px] uppercase tracking-[0.35em] px-3 py-1">
                    Most Popular
                  </span>
                </div>
                <h3 className="text-2xl font-semibold">Pro</h3>
                <div className="text-3xl font-semibold">$7 <span className="text-sm text-muted-foreground">/ month</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="font-semibold text-foreground">25</span> Dynamic QR Codes</li>
                  <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
                  <li><span className="font-semibold text-foreground">Full</span> Intel (analytics)</li>
                  <li><span className="font-semibold text-foreground">Bulk</span> QR Creation</li>
                  <li><span className="font-semibold text-foreground">Custom</span> Colors & Logos</li>
                  <li><span className="font-semibold text-foreground">Preset</span> Loadouts</li>
                  <li><span className="font-semibold text-foreground">Priority</span> Updates</li>
                  <li><span className="font-semibold text-foreground">No</span> Watermark</li>
                </ul>
                <Button
                  disabled
                  className="w-full bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs pointer-events-none"
                >
                  Coming Soon
                </Button>
              </div>

              <div className="glass-panel rounded-2xl p-6 space-y-5 border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Command</p>
                    <h3 className="text-2xl font-semibold">Command</h3>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-[0.3em]">
                    <Star className="h-4 w-4 fill-amber-300" />
                    Premium
                  </div>
                </div>
                <div className="text-3xl font-semibold">$19 <span className="text-sm text-muted-foreground">/ month</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="font-semibold text-foreground">Unlimited</span> Dynamic QR Codes</li>
                  <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
                  <li><span className="font-semibold text-foreground">Advanced</span> Intel (reports & trends)</li>
                  <li><span className="font-semibold text-foreground">Bulk</span> Creation (High-volume)</li>
                  <li><span className="font-semibold text-foreground">API</span> Access</li>
                  <li><span className="font-semibold text-foreground">Up to 5</span> Team Users</li>
                  <li><span className="font-semibold text-foreground">Shared</span> Arsenal</li>
                  <li><span className="font-semibold text-foreground">Priority</span> Support</li>
                  <li><span className="font-semibold text-foreground">No</span> Watermark</li>
                </ul>
                <Button
                  disabled
                  className="w-full bg-secondary/60 text-muted-foreground uppercase tracking-[0.2em] text-xs pointer-events-none"
                >
                  View Plan
                </Button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="text-left border-b border-border/60">
                    <th className="py-3 pr-4 text-foreground">Feature</th>
                    <th className="py-3 px-4 text-foreground">Free Forever</th>
                    <th className="py-3 px-4 text-foreground">Pro</th>
                    <th className="py-3 pl-4 text-foreground">Command</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Dynamic QR Codes', '1', '25', 'Unlimited'],
                    ['Scans', 'Unlimited', 'Unlimited', 'Unlimited'],
                    ['Intel', 'Basic', 'Full', 'Advanced'],
                    ['Bulk Creation', '—', 'Included', 'High-volume'],
                    ['Custom Colors & Logos', '—', 'Included', 'Included'],
                    ['Preset Loadouts', '—', 'Included', 'Included'],
                    ['API Access', '—', '—', 'Included'],
                    ['Team Users', '—', '—', 'Up to 5'],
                    ['Shared Arsenal', '—', '—', 'Included'],
                    ['Support', 'Community', 'Priority Updates', 'Priority Support'],
                    ['Watermark', 'Enabled', 'No', 'No'],
                  ].map(([feature, free, pro, command]) => (
                    <tr key={feature} className="border-b border-border/40">
                      <td className="py-3 pr-4 text-foreground">{feature}</td>
                      <td className="py-3 px-4">{free}</td>
                      <td className="py-3 px-4">{pro}</td>
                      <td className="py-3 pl-4">{command}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <a
            href="/terms"
            className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition"
          >
            Terms & Conditions
          </a>
        </div>
        <footer className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GDev x Luminar Apps.
        </footer>
      </main>
    </div>
  );
};

export default Index;
