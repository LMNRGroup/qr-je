import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicUrlDetails } from '@/lib/api';
import { Loader2, File, ZoomOut } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';

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
  const [isFlipped, setIsFlipped] = useState(false);
  const swipeRef = useRef({ dragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
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

  const isTwoPagePdf = useMemo(() => {
    return isPdf && pdfTotalPages === 2;
  }, [isPdf, pdfTotalPages]);

  const isMultiPagePdf = useMemo(() => {
    return isPdf && pdfTotalPages > 2;
  }, [isPdf, pdfTotalPages]);

  const handleSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (isZoomed || !isPdf) return;
    // Don't capture swipe if it's a 2-page PDF (handled by tap)
    if (isTwoPagePdf) return;
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

    // For multi-page PDFs, navigate pages
    if (isMultiPagePdf) {
      if (deltaX < 0) {
        // Swipe left - next page
        setCurrentPage((prev) => Math.min(pdfTotalPages - 1, prev + 1));
      } else {
        // Swipe right - previous page
        setCurrentPage((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
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

  const pdfUrl = fileUrl || fileDataUrl;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden z-40" style={{ width: '100vw', height: '100vh', maxWidth: '100vw' }}>
      {/* Main content area - full screen */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center p-4"
        onPointerDown={handleSwipeStart}
        onPointerMove={handleSwipeMove}
        onPointerUp={handleSwipeEnd}
        onPointerLeave={handleSwipeEnd}
        style={{ width: '100%', height: '100%', maxWidth: '100vw', overflow: 'hidden' }}
      >
        <AnimatePresence mode="wait">
          {isPdf ? (
            isTwoPagePdf ? (
              <motion.div
                key="pdf-flip-container"
                className="relative w-full h-full max-w-full"
                style={{ perspective: '1000px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="relative w-full h-full"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front side - Page 1 */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <PDFViewer
                      url={pdfUrl}
                      currentPage={0}
                      onPageChange={setCurrentPage}
                      onTotalPagesChange={setPdfTotalPages}
                      isZoomed={isZoomed}
                      onZoomChange={setIsZoomed}
                      enableTwoPageFlip={true}
                      onFlip={handleFlip}
                      isFlipped={false}
                      className="w-full h-full"
                    />
                  </div>
                  {/* Back side - Page 2 */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <PDFViewer
                      url={pdfUrl}
                      currentPage={1}
                      onPageChange={setCurrentPage}
                      onTotalPagesChange={setPdfTotalPages}
                      isZoomed={isZoomed}
                      onZoomChange={setIsZoomed}
                      enableTwoPageFlip={true}
                      onFlip={handleFlip}
                      isFlipped={true}
                      className="w-full h-full"
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key={`pdf-${currentPage}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex items-center justify-center"
                style={{ maxWidth: '100%', overflow: 'hidden' }}
              >
                <PDFViewer
                  url={pdfUrl}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  onTotalPagesChange={setPdfTotalPages}
                  isZoomed={isZoomed}
                  onZoomChange={setIsZoomed}
                  className="w-full h-full"
                />
              </motion.div>
            )
          ) : (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center"
              style={{ maxWidth: '100%', overflow: 'hidden' }}
            >
              <img
                src={fileUrl || fileDataUrl}
                alt={fileName}
                className={`max-w-full max-h-full object-contain ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'} transition-transform duration-300`}
                onDoubleClick={() => setIsZoomed((prev) => !prev)}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Luminar Apps Watermark - bottom center, clickable */}
      <a
        href="https://qrcode.luminarapps.com"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full border border-white/10 hover:bg-black/40 transition-colors"
        style={{ textDecoration: 'none' }}
      >
        <img
          src="/assets/QRC App Icon.png"
          alt="Luminar Apps"
          className="h-5 w-5 rounded-full"
        />
        <span className="text-[10px] text-white/70 font-medium">Luminar Apps</span>
      </a>

      {/* Zoom indicator */}
      {isZoomed && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
          <div className="flex items-center gap-2 text-white text-xs">
            <ZoomOut className="h-4 w-4" />
            <span className="uppercase tracking-[0.2em]">Double tap to zoom out</span>
          </div>
        </div>
      )}

      {/* Page indicator for multi-page PDF */}
      {isPdf && isMultiPagePdf && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
          <span className="text-xs text-white/80 uppercase tracking-[0.2em]">
            Page {currentPage + 1} / {pdfTotalPages}
          </span>
        </div>
      )}
    </div>
  );
};

export default FileViewer;
