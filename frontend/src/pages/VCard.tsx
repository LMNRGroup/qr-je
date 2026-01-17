import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPublicVcard } from '@/lib/api';

type VcardProfile = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  about?: string;
};

type VcardStyle = {
  fontFamily: string;
  radius: number;
  frontColor: string;
  frontGradient: string;
  frontUseGradient: boolean;
  backColor: string;
  backGradient: string;
  backUseGradient: boolean;
  logoDataUrl?: string | null;
  profilePhotoDataUrl?: string | null;
  photoZoom: number;
  photoX: number;
  photoY: number;
};

const makeGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;

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
    return {
      fontFamily: style.fontFamily,
      borderRadius: `${style.radius}px`,
      background: style.frontUseGradient
        ? makeGradient(style.frontColor, style.frontGradient)
        : style.frontColor,
    } as React.CSSProperties;
  }, [style]);

  const backStyle = useMemo(() => {
    if (!style) return {};
    return {
      fontFamily: style.fontFamily,
      borderRadius: `${style.radius}px`,
      background: style.backUseGradient
        ? makeGradient(style.backColor, style.backGradient)
        : style.backColor,
    } as React.CSSProperties;
  }, [style]);

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
            <h1 className="text-2xl font-semibold">{profile?.name ?? 'Digital Card'}</h1>
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
                    <h2 className="text-2xl font-semibold">{profile?.name ?? 'Your Name'}</h2>
                    <p className="text-sm text-white/80">{profile?.company ?? 'Your Company'}</p>
                  </div>
                  <div
                    className="h-16 w-16 rounded-full border border-white/30 bg-white/10"
                    style={{
                      backgroundImage: style?.profilePhotoDataUrl
                        ? `url(${style.profilePhotoDataUrl})`
                        : undefined,
                      backgroundSize: `${style?.photoZoom ?? 100}%`,
                      backgroundPosition: `${style?.photoX ?? 50}% ${style?.photoY ?? 50}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                </div>
                <div className="space-y-2 text-sm text-white/90">
                  <p>{profile?.phone ?? '+1 (555) 123-4567'}</p>
                  <p>{profile?.email ?? 'you@example.com'}</p>
                  <p>{profile?.website ?? 'qrcodestudio.app'}</p>
                </div>
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
                {style?.logoDataUrl ? (
                  <img
                    src={style.logoDataUrl}
                    alt="VCard logo"
                    className="h-20 w-20 rounded-xl object-cover border border-white/20"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-xl border border-white/20 flex items-center justify-center text-xs text-white/70">
                    Logo
                  </div>
                )}
                <div className="text-center text-xs uppercase tracking-[0.4em] text-white/70 space-y-2">
                  <p>{profile?.about ?? 'Tap again to return to the front.'}</p>
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
