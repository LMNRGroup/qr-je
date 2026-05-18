import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { VcardLandingCard } from '@/components/VcardLandingCard';
import { getPublicVcard } from '@/lib/api';
import { VcardProfile, VcardStyle } from '@/types/qr';

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

  return (
    <div className="min-h-screen bg-[#f6f1ff] px-4 py-8 text-foreground md:px-8 md:py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.14),transparent_30%)]" />

      {isLoading ? (
        <div className="flex min-h-[70vh] items-center justify-center text-sm uppercase tracking-[0.4em] text-muted-foreground">
          Loading VCard...
        </div>
      ) : error ? (
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">VCard</p>
            <h1 className="text-2xl font-semibold">Unable to load</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-[70vh] items-center justify-center">
          <VcardLandingCard
            profile={profile ?? {}}
            style={{ ...fallbackStyle, ...(style ?? {}) }}
            mode="public"
            interactive
            showFooter
          />
        </div>
      )}
    </div>
  );
};

export default VCard;
