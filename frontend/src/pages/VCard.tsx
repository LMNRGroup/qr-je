import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { VcardLandingCard } from '@/components/VcardLandingCard';
import { getPublicVcard } from '@/lib/api';
import { VCARD_DEFAULT_FONT_FAMILY, normalizeVcardFontFamily } from '@/lib/vcard-theme';
import { VcardProfile, VcardStyle } from '@/types/qr';

const MOBILE_BREAKPOINT = 768;
const MOBILE_FIT_BUFFER = 12;
const COLLECTR_OWNER_ALIAS_PATH = '/1vbilcikwj/ramn-figueroa-soto';
const COLLECTR_OWNER_ALIAS_SLUG = 'r';

type ViewportMetrics = {
  width: number;
  height: number;
};

const META_TAGS = [
  { selector: 'meta[name="description"]', attr: 'name', key: 'description' },
  { selector: 'meta[property="og:title"]', attr: 'property', key: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'property', key: 'og:description' },
  { selector: 'meta[property="og:url"]', attr: 'property', key: 'og:url' },
  { selector: 'meta[name="twitter:title"]', attr: 'name', key: 'twitter:title' },
  { selector: 'meta[name="twitter:description"]', attr: 'name', key: 'twitter:description' },
  { selector: 'meta[name="twitter:url"]', attr: 'name', key: 'twitter:url' },
] as const;

const getViewportMetrics = (): ViewportMetrics => {
  if (typeof window === 'undefined') {
    return { width: MOBILE_BREAKPOINT, height: 0 };
  }

  return {
    width: Math.round(window.visualViewport?.width ?? window.innerWidth),
    height: Math.round(window.visualViewport?.height ?? window.innerHeight),
  };
};

const normalizeText = (value?: string | null) => value?.trim() ?? '';

const getFirstName = (value?: string | null) => {
  const normalized = normalizeText(value);
  return normalized.split(/\s+/)[0] || normalized;
};

const buildVcardShareMetadata = (profile: VcardProfile | null, shareUrl: string) => {
  const fullName = normalizeText(profile?.name) || 'Someone';
  const firstName = getFirstName(fullName) || 'Someone';
  const company = normalizeText(profile?.company);
  const title = normalizeText(profile?.title);

  const shareTitle =
    fullName === 'Someone'
      ? 'A virtual card has been shared with you'
      : `${firstName} wants to share a virtual card with you`;

  const roleSummary = [title, company].filter(Boolean).join(' at ');
  const shareDescription =
    fullName === 'Someone'
      ? 'Open this virtual card to view contact details and save them in one tap.'
      : `Open ${fullName}'s virtual card${roleSummary ? `, ${roleSummary},` : ''} and save their contact details in one tap.`;

  return {
    title: shareTitle,
    description: shareDescription,
    url: shareUrl,
  };
};

const setMetaTag = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
  if (typeof document === 'undefined') return;
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const fallbackStyle: VcardStyle = {
  fontFamily: VCARD_DEFAULT_FONT_FAMILY,
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
  const location = useLocation();
  const resolvedSlug =
    location.pathname === COLLECTR_OWNER_ALIAS_PATH ? COLLECTR_OWNER_ALIAS_SLUG : slug;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<VcardProfile | null>(null);
  const [style, setStyle] = useState<VcardStyle | null>(null);
  const [publicUrl, setPublicUrl] = useState('');
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
    if (!resolvedSlug) {
      setError('Missing vcard slug.');
      setPublicUrl('');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getPublicVcard(resolvedSlug);
        const payload = data.data as { profile?: VcardProfile; style?: VcardStyle };
        setProfile(payload.profile ?? null);
        setStyle(
          payload.style
            ? {
                ...payload.style,
                fontFamily: normalizeVcardFontFamily(payload.style.fontFamily),
              }
            : null
        );
        setPublicUrl(data.publicUrl ?? '');
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load vcard.';
        setPublicUrl('');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [resolvedSlug]);

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

  useEffect(() => {
    if (typeof document === 'undefined' || !resolvedSlug || !profile) return;

    const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousTitle = document.title;
    const previousCanonicalHref = canonicalLink?.getAttribute('href') ?? null;
    const previousMeta = META_TAGS.map((tag) => ({
      ...tag,
      content: document.querySelector<HTMLMetaElement>(tag.selector)?.getAttribute('content') ?? null,
    }));

    const currentUrl =
      publicUrl ||
      (typeof window !== 'undefined' ? window.location.href : `/v/${resolvedSlug}`);
    const shareMeta = buildVcardShareMetadata(profile, currentUrl);

    document.title = shareMeta.title;
    if (canonicalLink) {
      canonicalLink.setAttribute('href', shareMeta.url);
    }
    for (const tag of META_TAGS) {
      const content =
        tag.key === 'description' || tag.key.endsWith(':description')
          ? shareMeta.description
          : tag.key.endsWith(':url')
            ? shareMeta.url
            : shareMeta.title;
      setMetaTag(tag.selector, tag.attr, tag.key, content);
    }

    return () => {
      document.title = previousTitle;
      if (canonicalLink) {
        if (previousCanonicalHref) {
          canonicalLink.setAttribute('href', previousCanonicalHref);
        } else {
          canonicalLink.removeAttribute('href');
        }
      }
      for (const tag of previousMeta) {
        if (tag.content === null) continue;
        setMetaTag(tag.selector, tag.attr, tag.key, tag.content);
      }
    };
  }, [profile, publicUrl, resolvedSlug]);

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
