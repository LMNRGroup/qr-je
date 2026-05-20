import type { CSSProperties, ComponentType, ReactNode } from 'react';
import {
  ArrowUpRight,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';

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

type SocialIconProps = {
  className?: string;
};

const InstagramLogo = ({ className }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="5.25" />
    <circle cx="12" cy="12" r="4.1" />
    <circle cx="17.35" cy="6.65" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookLogo = ({ className }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M13.25 21v-6.7h2.27l.34-2.77h-2.61V9.76c0-.8.22-1.35 1.38-1.35H16V5.96c-.24-.03-1.07-.1-2.04-.1-2.02 0-3.4 1.24-3.4 3.5v2.17H8.28v2.77h2.28V21h2.69Z" />
  </svg>
);

const YoutubeLogo = ({ className }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M21.56 7.3a2.85 2.85 0 0 0-2-2.02C17.78 4.8 12 4.8 12 4.8s-5.78 0-7.56.48a2.85 2.85 0 0 0-2 2.02A29.7 29.7 0 0 0 2 12a29.7 29.7 0 0 0 .44 4.7 2.85 2.85 0 0 0 2 2.02c1.78.48 7.56.48 7.56.48s5.78 0 7.56-.48a2.85 2.85 0 0 0 2-2.02A29.7 29.7 0 0 0 22 12a29.7 29.7 0 0 0-.44-4.7ZM10.25 15.2V8.8L15.85 12l-5.6 3.2Z" />
  </svg>
);

const TiktokLogo = ({ className }: SocialIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M14.2 3c.35 1.7 1.3 3.02 2.86 3.95.8.48 1.7.77 2.64.83v2.78a7.58 7.58 0 0 1-4.06-1.14v5.26a5.05 5.05 0 1 1-4.4-5.01v2.89a2.26 2.26 0 1 0 1.3 2.04V3h1.66Z" />
  </svg>
);

const SOCIAL_ICONS: Record<VcardSocialPlatform, ComponentType<SocialIconProps>> = {
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
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.35)',
      } as CSSProperties;
    case 'glossy':
      return {
        backgroundImage:
          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.2)), ' +
          base,
        backgroundBlendMode: 'screen, overlay, normal',
        boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -10px 16px rgba(0,0,0,0.3)',
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
          'linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.9)',
      } as CSSProperties;
  }
};

const normalizeUrl = (value?: string) => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const normalizePhone = (value?: string) => (value ?? '').replace(/[^\d+]/g, '').trim();

const getActionHref = (profile: VcardProfile) => {
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
    return whatsapp ? { href: `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`, external: true } : null;
  }

  const website = normalizeUrl(rawValue || profile.website);
  return website ? { href: website, external: true } : null;
};

const renderMaybeLink = (
  keyValue: string,
  interactive: boolean,
  href: string | undefined,
  external: boolean | undefined,
  className: string,
  children: ReactNode
) => {
  if (!interactive || !href) {
    return (
      <div key={keyValue} className={className}>
        {children}
      </div>
    );
  }

  return (
    <a
      key={keyValue}
      href={href}
      className={className}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
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
  const actionConfig = getActionHref(profile);
  const actionLabel = profile.ctaLabel?.trim() || (profile.ctaType ? CTA_LABELS[profile.ctaType] : '');
  const ActionIcon = profile.ctaType ? CTA_ICONS[profile.ctaType] : null;
  const cardBase = makeBase(style.frontUseGradient, style.frontColor, style.frontGradient);
  const cardStyle = getTextureStyle(texture, cardBase);
  const coverZoom = style.coverZoom ?? 100;
  const coverX = style.coverX ?? 50;
  const coverY = style.coverY ?? 50;
  const socialLinks = [
    { key: 'instagram' as const, label: SOCIAL_LABELS.instagram, value: profile.socials?.instagram?.trim() || '' },
    { key: 'facebook' as const, label: SOCIAL_LABELS.facebook, value: profile.socials?.facebook?.trim() || '' },
    { key: 'youtube' as const, label: SOCIAL_LABELS.youtube, value: profile.socials?.youtube?.trim() || '' },
    { key: 'tiktok' as const, label: SOCIAL_LABELS.tiktok, value: profile.socials?.tiktok?.trim() || '' },
  ].filter((link) => link.value);
  const featuredSocial = profile.favoriteSocial
    ? socialLinks.find((link) => link.key === profile.favoriteSocial)
    : null;

  const infoRows = [
    {
      key: 'phone',
      label: 'Phone',
      value: profile.phone?.trim() || '',
      Icon: Phone,
      href: profile.phone?.trim() ? `tel:${normalizePhone(profile.phone)}` : undefined,
      external: false,
    },
    {
      key: 'email',
      label: 'Email',
      value: profile.email?.trim() || '',
      Icon: Mail,
      href: profile.email?.trim() ? `mailto:${profile.email.trim()}` : undefined,
      external: false,
    },
    {
      key: 'location',
      label: 'Location',
      value: profile.location?.trim() || '',
      Icon: MapPin,
      href: undefined,
      external: false,
    },
    {
      key: 'website',
      label: 'Website',
      value: profile.website?.trim() || '',
      Icon: Globe,
      href: profile.website?.trim() ? normalizeUrl(profile.website) : undefined,
      external: true,
    },
    ...(featuredSocial
      ? [{
          key: `featured-social-${featuredSocial.key}`,
          label: 'Featured Social',
          value: featuredSocial.label,
          Icon: SOCIAL_ICONS[featuredSocial.key],
          href: normalizeUrl(featuredSocial.value),
          external: true,
          featured: true,
        }]
      : []),
  ].filter((row) => row.value);

  return (
    <section
      className={cn(
        'w-full overflow-hidden border border-white/10 shadow-[0_24px_80px_rgba(15,23,42,0.28)]',
        isPreview ? 'max-w-[360px]' : 'max-w-5xl',
        className
      )}
      style={{
        ...cardStyle,
        borderRadius: `${style.radius ?? 24}px`,
        color: frontFontColor,
        fontFamily: style.fontFamily,
      }}
    >
      <div className="relative">
        <div className={cn('relative overflow-hidden', isPreview ? 'aspect-[5/2]' : 'aspect-[5/2] md:aspect-[16/5]')}>
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
          <div className="absolute inset-0 bg-gradient-to-br from-black/18 via-black/8 to-black/24" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/24 to-transparent" />
          {style.frontLogoDataUrl ? (
            <div className="absolute right-4 top-4 flex items-center justify-center rounded-2xl border border-white/15 bg-black/15 p-2 backdrop-blur-sm md:right-6 md:top-6">
              <img
                src={style.frontLogoDataUrl}
                alt="Brand mark"
                className={cn(isPreview ? 'h-10 max-w-[90px]' : 'h-14 max-w-[140px]')}
              />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'absolute bottom-0 z-10 translate-y-1/2',
            PROFILE_ALIGNMENTS[profileAlign]
          )}
        >
          <div
            className={cn(
              'overflow-hidden rounded-full border-4 border-white/80 bg-white/10 shadow-[0_12px_30px_rgba(15,23,42,0.35)]',
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
          'px-4 pb-4 pt-16 sm:px-5 sm:pb-5 md:px-8 md:pb-8',
          isPreview ? 'space-y-6 pt-16' : 'space-y-5 pt-[4.75rem] sm:space-y-6 sm:pt-20 md:pt-24'
        )}
      >
        <div className={cn('space-y-5', isPreview ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:space-y-0')}>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <h1 className={cn('font-semibold tracking-tight', isPreview ? 'text-2xl' : 'text-2xl sm:text-3xl md:text-4xl')}>
                {name}
              </h1>
              {title ? (
                <p className={cn('font-medium', isPreview ? 'text-sm' : 'text-sm sm:text-base md:text-lg')} style={{ color: frontFontColor, opacity: 0.92 }}>
                  {title}
                </p>
              ) : null}
              {company ? (
                <p className={cn(isPreview ? 'text-base' : 'text-base sm:text-lg md:text-xl')} style={{ color: frontFontColor, opacity: 0.8 }}>
                  {company}
                </p>
              ) : null}
              {socialLinks.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {socialLinks.map((link) => {
                    const Icon = SOCIAL_ICONS[link.key as keyof typeof SOCIAL_ICONS];
                    const href = normalizeUrl(link.value);
                    const sharedClassName =
                      'flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/90 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/14';
                    if (interactive) {
                      return (
                        <a
                          key={link.key}
                          href={href}
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
            </div>

            {about ? (
              <p className={cn('leading-relaxed', isPreview ? 'text-sm' : 'text-sm md:text-base')} style={{ color: frontFontColor, opacity: 0.86 }}>
                {about}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {infoRows.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {infoRows.map((row) =>
                  renderMaybeLink(
                    row.key,
                    interactive,
                    row.href,
                    row.external,
                    `group flex items-start gap-3 rounded-2xl px-3 py-2.5 backdrop-blur-sm transition sm:px-4 sm:py-3 ${
                      row.featured
                        ? 'border border-white/20 bg-white/10 shadow-[0_10px_30px_rgba(15,23,42,0.14)] hover:border-white/30 hover:bg-white/14'
                        : 'border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`,
                    <>
                      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white/90 sm:h-10 sm:w-10 ${
                        row.featured ? 'bg-white/16' : 'bg-white/10'
                      }`}>
                        <row.Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: frontFontColor, opacity: 0.58 }}>
                          {row.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={cn('truncate font-medium', isPreview ? 'text-sm' : 'text-sm md:text-base')} style={{ color: frontFontColor }}>
                            {row.value}
                          </p>
                          {row.href ? <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 opacity-65 transition group-hover:opacity-100" /> : null}
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>
            ) : null}

            {actionConfig && actionLabel ? (
              interactive ? (
                <a
                  href={actionConfig.href}
                  target={actionConfig.external ? '_blank' : undefined}
                  rel={actionConfig.external ? 'noreferrer' : undefined}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-center text-sm font-semibold transition hover:opacity-92 sm:px-5 sm:py-4 sm:text-base"
                  style={{
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                  }}
                >
                  {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
                  {actionLabel}
                </a>
              ) : (
                <div
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-center text-sm font-semibold sm:px-5 sm:py-4 sm:text-base"
                  style={{
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                  }}
                >
                  {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
                  {actionLabel}
                </div>
              )
            ) : null}
          </div>
        </div>

        {showFooter ? (
          <div className="border-t border-white/10 pt-4 text-center text-xs" style={{ color: frontFontColor, opacity: 0.72 }}>
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
