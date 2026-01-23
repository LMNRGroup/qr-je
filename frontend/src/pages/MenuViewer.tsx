import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicUrlDetails } from '@/lib/api';
import {
  Facebook,
  Globe,
  Instagram,
  Loader2,
  Music2,
  Utensils,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type MenuFile = { url: string; type: 'image' | 'pdf' };
type MenuOptions = {
  menuFiles?: MenuFile[];
  menuType?: 'restaurant' | 'service';
  menuLogoDataUrl?: string;
  menuSocials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
};

const MenuViewer = () => {
  const { id, random } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuFiles, setMenuFiles] = useState<MenuFile[]>([]);
  const [menuType, setMenuType] = useState<'restaurant' | 'service'>('restaurant');
  const [menuLogo, setMenuLogo] = useState('');
  const [menuSocials, setMenuSocials] = useState<MenuOptions['menuSocials']>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const swipeRef = useRef({ dragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const pdfRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !random) {
      setError('Missing menu information.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getPublicUrlDetails(id, random)
      .then((data) => {
        const options = (data.options ?? {}) as MenuOptions;
        const files = options.menuFiles ?? [];
        if (files.length === 0) {
          setError('Menu data not available yet.');
          return;
        }
        setMenuFiles(files);
        setMenuType(options.menuType ?? 'restaurant');
        setMenuLogo(options.menuLogoDataUrl ?? '');
        setMenuSocials(options.menuSocials ?? {});
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load menu.';
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [id, random]);

  // Detect PDF total pages
  useEffect(() => {
    if (menuFiles.length === 1 && menuFiles[0]?.type === 'pdf' && pdfRef.current) {
      // Try to get PDF page count (this is approximate, browsers handle PDFs differently)
      // For now, we'll use a reasonable default and let users swipe
      setPdfTotalPages(10); // Default, will be updated if we can detect it
    }
  }, [menuFiles]);

  const isPdf = useMemo(
    () => menuFiles.length === 1 && menuFiles[0]?.type === 'pdf',
    [menuFiles]
  );
  const isTwoPageFlip = useMemo(
    () => menuFiles.length === 2,
    [menuFiles]
  );
  const isMultiPage = useMemo(
    () => menuFiles.length > 2 || (isPdf && pdfTotalPages > 1),
    [menuFiles, isPdf, pdfTotalPages]
  );

  const handleSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (isZoomed) return; // Don't swipe when zoomed
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
    if (!swipeRef.current.dragging || isZoomed) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;
    const deltaY = swipeRef.current.currentY - swipeRef.current.startY;
    swipeRef.current.dragging = false;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < 50) return;

    if (isTwoPageFlip) {
      // For 2-page flip, toggle flip state
      setIsFlipped((prev) => !prev);
    } else if (isMultiPage) {
      // For multi-page, navigate pages
      if (deltaX < 0) {
        // Swipe left - next page
        if (isPdf) {
          setCurrentPage((prev) => Math.min(pdfTotalPages - 1, prev + 1));
        } else {
          setCurrentPage((prev) => Math.min(menuFiles.length - 1, prev + 1));
        }
      } else {
        // Swipe right - previous page
        setCurrentPage((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleDoubleClick = () => {
    setIsZoomed((prev) => !prev);
  };

  const hasSocials = useMemo(
    () => menuSocials && (menuSocials.instagram || menuSocials.facebook || menuSocials.tiktok || menuSocials.website),
    [menuSocials]
  );

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
        <Utensils className="h-12 w-12 text-primary" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden z-40">
      {/* Logo at top - centered */}
      {menuLogo && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
          <div className="h-16 w-16 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-lg overflow-hidden">
            <img
              src={menuLogo}
              alt="Menu logo"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

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
              className={`w-full h-full ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            >
              <iframe
                ref={pdfRef}
                src={`${menuFiles[0]?.url}#page=${currentPage + 1}&zoom=page-fit`}
                className="w-full h-full border-0"
                title="Menu PDF"
              />
            </motion.div>
          ) : isTwoPageFlip ? (
            <motion.div
              key="flip-container"
              className="relative w-full h-full max-w-4xl max-h-[90vh]"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                className="relative w-full h-full"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front side */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  onClick={() => setIsFlipped((prev) => !prev)}
                >
                  {menuFiles[0]?.type === 'pdf' ? (
                    <iframe
                      src={`${menuFiles[0]?.url}#zoom=page-fit`}
                      className="w-full h-full border-0"
                      title="Menu front"
                    />
                  ) : (
                    <img
                      src={menuFiles[0]?.url}
                      alt="Menu front"
                      className={`w-full h-full object-contain ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'} transition-transform duration-300`}
                      onDoubleClick={handleDoubleClick}
                    />
                  )}
                </div>
                {/* Back side */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                  onClick={() => setIsFlipped((prev) => !prev)}
                >
                  {menuFiles[1]?.type === 'pdf' ? (
                    <iframe
                      src={`${menuFiles[1]?.url}#zoom=page-fit`}
                      className="w-full h-full border-0"
                      title="Menu back"
                    />
                  ) : (
                    <img
                      src={menuFiles[1]?.url}
                      alt="Menu back"
                      className={`w-full h-full object-contain ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'} transition-transform duration-300`}
                      onDoubleClick={handleDoubleClick}
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={`image-${currentPage}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center"
            >
              <img
                src={menuFiles[currentPage]?.url}
                alt={`Menu page ${currentPage + 1}`}
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

      {/* Social Media Icons - bottom, only if user provided links */}
      {hasSocials && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
          {menuSocials?.instagram && (
            <a
              href={menuSocials.instagram}
              target="_blank"
              rel="noreferrer"
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5 text-white" />
            </a>
          )}
          {menuSocials?.facebook && (
            <a
              href={menuSocials.facebook}
              target="_blank"
              rel="noreferrer"
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5 text-white" />
            </a>
          )}
          {menuSocials?.tiktok && (
            <a
              href={menuSocials.tiktok}
              target="_blank"
              rel="noreferrer"
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="TikTok"
            >
              <Music2 className="h-5 w-5 text-white" />
            </a>
          )}
          {menuSocials?.website && (
            <a
              href={menuSocials.website}
              target="_blank"
              rel="noreferrer"
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Website"
            >
              <Globe className="h-5 w-5 text-white" />
            </a>
          )}
        </div>
      )}

      {/* Zoom indicator */}
      {isZoomed && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
          <div className="flex items-center gap-2 text-white text-xs">
            <ZoomOut className="h-4 w-4" />
            <span className="uppercase tracking-[0.2em]">Double tap to zoom out</span>
          </div>
        </div>
      )}

      {/* Page indicator for multi-page */}
      {isMultiPage && !isTwoPageFlip && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
          <span className="text-xs text-white/80 uppercase tracking-[0.2em]">
            {isPdf ? `Page ${currentPage + 1}` : `${currentPage + 1} / ${menuFiles.length}`}
          </span>
        </div>
      )}

      {/* Swipe hint */}
      {isMultiPage && !isZoomed && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 animate-pulse">
          <span className="text-[10px] text-white/60 uppercase tracking-[0.3em]">
            {isTwoPageFlip ? 'Tap to flip' : 'Swipe for next'}
          </span>
        </div>
      )}
    </div>
  );
};

export default MenuViewer;
