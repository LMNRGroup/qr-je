import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Loader2 } from 'lucide-react';
import { QROptions } from '@/types/qr';

interface QRPreviewProps {
  options: QROptions;
  isGenerating?: boolean;
  contentOverride?: string;
  showCaption?: boolean;
}

export interface QRPreviewHandle {
  downloadPng: () => Promise<void>;
  downloadSvg: () => Promise<void>;
  downloadJpeg: () => Promise<void>;
  downloadPdf: () => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
}

export const QRPreview = forwardRef<QRPreviewHandle, QRPreviewProps>(
  ({ options, isGenerating = false, contentOverride, showCaption = true }, ref) => {
    const qrRef = useRef<HTMLDivElement>(null);

    const getCornerRadius = () => {
      switch (options.cornerStyle) {
        case 'rounded':
          return 8;
        case 'dots':
          return 50;
        default:
          return 0;
      }
    };

    const downloadPng = useCallback(async () => {
      if (!qrRef.current) return;
      const dataUrl = await toPng(qrRef.current, { quality: 1, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }, []);

    const downloadSvg = useCallback(async () => {
      if (!qrRef.current) return;
      const dataUrl = await toSvg(qrRef.current);
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    }, []);

    const downloadJpeg = useCallback(async () => {
      if (!qrRef.current) return;
      const dataUrl = await toJpeg(qrRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.jpeg`;
      link.href = dataUrl;
      link.click();
    }, []);

    const downloadPdf = useCallback(async () => {
      if (!qrRef.current) return;
      const dataUrl = await toPng(qrRef.current, { quality: 1, pixelRatio: 3 });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [options.size + 96, options.size + 96],
      });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const y = (pdf.internal.pageSize.getHeight() - pdfHeight) / 2;
      pdf.addImage(dataUrl, 'PNG', 0, y, pdfWidth, pdfHeight);
      pdf.save(`qrcode-${Date.now()}.pdf`);
    }, [options.size]);

    const copyToClipboard = useCallback(async () => {
      if (!qrRef.current) return false;
      try {
        const dataUrl = await toPng(qrRef.current, { quality: 1, pixelRatio: 2 });
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        return true;
      } catch {
        return false;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      downloadPng,
      downloadSvg,
      downloadJpeg,
      downloadPdf,
      copyToClipboard,
    }));

    const contentValue = (contentOverride ?? options.content).trim();
    const hasContent = contentValue.length > 0;

    return (
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="qr-container"
        >
          <div
            ref={qrRef}
            className="relative flex items-center justify-center rounded-xl overflow-hidden"
            style={{
              width: options.size,
              height: options.size,
              backgroundColor: options.bgColor,
            }}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs uppercase tracking-[0.2em]">Generating</span>
              </div>
            ) : hasContent ? (
              <QRCodeSVG
                value={contentValue}
                size={options.size - 32}
                fgColor={options.fgColor}
                bgColor={options.bgColor}
                level={options.errorCorrectionLevel}
                style={{
                  borderRadius: getCornerRadius(),
                }}
                imageSettings={
                  options.logo
                    ? {
                        src: options.logo,
                        height: options.logoSize || 50,
                        width: options.logoSize || 50,
                        excavate: true,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                  <span className="text-2xl opacity-50">QR</span>
                </div>
                <span className="text-sm">Enter content to generate</span>
              </div>
            )}
          </div>
        </motion.div>

        {hasContent && showCaption && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground max-w-[200px] text-center truncate"
          >
            {contentValue}
          </motion.p>
        )}
      </div>
    );
  }
);

QRPreview.displayName = 'QRPreview';
