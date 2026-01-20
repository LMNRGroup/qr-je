import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useId } from 'react';
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
  innerPadding?: number;
}

export interface QRPreviewHandle {
  downloadPng: () => Promise<void>;
  downloadSvg: () => Promise<void>;
  downloadJpeg: () => Promise<void>;
  downloadPdf: () => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
}

export const QRPreview = forwardRef<QRPreviewHandle, QRPreviewProps>(
  ({ options, isGenerating = false, contentOverride, showCaption = true, innerPadding = 16 }, ref) => {
    const qrRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const dotMaskId = useId().replace(/:/g, '');

    const getCornerRadius = () => {
      switch (options.cornerStyle) {
        case 'rounded':
          return 8;
        case 'dots':
          return 0;
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
    const isTooLong = contentValue.length > 2048 || contentValue.startsWith('data:');
    const hasContent = contentValue.length > 0 && !isTooLong;

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const paths = svg.querySelectorAll('path');
      const fgPath = paths.item(1) as SVGPathElement | null;
      if (!fgPath) return;

      const existingDefs = svg.querySelector('defs[data-dot-mask="true"]');
      if (options.cornerStyle !== 'dots') {
        fgPath.removeAttribute('mask');
        existingDefs?.remove();
        return;
      }

      const defs =
        (existingDefs as SVGDefsElement | null) ??
        document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('data-dot-mask', 'true');
      defs.innerHTML = '';

      const patternId = `dot-pattern-${dotMaskId}`;
      const maskId = `dot-mask-${dotMaskId}`;

      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', patternId);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('width', '1');
      pattern.setAttribute('height', '1');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '0.5');
      circle.setAttribute('cy', '0.5');
      circle.setAttribute('r', '0.38');
      circle.setAttribute('fill', 'white');
      pattern.appendChild(circle);

      const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
      mask.setAttribute('id', maskId);

      const maskBase = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      maskBase.setAttribute('width', '100%');
      maskBase.setAttribute('height', '100%');
      maskBase.setAttribute('fill', 'black');

      const maskPattern = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      maskPattern.setAttribute('width', '100%');
      maskPattern.setAttribute('height', '100%');
      maskPattern.setAttribute('fill', `url(#${patternId})`);

      mask.appendChild(maskBase);
      mask.appendChild(maskPattern);
      defs.appendChild(pattern);
      defs.appendChild(mask);

      if (!existingDefs) {
        svg.insertBefore(defs, svg.firstChild);
      }

      fgPath.setAttribute('mask', `url(#${maskId})`);
    }, [contentValue, dotMaskId, options.cornerStyle, options.size]);

    const qrInnerSize = Math.max(64, options.size - innerPadding * 2);

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
                ref={svgRef}
                value={contentValue}
                size={qrInnerSize}
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
                        height: (() => {
                          const maxLogo = Math.round((options.size - 32) * 0.22);
                          const maxSize = Math.min(options.logoSize || maxLogo, maxLogo);
                          if (!options.logoAspect || options.logoAspect >= 1) {
                            return Math.round(maxSize / (options.logoAspect || 1));
                          }
                          return maxSize;
                        })(),
                        width: (() => {
                          const maxLogo = Math.round((options.size - 32) * 0.22);
                          const maxSize = Math.min(options.logoSize || maxLogo, maxLogo);
                          if (!options.logoAspect || options.logoAspect >= 1) {
                            return maxSize;
                          }
                          return Math.round(maxSize * options.logoAspect);
                        })(),
                        excavate: true,
                      }
                    : undefined
                }
              />
            ) : isTooLong ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 px-4 text-center">
                <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                  <span className="text-2xl opacity-50">QR</span>
                </div>
                <span className="text-xs uppercase tracking-[0.2em]">Preview too large</span>
                <span className="text-[11px] text-muted-foreground/70">
                  This file is stored safely. Download to view.
                </span>
              </div>
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
