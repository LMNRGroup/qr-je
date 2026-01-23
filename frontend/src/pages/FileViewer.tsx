import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicUrlDetails } from '@/lib/api';
import { Loader2, File, ZoomOut } from 'lucide-react';

type FileOptions = {
  fileDataUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
};

const FileViewer = () => {
  const { id, random } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const swipeRef = useRef({ dragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const pdfRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !random) {
      setError('Missing file information.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getPublicUrlDetails(id, random)
      .then((data) => {
        const options = (data.options ?? {}) as FileOptions;
        const dataUrl = options.fileDataUrl ?? '';
        const url = options.fileUrl ?? '';
        const type = options.fileType ?? '';
        if (!dataUrl && !url) {
          setError('File data not available yet.');
          return;
        }
        setFileDataUrl(dataUrl);
        setFileUrl(url);
        setFileName(options.fileName ?? 'File');
        setFileType(type);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load file.';
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [id, random]);

  const isPdf = useMemo(() => {
    if (fileDataUrl) return fileDataUrl.startsWith('data:application/pdf');
    if (fileUrl) return fileUrl.endsWith('.pdf') || fileUrl.includes('application/pdf');
    return fileType === 'application/pdf';
  }, [fileDataUrl, fileUrl, fileType]);

  // Detect PDF total pages
  useEffect(() => {
    if (isPdf && pdfRef.current) {
      setPdfTotalPages(10); // Default, will be updated if we can detect it
    }
  }, [isPdf]);

  const handleSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (isZoomed || !isPdf) return; // Only allow swiping for PDFs when not zoomed
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    };
  };

  const handleSwipeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeRef.current.dragging || isZoomed) return;
    swipeRef.current.currentX = event.clientX;
    swipeRef.current.currentY = event.clientY;
  };

  const handleSwipeEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeRef.current.dragging || isZoomed || !isPdf) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;
    const deltaY = swipeRef.current.currentY - swipeRef.current.startY;
    swipeRef.current.dragging = false;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < 50) return;

    if (deltaX < 0) {
      // Swipe left - next page
      setCurrentPage((prev) => Math.min(pdfTotalPages - 1, prev + 1));
    } else {
      // Swipe right - previous page
      setCurrentPage((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDoubleClick = () => {
    setIsZoomed((prev) => !prev);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-muted-foreground gap-4 z-50">
        <File className="h-12 w-12 text-primary" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden z-40">
      {/* Main content area - full screen */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
        onPointerDown={handleSwipeStart}
        onPointerMove={handleSwipeMove}
        onPointerUp={handleSwipeEnd}
        onPointerLeave={handleSwipeEnd}
        onDoubleClick={handleDoubleClick}
      >
        <AnimatePresence mode="wait">
          {isPdf ? (
            <motion.div
              key={`pdf-${currentPage}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center p-4"
              style={{ maxWidth: '100vw', maxHeight: '100vh' }}
            >
              <iframe
                ref={pdfRef}
                src={`${fileUrl || fileDataUrl}#page=${currentPage + 1}&zoom=page-fit`}
                className="border-0"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  maxWidth: '100%', 
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                title={fileName}
              />
            </motion.div>
          ) : (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center"
            >
              <img
                src={fileUrl || fileDataUrl}
                alt={fileName}
                className={`max-w-full max-h-full object-contain ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'} transition-transform duration-300`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Watermark - bottom center */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
        <p className="text-[9px] uppercase tracking-[0.3em] text-white/60 mb-1 absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          This page was created with:
        </p>
        <img
          src="/assets/QRC App Icon.png"
          alt="QR Code Studio"
          className="h-6 w-6 rounded-full"
        />
        <div className="flex flex-col">
          <span className="text-xs font-semibold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
            QR Code Studio
          </span>
          <span className="text-[9px] text-white/50">by Luminar Apps</span>
        </div>
      </div>

      {/* Zoom indicator */}
      {isZoomed && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
          <div className="flex items-center gap-2 text-white text-xs">
            <ZoomOut className="h-4 w-4" />
            <span className="uppercase tracking-[0.2em]">Double tap to zoom out</span>
          </div>
        </div>
      )}

      {/* Page indicator for PDF */}
      {isPdf && pdfTotalPages > 1 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
          <span className="text-xs text-white/80 uppercase tracking-[0.2em]">
            Page {currentPage + 1}
          </span>
        </div>
      )}

      {/* Swipe hint for PDF */}
      {isPdf && pdfTotalPages > 1 && !isZoomed && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 animate-pulse">
          <span className="text-[10px] text-white/60 uppercase tracking-[0.3em]">
            Swipe for next
          </span>
        </div>
      )}
    </div>
  );
};

export default FileViewer;
