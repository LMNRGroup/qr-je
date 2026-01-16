import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Copy,
  Link as LinkIcon,
  ChevronDown,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const qrRef = useRef<QRPreviewHandle>(null);

  const updateOption = useCallback(<K extends keyof QROptions>(key: K, value: QROptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = async () => {
    if (!options.content.trim()) {
      toast.error('Please enter content to generate');
      return;
    }
    setIsGenerating(true);
    const response = await generateQR(options.content, options);
    setIsGenerating(false);
    if (response.success) {
      toast.success('QR code generated!');
    } else {
      toast.error('Failed to generate QR code');
    }
  };

  const handleDownload = async (format: 'png' | 'svg' | 'jpeg') => {
    if (!qrRef.current) return;
    try {
      if (format === 'png') await qrRef.current.downloadPng();
      else if (format === 'svg') await qrRef.current.downloadSvg();
      else await qrRef.current.downloadJpeg();
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
    toast.info('Loaded from history');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">QR Studio</h1>
              <p className="text-xs text-muted-foreground">Generate • Customize • Share</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Left Panel - Preview & Actions */}
          <div className="space-y-6">
            {/* Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <LinkIcon className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Enter Content</h2>
              </div>
              <div className="relative">
                <Input
                  value={options.content}
                  onChange={(e) => updateOption('content', e.target.value)}
                  placeholder="Enter URL or text to encode..."
                  className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                />
                {options.content && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* QR Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <QRPreview ref={qrRef} options={options} />
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow"
                    disabled={!options.content.trim()}
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
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-border hover:border-primary hover:bg-primary/10"
                onClick={handleCopy}
                disabled={!options.content.trim()}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
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
                      presets={['#0a0f1a', '#ffffff', '#1a1a2e', '#16213e', '#0f3460', '#1e1e1e', '#2d2d2d', '#f8f9fa']}
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

            {/* History Panel */}
            <HistoryPanel onSelect={handleHistorySelect} />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Index;
