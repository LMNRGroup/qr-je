import { ArsenalPanel } from '@/components/ArsenalPanel';
import { QRHistoryItem } from '@/types/qr';
import { UserProfile } from '@/lib/api';
import { Star, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface ArsenalPageProps {
  isMobileV2: boolean;
  isLoggedIn: boolean;
  user: User | null;
  showAdaptiveBanner: boolean;
  setShowAdaptiveBanner: (show: boolean) => void;
  handleAdaptiveMockOpen: () => void;
  handleAdaptiveEdit: (item: QRHistoryItem) => void;
  arsenalRefreshKey: number;
  setArsenalRefreshKey: (fn: (prev: number) => number) => void;
  setArsenalStats: (stats: { total: number; dynamic: number }) => void;
  userProfile: UserProfile | null;
  profileForm: { language: string; timezone: string };
  setShowNavOverlay: (show: boolean) => void;
  adaptiveGradientText: string;
}

export function ArsenalPage({
  isMobileV2,
  isLoggedIn,
  user,
  showAdaptiveBanner,
  setShowAdaptiveBanner,
  handleAdaptiveMockOpen,
  handleAdaptiveEdit,
  arsenalRefreshKey,
  setArsenalRefreshKey,
  setArsenalStats,
  userProfile,
  profileForm,
  setShowNavOverlay,
  adaptiveGradientText,
}: ArsenalPageProps) {
  return (
    <section id="arsenal" className={`space-y-6 ${isMobileV2 ? 'qrc-v2-section' : ''}`}>
      {isMobileV2 ? (
        <div className="mb-0 pb-3">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-1">Arsenal</p>
          <h2 
            className="text-lg font-semibold cursor-pointer hover:text-primary/80 transition-colors"
            onClick={() => setShowNavOverlay(true)}
          >
            Your QR Codes
          </h2>
        </div>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Arsenal</p>
          <h2 
            className="text-2xl sm:text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
            onClick={() => setShowNavOverlay(true)}
          >
            Your QR Codes
          </h2>
        </div>
      )}
      {!isMobileV2 && showAdaptiveBanner && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <button
              type="button"
              onClick={handleAdaptiveMockOpen}
              className="group text-left rounded-2xl border border-border/40 bg-black/90 p-4 shadow-none transition hover:border-amber-300 w-full"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                  <span className={adaptiveGradientText}>Adaptive QRC™</span>
                </span>
                <span className="rounded-full border border-amber-300/50 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-amber-200">
                  Adaptive QRC™
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                <span className={adaptiveGradientText}>Adaptive QRC™</span> · Lunch Routing
              </p>
              <p className="mt-1 text-xs text-white/70">
                Routes by time, returning visitors, and admin IPs.
              </p>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAdaptiveBanner(false);
              }}
              className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label="Close banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      {isLoggedIn ? (
        <ArsenalPanel
          refreshKey={arsenalRefreshKey}
          onStatsChange={setArsenalStats}
          onScansChange={() => {
            // Don't update scanStats here - refreshArsenalStats handles it correctly
            // via getScanSummary('all') which is the authoritative source
            // This callback is kept for ArsenalPanel compatibility but doesn't affect scanStats
          }}
          onRefreshRequest={() => setArsenalRefreshKey((prev) => prev + 1)}
          language={(userProfile?.language ?? profileForm.language) as 'en' | 'es'}
          timeZone={userProfile?.timezone || profileForm.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
          cacheKey={user?.id ?? 'guest'}
          onAdaptiveEdit={handleAdaptiveEdit}
          topContent={isMobileV2 && showAdaptiveBanner ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAdaptiveMockOpen}
                  className="group text-left rounded-2xl border border-border/40 bg-black/90 p-4 shadow-none transition hover:border-amber-300 w-full"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                      <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                      <span className={adaptiveGradientText}>Adaptive QRC™</span>
                    </span>
                    <span className="rounded-full border border-amber-300/50 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-amber-200">
                      Adaptive QRC™
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    <span className={adaptiveGradientText}>Adaptive QRC™</span> · Lunch Routing
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    Routes by time, returning visitors, and admin IPs.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAdaptiveBanner(false);
                  }}
                  className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors z-10"
                  aria-label="Close banner"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : undefined}
        />
      ) : (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">No QR codes yet.</p>
          <p className="text-lg font-semibold">Create your first QR Code to get started.</p>
        </div>
      )}
    </section>
  );
}
