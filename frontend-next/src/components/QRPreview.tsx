import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useId } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
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
    const svgRef = useRef<SVGSVGElement>(null);
    const dotMaskId = useId().replace(/:/g, '');
    const qrInnerSize = Math.max(64, options.size - innerPadding * 2);

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

    const createDownloadLink = useCallback((url: string, filename: string) => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, []);

    const downloadBlob = useCallback(
      (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        createDownloadLink(url, filename);
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      [createDownloadLink]
    );

    const getExportSvgMarkup = useCallback(() => {
      const svg = svgRef.current;
      if (!svg) {
        throw new Error('QR SVG is not ready');
      }

      const exportedSvg = svg.cloneNode(true) as SVGSVGElement;
      exportedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      exportedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      exportedSvg.setAttribute('width', String(qrInnerSize));
      exportedSvg.setAttribute('height', String(qrInnerSize));
      exportedSvg.setAttribute('x', String(innerPadding));
      exportedSvg.setAttribute('y', String(innerPadding));
      exportedSvg.style.backgroundColor = options.bgColor;

      const serializedInnerSvg = new XMLSerializer().serializeToString(exportedSvg);

      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${options.size}" height="${options.size}" viewBox="0 0 ${options.size} ${options.size}">`,
        `<rect width="${options.size}" height="${options.size}" fill="${options.bgColor}" rx="12" ry="12" />`,
        serializedInnerSvg,
        '</svg>',
      ].join('');
    }, [innerPadding, options.bgColor, options.size, qrInnerSize]);

    const renderCanvasFromSvg = useCallback(async (mimeType: 'image/png' | 'image/jpeg') => {
      const svgMarkup = getExportSvgMarkup();
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      try {
        const image = new Image();
        image.decoding = 'async';
        const loadImage = new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Failed to render QR image'));
        });
        image.src = url;
        await loadImage;

        const canvas = document.createElement('canvas');
        const pixelRatio = 3;
        canvas.width = options.size * pixelRatio;
        canvas.height = options.size * pixelRatio;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Canvas context unavailable');
        }

        context.scale(pixelRatio, pixelRatio);
        context.fillStyle = options.bgColor;
        context.fillRect(0, 0, options.size, options.size);
        context.drawImage(image, 0, 0, options.size, options.size);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (value) => {
              if (value) resolve(value);
              else reject(new Error('Empty canvas export'));
            },
            mimeType,
            mimeType === 'image/jpeg' ? 0.95 : 1
          );
        });

        return blob;
      } finally {
        URL.revokeObjectURL(url);
      }
    }, [getExportSvgMarkup, options.bgColor, options.size]);

    const downloadPng = useCallback(async () => {
      const blob = await renderCanvasFromSvg('image/png');
      downloadBlob(blob, `qrcode-${Date.now()}.png`);
    }, [downloadBlob, renderCanvasFromSvg]);

    const downloadSvg = useCallback(async () => {
      const svgMarkup = getExportSvgMarkup();
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, `qrcode-${Date.now()}.svg`);
    }, [downloadBlob, getExportSvgMarkup]);

    const downloadJpeg = useCallback(async () => {
      const blob = await renderCanvasFromSvg('image/jpeg');
      downloadBlob(blob, `qrcode-${Date.now()}.jpeg`);
    }, [downloadBlob, renderCanvasFromSvg]);

    const downloadPdf = useCallback(async () => {
      const pngBlob = await renderCanvasFromSvg('image/png');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Failed to read PNG export'));
        };
        reader.onerror = () => reject(new Error('Failed to read PNG export'));
        reader.readAsDataURL(pngBlob);
      });
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
    }, [options.size, renderCanvasFromSvg]);

    const copyToClipboard = useCallback(async () => {
      try {
        const blob = await renderCanvasFromSvg('image/png');
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        return true;
      } catch {
        return false;
      }
    }, [renderCanvasFromSvg]);

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
      const paths = Array.from(svg.querySelectorAll('path')) as SVGPathElement[];
      if (!paths.length) return;

      const existingDefs = svg.querySelector('defs[data-dot-mask="true"]');
      if (options.cornerStyle !== 'dots') {
        paths.forEach((path, index) => {
          if (index > 0) path.removeAttribute('mask');
        });
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

      paths.forEach((path, index) => {
        if (index === 0) return;
        path.setAttribute('mask', `url(#${maskId})`);
      });
    }, [contentValue, dotMaskId, options.cornerStyle, options.size]);

    return (
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="qr-container"
        >
          <div
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
