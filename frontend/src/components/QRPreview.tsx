import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { QROptions } from '@/types/qr';

interface QRPreviewProps {
  options: QROptions;
}

export interface QRPreviewHandle {
  downloadPng: () => Promise<void>;
  downloadSvg: () => Promise<void>;
  downloadJpeg: () => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
}

export const QRPreview = forwardRef<QRPreviewHandle, QRPreviewProps>(
  ({ options }, ref) => {
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
      copyToClipboard,
    }));

    const hasContent = options.content.trim().length > 0;

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
            {hasContent ? (
              <>
                <QRCodeSVG
                  value={options.content}
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
              </>
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

        {hasContent && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground max-w-[200px] text-center truncate"
          >
            {options.content}
          </motion.p>
        )}
      </div>
    );
  }
);

QRPreview.displayName = 'QRPreview';
