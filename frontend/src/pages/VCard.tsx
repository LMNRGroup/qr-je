import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { VcardLandingCard } from '@/components/VcardLandingCard';
import { getPublicVcard } from '@/lib/api';
import { VcardProfile, VcardStyle } from '@/types/qr';

const MOBILE_BREAKPOINT = 768;
const MOBILE_FIT_BUFFER = 12;

type ViewportMetrics = {
  width: number;
  height: number;
};

const getViewportMetrics = (): ViewportMetrics => {
  if (typeof window === 'undefined') {
    return { width: MOBILE_BREAKPOINT, height: 0 };
  }

  return {
    width: Math.round(window.visualViewport?.width ?? window.innerWidth),
    height: Math.round(window.visualViewport?.height ?? window.innerHeight),
  };
};

const fallbackStyle: VcardStyle = {
  fontFamily: 'Arial, sans-serif',
  radius: 24,
  texture: 'matte',
  frontColor: '#25113a',
  frontGradient: '#5b2b73',
  frontUseGradient: true,
  frontFontColor: '#F8FAFC',
  backColor: '#0f172a',
  backGradient: '#4f46e5',
  backUseGradient: true,
  backFontColor: '#F8FAFC',
  frontLogoDataUrl: '',
  backLogoDataUrl: '',
  coverPhotoDataUrl: '',
  profilePhotoDataUrl: '',
  profileAlign: 'left',
  buttonColor: '#F3E7D0',
  buttonTextColor: '#34164B',
  coverZoom: 100,
  coverX: 50,
  coverY: 50,
  photoZoom: 110,
  photoX: 50,
  photoY: 50,
};

const VCard = () => {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<VcardProfile | null>(null);
  const [style, setStyle] = useState<VcardStyle | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [mobileScale, setMobileScale] = useState(1);
  const [viewport, setViewport] = useState<ViewportMetrics>(() => getViewportMetrics());
  const isMobileViewport = viewport.width < MOBILE_BREAKPOINT;
  const mobileViewportStyle =
    isMobileViewport && viewport.height > 0
      ? {
          height: `${viewport.height}px`,
          minHeight: `${viewport.height}px`,
        }
      : undefined;

  useEffect(() => {
    if (!slug) {
      setError('Missing vcard slug.');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getPublicVcard(slug);
        const payload = data.data as { profile?: VcardProfile; style?: VcardStyle };
        setProfile(payload.profile ?? null);
        setStyle(payload.style ?? null);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load vcard.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      setViewport(getViewportMetrics());
    };

    updateViewport();

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return;
      if (!isMobileViewport) {
        setMobileScale(1);
        return;
      }

      const frame = frameRef.current;
      const card = cardRef.current;
      if (!frame || !card) return;

      const frameStyles = window.getComputedStyle(frame);
      const paddingTop = parseFloat(frameStyles.paddingTop) || 0;
      const paddingRight = parseFloat(frameStyles.paddingRight) || 0;
      const paddingBottom = parseFloat(frameStyles.paddingBottom) || 0;
      const paddingLeft = parseFloat(frameStyles.paddingLeft) || 0;
      const viewportHeight = window.visualViewport?.height ?? viewport.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? viewport.width ?? window.innerWidth;
      const availableHeight = Math.max(
        0,
        Math.min(frame.clientHeight, viewportHeight) - paddingTop - paddingBottom - MOBILE_FIT_BUFFER
      );
      const availableWidth = Math.max(
        0,
        Math.min(frame.clientWidth, viewportWidth) - paddingLeft - paddingRight
      );
      const naturalHeight = card.offsetHeight;
      const naturalWidth = card.offsetWidth;
      if (!availableHeight || !availableWidth || !naturalHeight || !naturalWidth) {
        setMobileScale(1);
        return;
      }

      setMobileScale(
        Math.min(1, availableHeight / naturalHeight, availableWidth / naturalWidth)
      );
    };

    const runUpdate = () => window.requestAnimationFrame(updateScale);
    runUpdate();

    const observer = new ResizeObserver(runUpdate);
    if (frameRef.current) observer.observe(frameRef.current);
    if (cardRef.current) observer.observe(cardRef.current);

    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, [isMobileViewport, profile, style, viewport.height, viewport.width]);

  return (
    <div
      className="relative min-h-[100svh] overflow-hidden bg-[#f6f1ff] text-foreground md:min-h-[100dvh]"
      style={mobileViewportStyle}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.14),transparent_30%)]" />

      {isLoading ? (
        <div className="flex h-full min-h-[100svh] items-center justify-center px-4 text-sm uppercase tracking-[0.4em] text-muted-foreground md:min-h-[100dvh]">
          Loading VCard...
        </div>
      ) : error ? (
        <div className="flex h-full min-h-[100svh] items-center justify-center px-4 md:min-h-[100dvh]">
          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">VCard</p>
            <h1 className="text-2xl font-semibold">Unable to load</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : (
        <div
          ref={frameRef}
          className="mx-auto flex h-full min-h-[100svh] items-start justify-center overflow-hidden px-3 md:min-h-[70vh] md:items-center md:px-8 md:py-12"
          style={
            isMobileViewport
              ? {
                  paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
                  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                }
              : undefined
          }
        >
          <div
            className="w-full origin-top transition-transform duration-200 ease-out md:origin-center"
            style={{
              transform: mobileScale < 1 ? `scale(${mobileScale})` : undefined,
            }}
          >
            <div ref={cardRef} className="mx-auto w-full max-w-5xl">
              <VcardLandingCard
                profile={profile ?? {}}
                style={{ ...fallbackStyle, ...(style ?? {}) }}
                mode="public"
                interactive
                showFooter
                className="mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VCard;
