import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowUpRight,
  Building2,
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
    {
      key: 'company',
      label: 'Company',
      value: company && company !== title ? company : '',
      Icon: Building2,
      href: undefined,
      external: false,
    },
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
          {style.coverPhotoDataUrl ? (
            <img
              src={style.coverPhotoDataUrl}
              alt="VCard cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: makeBase(true, style.frontColor, style.frontGradient),
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/10 to-black/45" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
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
          'space-y-6 px-5 pb-5 pt-16 md:px-8 md:pb-8',
          isPreview ? 'pt-16' : 'pt-20 md:pt-24'
        )}
      >
        <div className={cn('space-y-6', isPreview ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:space-y-0')}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className={cn('font-semibold tracking-tight', isPreview ? 'text-2xl' : 'text-3xl md:text-4xl')}>
                {name}
              </h1>
              {title ? (
                <p className={cn('font-medium', isPreview ? 'text-sm' : 'text-base md:text-lg')} style={{ color: frontFontColor, opacity: 0.92 }}>
                  {title}
                </p>
              ) : null}
              {company ? (
                <p className={cn(isPreview ? 'text-sm' : 'text-base')} style={{ color: frontFontColor, opacity: 0.72 }}>
                  {company}
                </p>
              ) : null}
            </div>

            {about ? (
              <p className={cn('leading-relaxed', isPreview ? 'text-sm' : 'text-sm md:text-base')} style={{ color: frontFontColor, opacity: 0.86 }}>
                {about}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            {infoRows.length > 0 ? (
              <div className="space-y-3">
                {infoRows.map((row) =>
                  renderMaybeLink(
                    row.key,
                    interactive,
                    row.href,
                    row.external,
                    'group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10',
                    <>
                      <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/85">
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-center font-semibold transition hover:opacity-92"
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-center font-semibold"
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
