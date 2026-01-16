import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Copy,
  Link as LinkIcon,
  ChevronDown,
  Sparkles,
  QrCode,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import { ColorPicker } from '@/components/ColorPicker';
import { SizeSlider } from '@/components/SizeSlider';
import { CornerStylePicker } from '@/components/CornerStylePicker';
import { ErrorCorrectionSelector } from '@/components/ErrorCorrectionSelector';
import { LogoUpload } from '@/components/LogoUpload';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { QROptions, defaultQROptions } from '@/types/qr';
import { generateQR } from '@/lib/api';
import { toast } from 'sonner';

const Index = () => {
  const [options, setOptions] = useState<QROptions>(defaultQROptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastGeneratedContent, setLastGeneratedContent] = useState('');
  const [qrMode, setQrMode] = useState<'static' | 'dynamic'>('static');
  const [qrType, setQrType] = useState<'website' | 'vcard'>('website');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
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
    : vcardUrl;
  const canGenerate = qrType === 'website' ? isWebsiteValid : Boolean(vcardSlug);

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
    setQrType('website');
    setWebsiteUrl(historicOptions.content);
    setLastGeneratedContent(historicOptions.content);
    setHasGenerated(true);
    toast.info('Loaded from history');
  };

  const handleStartStatic = () => {
    setQrMode('static');
    createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const CreateMenu = ({ align = 'center' }: { align?: 'center' | 'right' }) => (
    <div className={`relative group ${align === 'right' ? 'ml-auto' : ''}`}>
      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 transition group-hover:opacity-100">
        <div className="rounded-full border border-border/60 bg-card/80 px-4 py-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground shadow-sm backdrop-blur">
          Create New QR Code
        </div>
      </div>

      <button
        type="button"
        aria-label="Create new QR code"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/80 text-primary shadow-sm transition hover:border-primary/50 hover:bg-card/90 hover:shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={handleStartStatic}
            className="rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5 text-[10px] uppercase tracking-[0.35em] text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            Static
          </button>
          <button
            type="button"
            aria-disabled="true"
            className="rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.35em] text-muted-foreground opacity-60 cursor-not-allowed"
          >
            Dynamic
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-8 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.28),transparent_60%)] blur-3xl float-slow" />
        <div className="absolute top-4 right-6 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22),transparent_60%)] blur-3xl float-medium" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18),transparent_65%)] blur-3xl float-fast" />
        <div className="absolute inset-x-0 top-1/4 h-72 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
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
          <nav className="hidden lg:flex items-end gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {[
              { label: 'Dashboard', href: '#dashboard' },
              { label: 'My QR Codes', href: '#my-qr-codes' },
              { label: 'Settings', href: '#settings' },
            ].map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`px-4 py-2 rounded-t-2xl border border-border/60 bg-secondary/40 hover:bg-secondary/70 hover:text-primary transition-all ${
                  index === 0 ? 'text-foreground bg-card/80 border-b-transparent' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <CreateMenu align="right" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <section id="dashboard" className="space-y-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Dashboard</p>
              <h2 className="text-3xl font-semibold tracking-tight">Command Center</h2>
            </div>
            <CreateMenu />
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

            <div id="my-qr-codes" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">My QR Codes</p>
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                </div>
              </div>
              <HistoryPanel onSelect={handleHistorySelect} />
            </div>
          </div>
        </section>

        <section ref={createSectionRef} id="settings" className="mt-14">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Create</p>
              <h2 className="text-3xl font-semibold tracking-tight">Build Your QR</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Static • Dynamic</span>
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
                      <h2 className="font-semibold">QR Mode</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Select</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className={qrMode === 'static'
                        ? 'bg-card/80 text-foreground border border-border/70 border-b-transparent rounded-t-xl uppercase tracking-[0.2em] text-xs'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-t-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => setQrMode('static')}
                    >
                      Static
                    </Button>
                    <Button
                      size="sm"
                      className={qrMode === 'dynamic'
                        ? 'bg-card/80 text-foreground border border-border/70 border-b-transparent rounded-t-xl uppercase tracking-[0.2em] text-xs'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-t-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => {
                        setQrMode('dynamic');
                        toast.info('Dynamic QR is a placeholder for now.');
                      }}
                    >
                      Dynamic
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">QR Type</h3>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Choose</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQrType('website')}
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

                {qrType === 'website' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Enter URL</h3>
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
                      <h3 className="font-semibold">Virtual Card Details</h3>
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
                )}

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
                      <>Generate QR</>
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
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                <QRPreview ref={qrRef} options={options} isGenerating={isGenerating} />
              </motion.div>
            </div>

            {/* Right Panel - Customization */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              <div className="glass-panel rounded-2xl p-4">
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
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
