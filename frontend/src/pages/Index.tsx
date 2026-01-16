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
import { generateQR } from '@/lib/api';
import { QROptions, defaultQROptions } from '@/types/qr';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Copy,
  Download,
  Link as LinkIcon,
  Loader2,
  Monitor,
  Plus,
  QrCode,
  Sparkles,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const Index = () => {
  const [options, setOptions] = useState<QROptions>(defaultQROptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastGeneratedContent, setLastGeneratedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'studio' | 'codes' | 'analytics' | 'settings'>('studio');
  const [qrMode, setQrMode] = useState<'static' | 'dynamic' | null>(null);
  const [qrType, setQrType] = useState<'website' | 'vcard' | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showUpsell, setShowUpsell] = useState(true);
  const [isCreateHover, setIsCreateHover] = useState(false);
  const [showAnalyticsIntro, setShowAnalyticsIntro] = useState(false);
  const [analyticsSeen, setAnalyticsSeen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [accountForm, setAccountForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  const [vcard, setVcard] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    company: '',
    about: '',
    slug: '',
  });
  const qrRef = useRef<QRPreviewHandle>(null);
  const createSectionRef = useRef<HTMLDivElement>(null);

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
  const isWebsiteValid = useMemo(
    () => isValidWebsiteUrl(websiteUrl),
    [websiteUrl]
  );
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
      ? vcardUrl
      : '';
  const canGenerate = qrType === 'website'
    ? isWebsiteValid
    : qrType === 'vcard'
      ? Boolean(vcardSlug)
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
    if (activeTab !== 'analytics' || analyticsSeen) return;
    setShowAnalyticsIntro(true);
    setAnalyticsSeen(true);
    const timer = window.setTimeout(() => setShowAnalyticsIntro(false), 1100);
    return () => window.clearTimeout(timer);
  }, [activeTab, analyticsSeen]);

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error(qrType === 'website'
        ? 'Please enter a valid website URL'
        : 'Please add a name or profile slug');
      return;
    }
    if (qrMode === 'dynamic') {
      toast.info('Dynamic QR codes are coming soon. Generating static QR for now.');
    }
    if (!generatedContent.trim()) {
      toast.error('Please enter content to generate');
      return;
    }
    setIsGenerating(true);
    const response = await generateQR(generatedContent, options);
    setIsGenerating(false);
    if (response.success) {
      toast.success('QR code generated!');
      setLastGeneratedContent(generatedContent);
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
    setActiveTab('studio');
    createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const CreateMenu = ({
    align = 'center',
    label = 'Create New',
  }: {
    align?: 'center' | 'right';
    label?: string;
  }) => (
    <div
      className={`relative z-[60] group flex items-center gap-3 ${
        align === 'right' ? 'ml-auto' : ''
      } after:absolute after:left-1/2 after:top-1/2 after:h-36 after:w-36 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']`}
      onMouseEnter={() => setIsCreateHover(true)}
      onMouseLeave={() => setIsCreateHover(false)}
      onFocus={() => setIsCreateHover(true)}
      onBlur={() => setIsCreateHover(false)}
    >
      <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/80 transition group-hover:opacity-0">
        {label}
      </span>

      <button
        type="button"
        aria-label="Create new QR code"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/80 text-primary shadow-sm transition hover:border-primary/50 hover:bg-card/90 hover:shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </button>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => {
            handleStartStatic();
            setIsCreateHover(false);
          }}
          className="absolute left-1/2 top-0 -translate-x-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/90 text-[10px] uppercase tracking-[0.35em] text-foreground shadow-lg backdrop-blur transition hover:border-primary/60 hover:text-primary"
        >
          Static
        </button>
        <button
          type="button"
          aria-disabled="true"
          onClick={() => setIsCreateHover(false)}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/80 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-60 shadow-lg backdrop-blur cursor-not-allowed"
        >
          Dynamic
        </button>
        <button
          type="button"
          onClick={() => {
            setQrMode('static');
            setQrType('vcard');
            setActiveTab('studio');
            createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            setIsCreateHover(false);
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/90 text-[10px] uppercase tracking-[0.35em] text-foreground shadow-lg backdrop-blur transition hover:border-primary/60 hover:text-primary"
        >
          Vcard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {isCreateHover && !showUpsell && !isBooting && (
        <div className="fixed inset-0 z-[40] bg-background/40 backdrop-blur-md transition" />
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
                <span className="text-muted-foreground/70">Analytics</span>
                <span className="absolute inset-0 logo-fill">Analytics</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Loading insights</p>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4">
          <div className="glass-panel rounded-3xl p-8 w-full max-w-lg space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">My Account</p>
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <p className="text-sm text-muted-foreground">
                Save your QR codes, track analytics, and sync across devices.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                value={accountForm.username}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Username (max 24)"
                maxLength={24}
                className="bg-secondary/40 border-border"
              />
              <Input
                value={accountForm.firstName}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="First Name"
                className="bg-secondary/40 border-border"
              />
              <Input
                value={accountForm.lastName}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Last Name"
                className="bg-secondary/40 border-border"
              />
              <Input
                value={accountForm.email}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
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
            <a
              href="/terms"
              className="text-[11px] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-primary"
            >
              View Terms & Conditions
            </a>
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
              { id: 'codes', label: 'My Codes' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'settings', label: 'Settings' },
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
                  { label: 'Total Codes', value: '24' },
                  { label: 'Scans Today', value: '128' },
                  { label: 'Dynamic Live', value: '03' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-secondary/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-semibold mt-2">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Quick Actions</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {['Website QR', 'Virtual Card', 'Campaign Landing'].map((label) => (
                    <span
                      key={label}
                      className="px-3 py-1.5 text-xs uppercase tracking-[0.2em] rounded-full border border-primary/40 text-primary"
                    >
                      {label}
                    </span>
                  ))}
                </div>
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
          <section id="my-codes" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">My Codes</p>
              <h2 className="text-3xl font-semibold tracking-tight">Your QR Library</h2>
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
          <section id="analytics" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Analytics</p>
              <h2 className="text-3xl font-semibold tracking-tight">Live Performance</h2>
            </div>

            {!hasGenerated ? (
              <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
                <p className="text-sm text-muted-foreground">No analytics yet.</p>
                <p className="text-lg font-semibold">Create your first QR Code to view analytics.</p>
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
                      { label: 'Scan Count', value: '1,284' },
                      { label: 'Unique Users', value: '894' },
                      { label: 'Avg. Daily', value: '86' },
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
                      {[24, 38, 56, 44, 68, 84, 72, 96].map((value, index) => (
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
                          <span className="text-primary">52%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Android</span>
                          <span className="text-primary">37%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Desktop</span>
                          <span className="text-primary">11%</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Scans by location</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>San Juan, PR</span>
                          <span className="text-primary">#1</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Brooklyn, NYC</span>
                          <span className="text-primary">#2</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Miami, FL</span>
                          <span className="text-primary">#3</span>
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
          <section id="settings" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Settings</p>
              <h2 className="text-3xl font-semibold tracking-tight">Preferences</h2>
            </div>
            <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground">
              Theme, account, and export preferences will live here soon.
            </div>
          </section>
        )}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          © 2026 Girón x Luminar Apps.
        </footer>
      </main>
    </div>
  );
};

export default Index;
