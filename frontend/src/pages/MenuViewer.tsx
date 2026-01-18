import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicUrlDetails } from '@/lib/api';
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  Globe,
  Instagram,
  Loader2,
  Music2,
  Utensils,
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
  const [page, setPage] = useState(1);
  const [flip, setFlip] = useState(false);
  const [index, setIndex] = useState(0);
  const swipeRef = useRef({ dragging: false, startX: 0, currentX: 0 });

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

  const isPdf = useMemo(
    () => menuFiles.length === 1 && menuFiles[0]?.type === 'pdf',
    [menuFiles]
  );
  const isFlip = useMemo(
    () => menuFiles.length === 2 && menuFiles.every((file) => file.type === 'image'),
    [menuFiles]
  );
  const isCarousel = useMemo(
    () => menuFiles.length >= 3 && menuFiles.every((file) => file.type === 'image'),
    [menuFiles]
  );

  const handleSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!isCarousel) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeRef.current = {
      dragging: true,
      startX: event.clientX,
      currentX: event.clientX,
    };
  };

  const handleSwipeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeRef.current.dragging) return;
    swipeRef.current.currentX = event.clientX;
  };

  const handleSwipeEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeRef.current.dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;
    swipeRef.current.dragging = false;
    if (Math.abs(deltaX) < 40) return;
    setIndex((prev) => {
      const total = menuFiles.length || 1;
      if (deltaX < 0) return (prev + 1) % total;
      return (prev - 1 + total) % total;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <Utensils className="h-10 w-10 text-primary" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Menu QR</p>
          <h1 className="text-2xl font-semibold">
            {menuType === 'restaurant' ? 'Restaurant Menu' : 'Service Menu'}
          </h1>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-5 space-y-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>Menu Preview</span>
            <span>{menuType === 'restaurant' ? 'Restaurant' : 'Services'}</span>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative h-[460px] w-[280px] rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-xl">
              {menuLogo ? (
                <div className="absolute left-4 top-4 h-12 w-12 rounded-full border border-white/30 bg-white/10 shadow-lg">
                  <div
                    className="h-full w-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${menuLogo})` }}
                  />
                </div>
              ) : null}

              {isPdf ? (
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    <span>PDF Menu</span>
                    <span>Page {page}</span>
                  </div>
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/60 bg-black/5">
                    <embed
                      src={`${menuFiles[0]?.url}#page=${page}`}
                      type="application/pdf"
                      className="h-full w-full"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : isFlip ? (
                <button
                  type="button"
                  className="relative h-full w-full"
                  onClick={() => setFlip((prev) => !prev)}
                  aria-label="Flip menu preview"
                >
                  <div
                    className="absolute inset-0 transition-transform duration-500"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                      <img
                        src={menuFiles[0]?.url}
                        alt="Menu front"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div
                      className="absolute inset-0"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <img
                        src={menuFiles[1]?.url}
                        alt="Menu back"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/80">
                    Tap to flip
                  </div>
                </button>
              ) : isCarousel ? (
                <div
                  className="relative h-full w-full touch-pan-y"
                  onPointerDown={handleSwipeStart}
                  onPointerMove={handleSwipeMove}
                  onPointerUp={handleSwipeEnd}
                  onPointerLeave={handleSwipeEnd}
                >
                  {menuFiles.map((file, fileIndex) => (
                    <img
                      key={`${file.url}-${fileIndex}`}
                      src={file.url}
                      alt={`Menu page ${fileIndex + 1}`}
                      className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                        fileIndex === index ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                      }`}
                    />
                  ))}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/80">
                    Swipe to continue
                  </div>
                </div>
              ) : (
                <img
                  src={menuFiles[0]?.url}
                  alt="Menu preview"
                  className="h-full w-full object-cover"
                />
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-white/80">
                Luminar Apps watermark · Free Forever
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            {menuSocials?.instagram ? (
              <a className="flex items-center gap-1 text-primary" href={menuSocials.instagram} target="_blank" rel="noreferrer">
                <Instagram className="h-4 w-4" />
                Instagram
              </a>
            ) : null}
            {menuSocials?.facebook ? (
              <a className="flex items-center gap-1 text-primary" href={menuSocials.facebook} target="_blank" rel="noreferrer">
                <Facebook className="h-4 w-4" />
                Facebook
              </a>
            ) : null}
            {menuSocials?.tiktok ? (
              <a className="flex items-center gap-1 text-primary" href={menuSocials.tiktok} target="_blank" rel="noreferrer">
                <Music2 className="h-4 w-4" />
                TikTok
              </a>
            ) : null}
            {menuSocials?.website ? (
              <a className="flex items-center gap-1 text-primary" href={menuSocials.website} target="_blank" rel="noreferrer">
                <Globe className="h-4 w-4" />
                Website
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuViewer;
