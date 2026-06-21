import { useEffect, useRef } from 'react';
import type { CSSProperties, ComponentType, ReactNode } from 'react';
import {
  ArrowUpRight,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';

import { formatCollectrCurrency, resolveCollectrPreviewInput, useCollectrPreview } from '@/lib/collectr';
import { normalizeVcardFontFamily } from '@/lib/vcard-theme';
import { cn } from '@/lib/utils';
import type {
  VcardCtaType,
  VcardProfile,
  VcardProfileAlign,
  VcardSocialPlatform,
  VcardStyle,
  VcardTexture,
} from '@/types/qr';

type VcardLandingCardProps = {
  profile: VcardProfile;
  style: VcardStyle;
  mode?: 'preview' | 'public';
  interactive?: boolean;
  showFooter?: boolean;
  className?: string;
};

type IconProps = {
  className?: string;
};

type LinkConfig = {
  href: string;
  external: boolean;
};

type ContactRow = {
  key: string;
  label: string;
  value: string;
  Icon: ComponentType<IconProps>;
  link?: LinkConfig | null;
};

type CollectrStat = {
  key: string;
  label: string;
  value: string;
};

const CTA_LABELS: Record<VcardCtaType, string> = {
  call: 'Call Me',
  email: 'Email Me',
  whatsapp: 'WhatsApp Me',
  website: 'Visit My Website',
};

const CTA_ICONS: Record<VcardCtaType, typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  website: Globe,
};

const CTA_KICKERS: Record<VcardCtaType, string> = {
  call: 'Direct line',
  email: 'Quick email',
  whatsapp: 'Instant chat',
  website: 'Explore more',
};

const CTA_HELPERS: Record<VcardCtaType, string> = {
  call: 'Tap to start a call right away.',
  email: 'Open a message with one tap.',
  whatsapp: 'Jump into WhatsApp instantly.',
  website: 'Open the full website experience.',
};

const InstagramLogo = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="5.25" />
    <circle cx="12" cy="12" r="4.1" />
    <circle cx="17.35" cy="6.65" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookLogo = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M13.25 21v-6.7h2.27l.34-2.77h-2.61V9.76c0-.8.22-1.35 1.38-1.35H16V5.96c-.24-.03-1.07-.1-2.04-.1-2.02 0-3.4 1.24-3.4 3.5v2.17H8.28v2.77h2.28V21h2.69Z" />
  </svg>
);

const YoutubeLogo = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M21.56 7.3a2.85 2.85 0 0 0-2-2.02C17.78 4.8 12 4.8 12 4.8s-5.78 0-7.56.48a2.85 2.85 0 0 0-2 2.02A29.7 29.7 0 0 0 2 12a29.7 29.7 0 0 0 .44 4.7 2.85 2.85 0 0 0 2 2.02c1.78.48 7.56.48 7.56.48s5.78 0 7.56-.48a2.85 2.85 0 0 0 2-2.02A29.7 29.7 0 0 0 22 12a29.7 29.7 0 0 0-.44-4.7ZM10.25 15.2V8.8L15.85 12l-5.6 3.2Z" />
  </svg>
);

const TiktokLogo = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M14.2 3c.35 1.7 1.3 3.02 2.86 3.95.8.48 1.7.77 2.64.83v2.78a7.58 7.58 0 0 1-4.06-1.14v5.26a5.05 5.05 0 1 1-4.4-5.01v2.89a2.26 2.26 0 1 0 1.3 2.04V3h1.66Z" />
  </svg>
);

const SOCIAL_ICONS: Record<VcardSocialPlatform, ComponentType<IconProps>> = {
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  youtube: YoutubeLogo,
  tiktok: TiktokLogo,
};

const SOCIAL_LABELS: Record<VcardSocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

const FEATURED_SOCIAL_TITLES: Record<VcardSocialPlatform, string> = {
  instagram: 'Follow on Instagram',
  facebook: 'Follow on Facebook',
  youtube: 'Watch on YouTube',
  tiktok: 'Follow on TikTok',
};

const FEATURED_SOCIAL_HINTS: Record<VcardSocialPlatform, string> = {
  instagram: 'See the latest updates, stories, and drops.',
  facebook: 'Stay connected for posts, events, and announcements.',
  youtube: 'Open the channel and explore featured videos.',
  tiktok: 'Catch short-form updates and behind-the-scenes posts.',
};

const PROFILE_ALIGNMENTS: Record<VcardProfileAlign, string> = {
  left: 'left-5 translate-x-0 md:left-8',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-5 translate-x-0 md:right-8',
};

const makeGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;

const makeBase = (useGradient: boolean, color: string, gradient: string) =>
  useGradient ? makeGradient(color, gradient) : `linear-gradient(0deg, ${color}, ${color})`;

const getTextureStyle = (texture: VcardTexture, base: string) => {
  switch (texture) {
    case 'metallic':
      return {
        backgroundImage:
          'linear-gradient(120deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.25) 70%, rgba(255,255,255,0.25) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 6px), ' +
          base,
        backgroundBlendMode: 'screen, overlay, normal',
        boxShadow:
          'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.35)',
      } as CSSProperties;
    case 'glossy':
      return {
        backgroundImage:
          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.2)), ' +
          base,
        backgroundBlendMode: 'screen, overlay, normal',
        boxShadow:
          'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -10px 16px rgba(0,0,0,0.3)',
      } as CSSProperties;
    case 'paper':
      return {
        backgroundImage:
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), rgba(255,255,255,0) 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.95)',
      } as CSSProperties;
    case 'matte':
    default:
      return {
        backgroundImage:
          'linear-gradient(0deg, rgba(0,0,0,0.16), rgba(0,0,0,0.16)), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.94)',
      } as CSSProperties;
  }
};

const normalizeUrl = (value?: string) => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const normalizePhone = (value?: string) => (value ?? '').replace(/[^\d+]/g, '').trim();

const parseRgb = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : hex.length === 6
          ? hex
          : '';

    if (!normalized) return null;

    const parsed = Number.parseInt(normalized, 16);
    if (Number.isNaN(parsed)) return null;

    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  }

  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgbMatch) return null;

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
  };
};

const toRgba = (value: string | undefined, alpha: number) => {
  const rgb = parseRgb(value);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const isLightColor = (value?: string | null) => {
  const rgb = parseRgb(value);
  if (!rgb) return true;
  const channel = [rgb.r, rgb.g, rgb.b].map((component) => {
    const normalized = component / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2];
  return luminance > 0.58;
};

const getActionLink = (profile: VcardProfile) => {
  const ctaType = profile.ctaType;
  const rawValue = profile.ctaValue?.trim() ?? '';
  if (!ctaType) return null;

  if (ctaType === 'call') {
    const phone = normalizePhone(rawValue || profile.phone);
    return phone ? { href: `tel:${phone}`, external: false } : null;
  }

  if (ctaType === 'email') {
    const email = rawValue || profile.email?.trim() || '';
    return email ? { href: `mailto:${email}`, external: false } : null;
  }

  if (ctaType === 'whatsapp') {
    const whatsapp = normalizePhone(rawValue || profile.phone);
    return whatsapp
      ? { href: `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`, external: true }
      : null;
  }

  const website = normalizeUrl(rawValue || profile.website);
  return website ? { href: website, external: true } : null;
};

const renderMaybeLink = (
  keyValue: string,
  interactive: boolean,
  link: LinkConfig | null | undefined,
  className: string,
  children: ReactNode,
  dataAttributes?: Record<string, string | number>
) => {
  if (!interactive || !link?.href) {
    return (
      <div key={keyValue} className={className} {...dataAttributes}>
        {children}
      </div>
    );
  }

  return (
    <a
      key={keyValue}
      href={link.href}
      className={className}
      target={link.external ? '_blank' : undefined}
      rel={link.external ? 'noreferrer' : undefined}
      {...dataAttributes}
    >
      {children}
    </a>
  );
};

export function VcardLandingCard({
  profile,
  style,
  mode = 'public',
  interactive = true,
  showFooter = true,
  className,
}: VcardLandingCardProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isPreview = mode === 'preview';
  const texture = style.texture ?? 'matte';
  const name = profile.name?.trim() || 'Your Name';
  const title = profile.title?.trim() || '';
  const company = profile.company?.trim() || '';
  const about = profile.about?.trim() || '';
  const frontFontColor = style.frontFontColor ?? '#F8FAFC';
  const buttonColor = style.buttonColor ?? style.frontGradient ?? '#F8FAFC';
  const buttonTextColor = style.buttonTextColor ?? '#0F172A';
  const profileAlign = style.profileAlign ?? 'left';
  const profileInitial = name.charAt(0).toUpperCase() || 'Q';
  const actionLink = getActionLink(profile);
  const actionLabel = profile.ctaLabel?.trim() || (profile.ctaType ? CTA_LABELS[profile.ctaType] : '');
  const ActionIcon = profile.ctaType ? CTA_ICONS[profile.ctaType] : null;
  const actionKicker = profile.ctaType ? CTA_KICKERS[profile.ctaType] : '';
  const actionHelper = profile.ctaType ? CTA_HELPERS[profile.ctaType] : '';
  const cardBase = makeBase(style.frontUseGradient, style.frontColor, style.frontGradient);
  const cardStyle = getTextureStyle(texture, cardBase);
  const coverZoom = style.coverZoom ?? 100;
  const coverX = style.coverX ?? 50;
  const coverY = style.coverY ?? 50;
  const hasLightText = isLightColor(frontFontColor);
  const hasDarkButtonText = !isLightColor(buttonTextColor);
  const primarySubline = company || title;
  const secondarySubline = company && title ? title : '';
  const accentGlow =
    toRgba(style.frontGradient || style.frontColor, hasLightText ? 0.22 : 0.18) ??
    'rgba(255,255,255,0.12)';
  const buttonGlow =
    toRgba(buttonColor, hasDarkButtonText ? 0.22 : 0.34) ??
    'rgba(15,23,42,0.22)';

  const socialLinks = [
    { key: 'instagram' as const, label: SOCIAL_LABELS.instagram, value: profile.socials?.instagram?.trim() || '' },
    { key: 'facebook' as const, label: SOCIAL_LABELS.facebook, value: profile.socials?.facebook?.trim() || '' },
    { key: 'youtube' as const, label: SOCIAL_LABELS.youtube, value: profile.socials?.youtube?.trim() || '' },
    { key: 'tiktok' as const, label: SOCIAL_LABELS.tiktok, value: profile.socials?.tiktok?.trim() || '' },
  ].filter((link) => link.value);

  const featuredSocial = profile.favoriteSocial
    ? socialLinks.find((link) => link.key === profile.favoriteSocial)
    : null;
  const FeaturedSocialIcon = featuredSocial ? SOCIAL_ICONS[featuredSocial.key] : null;
  const featuredSocialLink = featuredSocial
    ? {
        href: normalizeUrl(featuredSocial.value),
        external: true,
      }
    : null;

  const contactRows: ContactRow[] = [
    {
      key: 'phone',
      label: 'Phone',
      value: profile.phone?.trim() || '',
      Icon: Phone,
      link: profile.phone?.trim()
        ? { href: `tel:${normalizePhone(profile.phone)}`, external: false }
        : null,
    },
    {
      key: 'email',
      label: 'Email',
      value: profile.email?.trim() || '',
      Icon: Mail,
      link: profile.email?.trim()
        ? { href: `mailto:${profile.email.trim()}`, external: false }
        : null,
    },
    {
      key: 'location',
      label: 'Location',
      value: profile.location?.trim() || '',
      Icon: MapPin,
      link: null,
    },
    {
      key: 'website',
      label: 'Website',
      value: profile.website?.trim() || '',
      Icon: Globe,
      link: profile.website?.trim()
        ? { href: normalizeUrl(profile.website), external: true }
        : null,
    },
  ].filter((row) => row.value);

  const shellClass = hasLightText
    ? 'border-white/12 bg-white/[0.08] text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
    : 'border-slate-900/10 bg-white/[0.58] text-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.12)]';
  const panelClass = hasLightText
    ? 'border-white/12 bg-white/[0.06]'
    : 'border-slate-900/10 bg-white/50';
  const chipClass = hasLightText
    ? 'border-white/12 bg-white/[0.10] text-white/90'
    : 'border-slate-900/[0.08] bg-white/70 text-slate-900/[0.85]';
  const iconBubbleClass = hasLightText
    ? 'bg-white/[0.12] text-white/[0.92]'
    : 'bg-slate-950/[0.06] text-slate-950/[0.8]';
  const dividerClass = hasLightText ? 'divide-white/10' : 'divide-slate-900/10';
  const borderToneClass = hasLightText ? 'border-white/10' : 'border-slate-900/10';
  const collectrInput =
    mode === 'public'
      ? resolveCollectrPreviewInput(
          typeof window !== 'undefined' ? window.location.pathname : '',
          profile.collectrUrl,
          typeof window !== 'undefined' ? window.location.href : ''
        )
      : '';
  const collectrPreview = useCollectrPreview(collectrInput, isPreview ? 4 : 5);
  const collectrData = collectrPreview.data;
  const showCollectrLoading = Boolean(collectrInput) && collectrPreview.isLoading && !collectrData;
  const showCollectrModule = Boolean(collectrData || showCollectrLoading);
  const collectrStats: CollectrStat[] = collectrData
    ? [
        {
          key: 'cards',
          label: 'Cards',
          value: collectrData.profile.totalCards > 0 ? `${collectrData.profile.totalCards}` : '',
        },
        {
          key: 'sealed',
          label: 'Sealed',
          value: collectrData.profile.totalSealed > 0 ? `${collectrData.profile.totalSealed}` : '',
        },
        {
          key: 'value',
          label: 'Value',
          value: formatCollectrCurrency(collectrData.profile.portfolioValue),
        },
      ].filter((stat) => stat.value)
    : [];

  useEffect(() => {
    if (typeof window === 'undefined' || isPreview || mode !== 'public') {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const root = sectionRef.current;
    if (!root) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-scroll-spotlight]'));
    if (!targets.length) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportCenter = viewportHeight * 0.52;

      targets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - elementCenter);
        const range = Math.max(viewportHeight * 0.68, rect.height * 1.25);
        const emphasis = Math.max(0, 1 - distance / range);
        const strength = Number(target.dataset.scrollStrength ?? '1');

        target.style.setProperty('--qrc-spotlight-scale', (1 + emphasis * 0.06 * strength).toFixed(3));
        target.style.setProperty('--qrc-spotlight-shift', `${(emphasis * -12 * strength).toFixed(2)}px`);
        target.style.setProperty('--qrc-spotlight-opacity', (0.9 + emphasis * 0.1).toFixed(3));
      });
    };

    const schedule = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(update);
    };

    update();

    const visualViewport = window.visualViewport;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    visualViewport?.addEventListener('scroll', schedule);
    visualViewport?.addEventListener('resize', schedule);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      visualViewport?.removeEventListener('scroll', schedule);
      visualViewport?.removeEventListener('resize', schedule);
      targets.forEach((target) => {
        target.style.removeProperty('--qrc-spotlight-scale');
        target.style.removeProperty('--qrc-spotlight-shift');
        target.style.removeProperty('--qrc-spotlight-opacity');
      });
    };
  }, [actionLabel, contactRows.length, featuredSocial?.key, isPreview, mode, showCollectrModule]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative isolate w-full overflow-hidden border shadow-[0_24px_80px_rgba(15,23,42,0.28)]',
        isPreview ? 'max-w-[360px]' : 'max-w-5xl',
        className
      )}
      style={{
        ...cardStyle,
        borderRadius: `${style.radius ?? 24}px`,
        color: frontFontColor,
        fontFamily: normalizeVcardFontFamily(style.fontFamily),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at 12% 14%, ${accentGlow} 0%, transparent 34%), radial-gradient(circle at 88% 84%, ${buttonGlow} 0%, transparent 32%)`,
        }}
      />

      <div className="relative">
        <div
          className={cn(
            'relative overflow-hidden',
            isPreview ? 'aspect-[5/2]' : 'aspect-[5/2] sm:aspect-[16/6] lg:aspect-[16/5]'
          )}
        >
          <div
            className="absolute inset-0"
            style={{
              background: cardBase,
            }}
          />
          {style.coverPhotoDataUrl ? (
            <div
              aria-label="VCard cover"
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${style.coverPhotoDataUrl})`,
                backgroundSize: `${coverZoom}%`,
                backgroundPosition: `${coverX}% ${coverY}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-black/24 via-black/8 to-black/38" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/36 to-transparent" />
          {style.frontLogoDataUrl ? (
            <div
              className={cn(
                'absolute right-4 top-4 flex items-center justify-center rounded-[1.4rem] border p-2.5 backdrop-blur-xl md:right-6 md:top-6',
                hasLightText ? 'border-white/18 bg-black/20' : 'border-slate-900/12 bg-white/[0.65]'
              )}
            >
              <img
                src={style.frontLogoDataUrl}
                alt="Brand mark"
                className={cn(isPreview ? 'h-10 max-w-[92px]' : 'h-14 max-w-[145px]')}
              />
            </div>
          ) : null}
        </div>

        <div className={cn('absolute bottom-0 z-10 translate-y-1/2', PROFILE_ALIGNMENTS[profileAlign])}>
          <div
            className={cn(
              'overflow-hidden rounded-full border-4 shadow-[0_14px_38px_rgba(15,23,42,0.35)]',
              hasLightText ? 'border-white/[0.85] bg-white/[0.12]' : 'border-white/[0.95] bg-white/[0.45]',
              isPreview ? 'h-24 w-24' : 'h-28 w-28 md:h-36 md:w-36'
            )}
          >
            <div
              className="flex h-full w-full items-center justify-center bg-black/15 text-3xl font-semibold text-white"
              style={{
                backgroundImage: style.profilePhotoDataUrl ? `url(${style.profilePhotoDataUrl})` : undefined,
                backgroundSize: `${style.photoZoom ?? 110}%`,
                backgroundPosition: `${style.photoX ?? 50}% ${style.photoY ?? 50}%`,
                backgroundRepeat: 'no-repeat',
              }}
            >
              {!style.profilePhotoDataUrl ? profileInitial : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'relative px-4 pb-4 pt-16 sm:px-6 sm:pb-6',
          isPreview ? 'space-y-4 pt-16' : 'space-y-5 pt-[4.75rem] sm:space-y-6 sm:pt-20 md:px-8 md:pb-8 md:pt-24'
        )}
      >
        <div className={cn('space-y-4', isPreview ? '' : 'lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:gap-6 lg:space-y-0')}>
          <div className="space-y-4">
            <div className={cn('rounded-[30px] border px-4 py-5 backdrop-blur-2xl sm:px-5 sm:py-6', shellClass)}>
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <div className="space-y-2">
                    <h1
                      className={cn(
                        'font-semibold tracking-tight',
                        isPreview ? 'text-[2rem] leading-[1.02]' : 'text-[2.15rem] leading-[1.02] sm:text-[2.55rem] md:text-[3.15rem]'
                      )}
                    >
                      {name}
                    </h1>
                    {primarySubline ? (
                      <p
                        className={cn(
                          'font-medium tracking-tight',
                          isPreview ? 'text-lg leading-tight' : 'text-xl leading-tight sm:text-2xl md:text-[2rem]'
                        )}
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.92 : 0.84 }}
                      >
                        {primarySubline}
                      </p>
                    ) : null}
                    {secondarySubline ? (
                      <p
                        className={cn(isPreview ? 'text-sm' : 'text-sm sm:text-base')}
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.78 : 0.66 }}
                      >
                        {secondarySubline}
                      </p>
                    ) : null}
                  </div>
                </div>

                {socialLinks.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {socialLinks.map((link) => {
                      const Icon = SOCIAL_ICONS[link.key];
                      const socialHref = normalizeUrl(link.value);
                      const sharedClassName = cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border transition backdrop-blur-xl',
                        hasLightText
                          ? 'border-white/14 bg-white/[0.1] text-white/[0.92] hover:border-white/24 hover:bg-white/[0.16]'
                          : 'border-slate-900/[0.08] bg-white/[0.72] text-slate-900/[0.82] hover:border-slate-900/14 hover:bg-white/[0.88]'
                      );
                      if (interactive) {
                        return (
                          <a
                            key={link.key}
                            href={socialHref}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={link.label}
                            title={link.label}
                            className={sharedClassName}
                          >
                            <Icon className="h-4 w-4" />
                          </a>
                        );
                      }
                      return (
                        <div
                          key={link.key}
                          aria-label={link.label}
                          title={link.label}
                          className={sharedClassName}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {about ? (
                  <p
                    className={cn('max-w-[62ch] leading-relaxed', isPreview ? 'text-sm' : 'text-sm md:text-base')}
                    style={{ color: frontFontColor, opacity: hasLightText ? 0.84 : 0.74 }}
                  >
                    {about}
                  </p>
                ) : null}
              </div>
            </div>

            {actionLink && actionLabel ? (
              renderMaybeLink(
                'primary-action',
                interactive,
                actionLink,
                'qrc-scroll-spotlight group relative block overflow-hidden rounded-[30px] px-5 py-4 sm:px-6 sm:py-5',
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${buttonColor} 0%, ${buttonColor} 65%, ${toRgba(
                        buttonColor,
                        hasDarkButtonText ? 0.78 : 0.92
                      ) ?? buttonColor} 100%)`,
                      boxShadow: `0 18px 40px ${buttonGlow}`,
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-80"
                    style={{
                      background:
                        'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.08) 100%)',
                    }}
                  />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                          className={cn(
                            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border',
                            hasDarkButtonText
                              ? 'border-slate-900/12 bg-white/[0.35] text-slate-950'
                              : 'border-white/20 bg-black/15 text-white'
                          )}
                      >
                        {ActionIcon ? <ActionIcon className="h-5 w-5" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.32em]"
                          style={{ color: buttonTextColor, opacity: 0.72 }}
                        >
                          {actionKicker}
                        </p>
                        <p
                          className={cn(
                            'truncate font-semibold tracking-tight',
                            isPreview ? 'text-base' : 'text-lg sm:text-xl'
                          )}
                          style={{ color: buttonTextColor }}
                        >
                          {actionLabel}
                        </p>
                        <p
                          className={cn(isPreview ? 'text-xs' : 'text-xs sm:text-sm')}
                          style={{ color: buttonTextColor, opacity: 0.82 }}
                        >
                          {actionHelper}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                        isPreview ? 'hidden' : 'block'
                      )}
                      style={{ color: buttonTextColor }}
                    />
                  </div>
                </>,
                {
                  'data-scroll-spotlight': 'cta',
                  'data-scroll-strength': 1.35,
                }
              )
            ) : null}

            {featuredSocial ? (
              renderMaybeLink(
                'featured-social',
                interactive,
                featuredSocialLink,
                cn(
                  'qrc-scroll-spotlight group relative overflow-hidden rounded-[30px] border px-5 py-4 backdrop-blur-2xl sm:px-6 sm:py-5',
                  shellClass
                ),
                <>
                  <div
                    className="absolute inset-0 opacity-70"
                    style={{
                      background: `linear-gradient(135deg, ${toRgba(style.frontGradient || style.frontColor, hasLightText ? 0.18 : 0.12) ?? 'transparent'} 0%, transparent 55%, ${toRgba(buttonColor, 0.18) ?? 'transparent'} 100%)`,
                    }}
                  />
                  <div className="relative flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border',
                        hasLightText
                          ? 'border-white/14 bg-white/[0.12] text-white'
                          : 'border-slate-900/[0.08] bg-white/70 text-slate-900/[0.85]'
                      )}
                    >
                      {FeaturedSocialIcon ? <FeaturedSocialIcon className="h-6 w-6" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.32em]"
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.6 : 0.5 }}
                      >
                        Favorite channel
                      </p>
                      <p
                        className={cn(
                          'font-semibold tracking-tight',
                          isPreview ? 'text-base' : 'text-lg sm:text-xl'
                        )}
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.96 : 0.9 }}
                      >
                        {FEATURED_SOCIAL_TITLES[featuredSocial.key]}
                      </p>
                      <p
                        className={cn(isPreview ? 'text-xs' : 'text-xs sm:text-sm')}
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.78 : 0.66 }}
                      >
                        {FEATURED_SOCIAL_HINTS[featuredSocial.key]}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="h-5 w-5 flex-shrink-0 opacity-72 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                      style={{ color: frontFontColor }}
                    />
                  </div>
                </>,
                {
                  'data-scroll-spotlight': 'featured',
                  'data-scroll-strength': 1.05,
                }
              )
            ) : null}
          </div>

          <div className="space-y-4">
            {contactRows.length > 0 ? (
              <div
                className={cn(
                  'qrc-scroll-spotlight overflow-hidden rounded-[30px] border p-2.5 backdrop-blur-2xl sm:p-3',
                  shellClass
                )}
                data-scroll-spotlight="contact"
                data-scroll-strength="0.8"
              >
                <div className="flex items-end justify-between gap-4 px-3 pb-3 pt-1 sm:px-4">
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.32em]"
                      style={{ color: frontFontColor, opacity: hasLightText ? 0.64 : 0.54 }}
                    >
                      Contact
                    </p>
                    <p
                      className={cn(isPreview ? 'text-sm' : 'text-sm sm:text-base')}
                      style={{ color: frontFontColor, opacity: hasLightText ? 0.84 : 0.72 }}
                    >
                      Reach out directly from the channels below.
                    </p>
                  </div>
                  <span
                    className={cn(
                      'hidden rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] sm:inline-flex',
                      chipClass
                    )}
                  >
                    {contactRows.length} ways
                  </span>
                </div>

                <div className={cn('overflow-hidden rounded-[24px] border backdrop-blur-xl', panelClass, dividerClass)}>
                  {contactRows.map((row) =>
                    renderMaybeLink(
                      row.key,
                      interactive,
                      row.link,
                      'group flex items-center gap-3.5 px-4 py-3.5 transition sm:px-5 sm:py-4',
                      <>
                        <div
                          className={cn(
                            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl',
                            iconBubbleClass
                          )}
                        >
                          <row.Icon className="h-[18px] w-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[10px] font-semibold uppercase tracking-[0.32em]"
                            style={{ color: frontFontColor, opacity: hasLightText ? 0.58 : 0.5 }}
                          >
                            {row.label}
                          </p>
                          <p
                            className={cn(
                              'truncate font-medium tracking-tight',
                              isPreview ? 'text-[15px]' : 'text-[15px] sm:text-base'
                            )}
                            style={{ color: frontFontColor, opacity: hasLightText ? 0.96 : 0.88 }}
                          >
                            {row.value}
                          </p>
                        </div>
                        {row.link?.href ? (
                          <ArrowUpRight
                            className="h-4 w-4 flex-shrink-0 opacity-65 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                            style={{ color: frontFontColor }}
                          />
                        ) : null}
                      </>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showCollectrModule ? (
          <div
            className={cn(
              'qrc-scroll-spotlight group relative overflow-hidden rounded-[32px] border px-4 py-4 backdrop-blur-2xl sm:px-5 sm:py-5',
              shellClass
            )}
            data-scroll-spotlight="collectr"
            data-scroll-strength="0.72"
          >
            {collectrData?.profile.backgroundImageUrl ? (
              <div
                className="absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage: `url(${collectrData.profile.backgroundImageUrl})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }}
              />
            ) : null}
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background: `linear-gradient(135deg, ${toRgba(style.frontGradient || style.frontColor, hasLightText ? 0.14 : 0.08) ?? 'transparent'} 0%, transparent 48%, ${toRgba(buttonColor, hasDarkButtonText ? 0.18 : 0.12) ?? 'transparent'} 100%)`,
              }}
            />

            <div className="relative space-y-4">
              <div
                className={cn(
                  'flex flex-col gap-4',
                  isPreview ? '' : 'sm:flex-row sm:items-end sm:justify-between'
                )}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]',
                        chipClass
                      )}
                    >
                      Collection showcase
                    </span>
                    {collectrData?.profile.handle ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em]',
                          chipClass
                        )}
                      >
                        @{collectrData.profile.handle}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <h2
                      className={cn(
                        'font-semibold tracking-tight',
                        isPreview ? 'text-lg' : 'text-xl sm:text-[1.5rem]'
                      )}
                      style={{ color: frontFontColor, opacity: hasLightText ? 0.98 : 0.92 }}
                    >
                      Featured from my Collectr
                    </h2>
                    <p
                      className={cn(isPreview ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed sm:text-[15px]')}
                      style={{ color: frontFontColor, opacity: hasLightText ? 0.76 : 0.68 }}
                    >
                      A quick look at standout pieces from the collection without leaving this card.
                    </p>
                  </div>
                </div>

                {collectrStats.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {collectrStats.map((stat) => (
                      <div
                        key={stat.key}
                        className={cn(
                          'rounded-2xl border px-3 py-2 backdrop-blur-xl',
                          panelClass
                        )}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                          style={{ color: frontFontColor, opacity: hasLightText ? 0.56 : 0.5 }}
                        >
                          {stat.label}
                        </p>
                        <p
                          className={cn(
                            'font-semibold tracking-tight',
                            isPreview ? 'text-sm' : 'text-sm sm:text-base'
                          )}
                          style={{ color: frontFontColor, opacity: hasLightText ? 0.96 : 0.88 }}
                        >
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {collectrData ? (
                <>
                  <div
                    className={cn(
                      'qrc-vcard-scrollbar gap-2.5',
                      isPreview
                        ? 'grid grid-cols-2'
                        : 'flex overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5'
                    )}
                  >
                    {collectrData.cards.map((card) => (
                      <a
                        key={card.id}
                        href={interactive ? collectrData.sourceUrl : undefined}
                        target={interactive ? '_blank' : undefined}
                        rel={interactive ? 'noreferrer' : undefined}
                        className={cn(
                          'group/card flex-none overflow-hidden border transition duration-200',
                          panelClass,
                          isPreview
                            ? 'rounded-[24px]'
                            : 'w-[104px] rounded-[20px] sm:w-auto sm:rounded-[24px]',
                          interactive ? 'hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.16)]' : ''
                        )}
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-black/10">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="h-full w-full object-cover transition duration-300 group-hover/card:scale-[1.03]"
                            loading="lazy"
                          />
                        </div>
                        <div
                          className={cn(
                            isPreview ? 'space-y-2 px-3 py-3' : 'space-y-1.5 px-2.5 py-2.5 sm:space-y-2 sm:px-3 sm:py-3'
                          )}
                        >
                          <div className="space-y-1">
                            <p
                              className={cn(
                                'font-semibold uppercase',
                                isPreview ? 'text-[10px] tracking-[0.26em]' : 'text-[8px] tracking-[0.22em] sm:text-[10px] sm:tracking-[0.26em]'
                              )}
                              style={{ color: frontFontColor, opacity: hasLightText ? 0.54 : 0.48 }}
                            >
                              {card.setName || card.categoryName || 'Collectr'}
                            </p>
                            <p
                              className={cn(
                                'overflow-hidden font-semibold leading-tight tracking-tight',
                                isPreview ? 'text-[13px]' : 'text-[11px] sm:text-sm'
                              )}
                              style={{
                                color: frontFontColor,
                                opacity: hasLightText ? 0.96 : 0.9,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {card.name}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {card.marketPrice !== null ? (
                              <span
                                className={cn(
                                  'rounded-full border font-semibold',
                                  isPreview ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px]',
                                  hasLightText
                                    ? 'border-white/12 bg-white/[0.12] text-white'
                                    : 'border-slate-900/10 bg-white/[0.78] text-slate-950'
                                )}
                              >
                                {formatCollectrCurrency(card.marketPrice)}
                              </span>
                            ) : null}
                            {card.quantity > 1 ? (
                              <span
                                className={cn(
                                  'rounded-full border font-medium',
                                  isPreview ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px]',
                                  chipClass
                                )}
                              >
                                x{card.quantity}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>

                  <a
                    href={interactive ? collectrData.sourceUrl : undefined}
                    target={interactive ? '_blank' : undefined}
                    rel={interactive ? 'noreferrer' : undefined}
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-[24px] border px-4 py-3.5 transition sm:px-5',
                      panelClass,
                      interactive ? 'hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.14)]' : ''
                    )}
                  >
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.56 : 0.48 }}
                      >
                        Full showcase
                      </p>
                      <p
                        className={cn(
                          'font-semibold tracking-tight',
                          isPreview ? 'text-sm' : 'text-sm sm:text-base'
                        )}
                        style={{ color: frontFontColor, opacity: hasLightText ? 0.96 : 0.9 }}
                      >
                        Open the complete Collectr page
                      </p>
                    </div>
                    <ArrowUpRight
                      className="h-5 w-5 flex-shrink-0"
                      style={{ color: frontFontColor, opacity: hasLightText ? 0.8 : 0.74 }}
                    />
                  </a>
                </>
              ) : null}

              {showCollectrLoading ? (
                <div
                  className={cn(
                    'qrc-vcard-scrollbar gap-2.5',
                    isPreview
                      ? 'grid grid-cols-2'
                      : 'flex overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5'
                  )}
                >
                  {Array.from({ length: isPreview ? 4 : 5 }).map((_, index) => (
                    <div
                      key={`collectr-skeleton-${index}`}
                      className={cn(
                        'flex-none overflow-hidden border animate-pulse',
                        panelClass,
                        isPreview
                          ? 'rounded-[24px]'
                          : 'w-[104px] rounded-[20px] sm:w-auto sm:rounded-[24px]'
                      )}
                    >
                      <div className="aspect-[3/4] bg-black/10" />
                      <div
                        className={cn(
                          isPreview ? 'space-y-2 px-3 py-3' : 'space-y-1.5 px-2.5 py-2.5 sm:space-y-2 sm:px-3 sm:py-3'
                        )}
                      >
                        <div className="h-2.5 w-16 rounded-full bg-black/10" />
                        <div className="h-3.5 w-full rounded-full bg-black/10" />
                        <div className="h-3.5 w-3/4 rounded-full bg-black/10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showFooter ? (
          <div
            className={cn(
              'border-t pt-4 text-center text-[11px] sm:text-xs',
              borderToneClass
            )}
            style={{ color: frontFontColor, opacity: hasLightText ? 0.76 : 0.7 }}
          >
            This vcard was created with QR Code Studio by Luminar Apps.{' '}
            {interactive ? (
              <a
                href="https://qrcode.luminarapps.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline decoration-dotted underline-offset-4"
              >
                Create yours now
              </a>
            ) : (
              <span className="font-semibold underline decoration-dotted underline-offset-4">
                Create yours now
              </span>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
