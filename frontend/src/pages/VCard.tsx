import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPublicVcard } from '@/lib/api';
import { VcardProfile, VcardStyle, VcardTexture } from '@/types/qr';

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
      } as React.CSSProperties;
    case 'glossy':
      return {
        backgroundImage:
          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.2)), ' +
          base,
        backgroundBlendMode: 'screen, overlay, normal',
        boxShadow: 'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -10px 16px rgba(0,0,0,0.3)',
      } as React.CSSProperties;
    case 'paper':
      return {
        backgroundImage:
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), rgba(255,255,255,0) 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.95)',
      } as React.CSSProperties;
    case 'matte':
    default:
      return {
        backgroundImage:
          'linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.9)',
      } as React.CSSProperties;
  }
};

const VCard = () => {
  const { slug } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<VcardProfile | null>(null);
  const [style, setStyle] = useState<VcardStyle | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');

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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load vcard.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [slug]);

  const frontStyle = useMemo(() => {
    if (!style) return {};
    const texture = style.texture ?? 'matte';
    const base = makeBase(style.frontUseGradient, style.frontColor, style.frontGradient);
    return {
      fontFamily: style.fontFamily,
      borderRadius: `${style.radius}px`,
      backgroundColor: style.frontColor,
      ...getTextureStyle(texture, base),
    } as React.CSSProperties;
  }, [style]);

  const backStyle = useMemo(() => {
    if (!style) return {};
    const texture = style.texture ?? 'matte';
    const base = makeBase(style.backUseGradient, style.backColor, style.backGradient);
    return {
      fontFamily: style.fontFamily,
      borderRadius: `${style.radius}px`,
      backgroundColor: style.backColor,
      ...getTextureStyle(texture, base),
    } as React.CSSProperties;
  }, [style]);

  const name = profile?.name?.trim() || 'Digital Card';
  const company = profile?.company?.trim() || '';
  const about = profile?.about?.trim() || '';
  const contactLines = [profile?.phone?.trim(), profile?.email?.trim(), profile?.website?.trim()].filter(Boolean);
  const frontFontColor = style?.frontFontColor ?? '#F8FAFC';
  const backFontColor = style?.backFontColor ?? '#F8FAFC';
  const initial = name.charAt(0).toUpperCase() || 'Q';

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(253,224,71,0.12),transparent_50%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.15),transparent_45%)]" />

      {isLoading ? (
        <div className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Loading VCard...</div>
      ) : error ? (
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">VCard</p>
          <h1 className="text-2xl font-semibold">Unable to load</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">VCard</p>
            <h1 className="text-2xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">Tap to flip</p>
          </div>

          <button
            type="button"
            onClick={() => setSide((prev) => (prev === 'front' ? 'back' : 'front'))}
            className="relative h-[460px] w-[280px] focus:outline-none"
            aria-label="Flip vcard"
          >
            <motion.div
              className="absolute inset-0"
              animate={{ rotateY: side === 'back' ? 180 : 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 flex flex-col justify-between p-6 text-white shadow-xl"
                style={{ ...frontStyle, backfaceVisibility: 'hidden' }}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">VCard</p>
                    <h2 className="text-2xl font-semibold" style={{ color: frontFontColor }}>{name}</h2>
                    {company ? (
                      <p className="text-sm text-white/80" style={{ color: frontFontColor, opacity: 0.8 }}>
                        {company}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 text-lg font-semibold"
                    style={{
                      color: frontFontColor,
                      backgroundImage: style?.profilePhotoDataUrl
                        ? `url(${style.profilePhotoDataUrl})`
                        : undefined,
                      backgroundSize: `${style?.photoZoom ?? 100}%`,
                      backgroundPosition: `${style?.photoX ?? 50}% ${style?.photoY ?? 50}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {!style?.profilePhotoDataUrl ? initial : null}
                  </div>
                </div>
                {contactLines.length > 0 ? (
                  <div className="space-y-2 text-sm text-white/90" style={{ color: frontFontColor, opacity: 0.92 }}>
                    {contactLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ) : null}
                {style?.frontLogoDataUrl ? (
                  <div className="flex justify-end">
                    <img
                      src={style.frontLogoDataUrl}
                      alt="VCard logo"
                      className="h-10 w-10 rounded-lg object-cover border border-white/20"
                    />
                  </div>
                ) : null}
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">
                  Tap to flip
                </p>
              </div>

              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-white shadow-xl"
                style={{
                  ...backStyle,
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                }}
              >
                {style?.backLogoDataUrl ? (
                  <img
                    src={style.backLogoDataUrl}
                    alt="VCard logo"
                    className="h-20 w-20 rounded-xl object-cover border border-white/20"
                  />
                ) : null}
                {about ? (
                  <p className="text-center text-sm leading-relaxed" style={{ color: backFontColor, opacity: 0.9 }}>
                    {about}
                  </p>
                ) : null}
                <div className="text-center text-xs uppercase tracking-[0.4em] text-white/70">
                  <p>Tap to flip</p>
                </div>
              </div>
            </motion.div>
          </button>
        </div>
      )}
    </div>
  );
};

export default VCard;
