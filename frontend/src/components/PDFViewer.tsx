import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { motion } from 'framer-motion';

// Set up PDF.js worker - use the worker from public folder
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
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
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; isPanning: boolean } | null>(null);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      if (!url) {
        setIsLoading(false);
        setError('No PDF URL provided');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Handle data URLs and regular URLs
        let pdfUrl = url;
        let loadingOptions: { url: string } | { data: Uint8Array } = { url: pdfUrl };
        
        // If it's a data URL, convert to Uint8Array for better compatibility
        if (url.startsWith('data:application/pdf')) {
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            loadingOptions = { data: new Uint8Array(arrayBuffer) };
          } catch (fetchError) {
            // Fallback to direct URL if fetch fails
            loadingOptions = { url: pdfUrl };
          }
        }
        
        const loadingTask = pdfjsLib.getDocument(loadingOptions);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        onTotalPagesChange(pdf.numPages);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(errorMessage);
        console.error('PDF loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
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

  // Reset pan position when zoom changes or page changes
  useEffect(() => {
    setPanPosition({ x: 0, y: 0 });
  }, [isZoomed, currentPage, isFlipped]);

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
    // Reset pan position when zooming
    setPanPosition({ x: 0, y: 0 });
  }, [isZoomed, onZoomChange]);

  // Handle pan/drag when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return;
    e.preventDefault();
    panRef.current = {
      startX: e.clientX - panPosition.x,
      startY: e.clientY - panPosition.y,
      isPanning: true,
    };
  }, [isZoomed, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panRef.current?.isPanning || !isZoomed) return;
    e.preventDefault();
    const newX = e.clientX - panRef.current.startX;
    const newY = e.clientY - panRef.current.startY;
    
    // Limit pan to canvas bounds (when zoomed 2x, canvas is 2x larger)
    if (canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const canvasWidth = parseFloat(canvas.style.width) || canvas.width;
      const canvasHeight = parseFloat(canvas.style.height) || canvas.height;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // When zoomed 2x, we can pan up to half the difference
      const maxX = Math.max(0, (canvasWidth * 2 - containerWidth) / 2);
      const maxY = Math.max(0, (canvasHeight * 2 - containerHeight) / 2);
      
      setPanPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    } else {
      // Fallback: allow panning with reasonable limits
      setPanPosition({
        x: Math.max(-200, Math.min(200, newX)),
        y: Math.max(-200, Math.min(200, newY)),
      });
    }
  }, [isZoomed]);

  const handleMouseUp = useCallback(() => {
    if (panRef.current) {
      panRef.current.isPanning = false;
    }
  }, []);

  // Touch handlers for panning
  const handlePanStart = useCallback((e: React.TouchEvent) => {
    if (!isZoomed || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    panRef.current = {
      startX: touch.clientX - panPosition.x,
      startY: touch.clientY - panPosition.y,
      isPanning: true,
    };
  }, [isZoomed, panPosition]);

  const handlePanMove = useCallback((e: React.TouchEvent) => {
    if (!panRef.current?.isPanning || !isZoomed || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const newX = touch.clientX - panRef.current.startX;
    const newY = touch.clientY - panRef.current.startY;
    
    // Limit pan to canvas bounds (when zoomed 2x, canvas is 2x larger)
    if (canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const canvasWidth = parseFloat(canvas.style.width) || canvas.width;
      const canvasHeight = parseFloat(canvas.style.height) || canvas.height;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // When zoomed 2x, we can pan up to half the difference
      const maxX = Math.max(0, (canvasWidth * 2 - containerWidth) / 2);
      const maxY = Math.max(0, (canvasHeight * 2 - containerHeight) / 2);
      
      setPanPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    } else {
      // Fallback: allow panning with reasonable limits
      setPanPosition({
        x: Math.max(-200, Math.min(200, newX)),
        y: Math.max(-200, Math.min(200, newY)),
      });
    }
  }, [isZoomed]);

  const handlePanEnd = useCallback(() => {
    if (panRef.current) {
      panRef.current.isPanning = false;
    }
  }, []);

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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        if (isZoomed && e.touches.length === 1) {
          handlePanStart(e);
        } else {
          handleTouchStart(e);
        }
      }}
      onTouchMove={(e) => {
        if (isZoomed && e.touches.length === 1 && panRef.current?.isPanning) {
          handlePanMove(e);
        } else {
          handleTouchMove(e);
        }
      }}
      onTouchEnd={(e) => {
        if (isZoomed) {
          handlePanEnd();
        }
        handleTouchEnd();
      }}
      style={{ 
        touchAction: isZoomed ? 'pan-x pan-y' : 'pan-x pan-y pinch-zoom',
        cursor: isZoomed ? 'grab' : 'default',
      }}
    >
      <motion.div
        animate={{
          scale: isZoomed ? 2 : 1,
          x: isZoomed ? panPosition.x : 0,
          y: isZoomed ? panPosition.y : 0,
        }}
        transition={{
          duration: isZoomed && panRef.current?.isPanning ? 0 : 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isZoomed && panRef.current?.isPanning ? 'grabbing' : (isZoomed ? 'grab' : 'default'),
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            pointerEvents: 'none',
          }}
        />
      </motion.div>
    </div>
  );
};
