import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  // Use a CDN for the worker, or you can bundle it locally
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  url: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  isZoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
  enableTwoPageFlip?: boolean;
  onFlip?: () => void;
  isFlipped?: boolean;
  className?: string;
}

export const PDFViewer = ({
  url,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onZoomChange,
  isZoomed,
  enableTwoPageFlip = false,
  onFlip,
  isFlipped = false,
  className = '',
}: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderScale, setRenderScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const pinchRef = useRef<{ distance: number; initialScale: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Handle data URLs by converting to blob if needed
        let pdfUrl = url;
        if (url.startsWith('data:')) {
          // PDF.js can handle data URLs, but we'll use it directly
          pdfUrl = url;
        }
        
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        onTotalPagesChange(pdf.numPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        console.error('PDF loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (url) {
      loadPdf();
    }
  }, [url, onTotalPagesChange]);

  // Calculate fit-to-screen scale
  const calculateFitScale = useCallback(
    (pageWidth: number, pageHeight: number, containerWidth: number, containerHeight: number) => {
      const scaleX = containerWidth / pageWidth;
      const scaleY = containerHeight / pageHeight;
      return Math.min(scaleX, scaleY, 1); // Never scale up beyond 100%
    },
    []
  );

  // Render PDF page
  const renderPage = useCallback(
    async (pageNum: number, zoomed: boolean = false) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Get container dimensions (accounting for padding)
        const containerRect = container.getBoundingClientRect();
        const containerWidth = Math.max(containerRect.width - 32, 100); // 16px padding on each side, min 100px
        const containerHeight = Math.max(containerRect.height - 32, 100);

        // Get page viewport at scale 1
        const viewport = page.getViewport({ scale: 1 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        // Calculate scale to fit screen
        let newScale: number;
        if (zoomed) {
          // When zoomed, use 2x scale but ensure it doesn't exceed container
          const fitScale = calculateFitScale(pageWidth, pageHeight, containerWidth, containerHeight);
          newScale = Math.min(fitScale * 2, 3); // Cap at 3x
        } else {
          // Fit to screen - never scale up beyond 100%
          newScale = calculateFitScale(pageWidth, pageHeight, containerWidth, containerHeight);
        }

        setScale(newScale);
        const renderViewport = page.getViewport({ scale: newScale * renderScale });

        // Set canvas dimensions with device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = renderViewport.width * dpr;
        canvas.height = renderViewport.height * dpr;
        canvas.style.width = `${renderViewport.width}px`;
        canvas.style.height = `${renderViewport.height}px`;
        
        // Scale context for high DPI displays
        context.scale(dpr, dpr);

        // Render page
        const renderContext = {
          canvasContext: context,
          viewport: renderViewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('PDF rendering error:', err);
        setError('Failed to render PDF page');
      }
    },
    [pdfDoc, calculateFitScale, renderScale]
  );

  // Render current page when page changes or zoom changes
  useEffect(() => {
    if (pdfDoc && !isLoading) {
      const pageToRender = enableTwoPageFlip && isFlipped ? 2 : currentPage + 1;
      renderPage(pageToRender, isZoomed);
    }
  }, [pdfDoc, currentPage, isZoomed, isLoading, renderPage, enableTwoPageFlip, isFlipped]);

  // Handle double tap for zoom
  const handleDoubleTap = useCallback(() => {
    onZoomChange(!isZoomed);
  }, [isZoomed, onZoomChange]);

  // Handle single tap for 2-page flip
  const handleTap = useCallback((e: React.MouseEvent) => {
    if (enableTwoPageFlip && pdfDoc && pdfDoc.numPages === 2 && !isZoomed) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300) {
        // Double tap detected - handled by onDoubleClick
        return;
      } else {
        // Single tap - flip page
        e.stopPropagation();
        if (onFlip) {
          onFlip();
        }
      }
      
      lastTapRef.current = now;
    }
    // For multi-page PDFs, single tap does nothing (handled by parent swipe)
  }, [enableTwoPageFlip, pdfDoc, isZoomed, onFlip]);

  // Handle pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      pinchRef.current = {
        distance,
        initialScale: isZoomed ? 2 : 1,
      };
    }
  }, [isZoomed]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scaleChange = distance / pinchRef.current.distance;
      const newScale = Math.max(0.5, Math.min(3, pinchRef.current.initialScale * scaleChange));
      
      if (newScale > 1.5) {
        if (!isZoomed) {
          onZoomChange(true);
        }
      } else if (newScale < 1.5) {
        if (isZoomed) {
          onZoomChange(false);
        }
      }
    }
  }, [isZoomed, onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    pinchRef.current = null;
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-sm text-muted-foreground">Loading PDF...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (!pdfDoc) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      onDoubleClick={handleDoubleTap}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: isZoomed ? 'pan-x pan-y pinch-zoom' : 'pan-x pan-y pinch-zoom' }}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
        }}
      />
    </div>
  );
};
