import { Button } from '@/components/ui/button';
import { NavPageLayout } from '@/components/NavPageLayout';
import { motion } from 'framer-motion';
import { User, Users, Info } from 'lucide-react';
import { useState } from 'react';

interface UpgradePageProps {
  isMobileV2: boolean;
  setShowNavOverlay: (show: boolean) => void;
  selectedPlanComparison: 'pro' | 'command' | null;
  setSelectedPlanComparison: (plan: 'pro' | 'command' | null) => void;
  adaptiveGradientText: string;
}

export function UpgradePage({
  isMobileV2,
  setShowNavOverlay,
  selectedPlanComparison,
  setSelectedPlanComparison,
  adaptiveGradientText,
}: UpgradePageProps) {
  return (
    <NavPageLayout
      sectionLabel="Upgrade"
      title="Our Plans"
      isMobileV2={isMobileV2}
      onTitleClick={() => setShowNavOverlay(true)}
    >
      {isMobileV2 ? (
        <div className="flex flex-col min-h-0 space-y-3">
                <div className="text-center text-xs text-muted-foreground">
                  Current plan: <span className="text-foreground font-semibold">FREE FOREVER PLAN</span>
                </div>
                <div className="relative blur-sm pointer-events-none select-none">
                  <div className="grid gap-4">
                    <div className="glass-panel rounded-2xl p-4 space-y-4 border border-border/60">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Free Forever</p>
                        <h3 className="text-lg font-semibold">Free Forever</h3>
                        <p className="text-xs text-primary uppercase tracking-[0.25em]">Free Forever – No Credit Card</p>
                      </div>
                      <div className="h-4" />
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li><span className="font-semibold text-foreground">1</span> Dynamic QR Code</li>
                        <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
                        <li className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold text-foreground">1</span> Seat
                        </li>
                        <li><span className="font-semibold text-foreground">Basic</span> Intel</li>
                        <li><span className="font-semibold text-foreground">Standard</span> QR Styles</li>
                        <li><span className="font-semibold text-foreground">Community</span> Support</li>
                        <li><span className="font-semibold text-foreground">Watermark</span> Enabled</li>
                        <li className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">1</span>
                          <span className={adaptiveGradientText}>Adaptive QRC™</span>
                          <span className="text-[9px] uppercase tracking-[0.3em] text-foreground">Autodestroy in 7 days</span>
                        </li>
                      </ul>
                    </div>
                    <div className="glass-panel rounded-2xl p-4 space-y-4 border-2 border-primary/80">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pro</p>
                        <span className="rounded-full bg-primary/10 text-primary text-[9px] uppercase tracking-[0.35em] px-2 py-0.5">
                          Most Popular
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold">Pro</h3>
                      <div className="h-4" />
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li><span className="font-semibold text-foreground">25</span> Dynamic QR Codes</li>
                        <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
                        <li className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold text-foreground">1</span> Seat
                        </li>
                        <li><span className="font-semibold text-foreground">Full</span> Intel (analytics)</li>
                        <li><span className="font-semibold text-foreground">Bulk</span> QR Creation</li>
                        <li><span className="font-semibold text-foreground">Custom</span> Colors & Logos</li>
                        <li><span className="font-semibold text-foreground">Preset</span> Loadouts</li>
                        <li><span className="font-semibold text-foreground">Priority</span> Updates</li>
                        <li><span className="font-semibold text-foreground">No</span> Watermark</li>
                        <li><span className={adaptiveGradientText}>Adaptive QRC™</span> Unlimited Scans</li>
                        <li><span className="font-semibold text-foreground">+ $3</span> per extra Adaptive QRC™</li>
                      </ul>
                    </div>
                    <div className="glass-panel rounded-2xl p-4 space-y-4 border border-amber-400/50">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Command</p>
                          <h3 className="text-lg font-semibold">Command</h3>
                        </div>
                        <div className="text-amber-300 text-[10px] uppercase tracking-[0.3em] text-right">
                          Business Plan
                        </div>
                      </div>
                      <div className="h-4" />
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li><span className="font-semibold text-foreground">Unlimited</span> Dynamic QR Codes</li>
                        <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
                        <li className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold text-foreground">5</span> Seats
                        </li>
                        <li><span className="font-semibold text-foreground">Advanced</span> Intel (reports & trends)</li>
                        <li><span className="font-semibold text-foreground">Bulk</span> Creation (High-volume)</li>
                        <li><span className="font-semibold text-foreground">API</span> Access</li>
                        <li><span className="font-semibold text-foreground">Up to 5</span> Team Users</li>
                        <li><span className="font-semibold text-foreground">Shared</span> Arsenal</li>
                        <li><span className="font-semibold text-foreground">Priority</span> Support</li>
                        <li><span className="font-semibold text-foreground">No</span> Watermark</li>
                        <li><span className={adaptiveGradientText}>Adaptive QRC™</span> Unlimited Scans</li>
                        <li><span className="font-semibold text-foreground">+ $2</span> per extra Adaptive QRC™</li>
                      </ul>
                    </div>
                  </div>
                </div>
        </div>
      ) : (
        <section id="upgrade" className="space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Upgrade</p>
            <h2 
              className="text-2xl sm:text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors inline-block"
              onClick={() => setShowNavOverlay(true)}
            >
              Our Plans
            </h2>
            <p className="text-sm text-muted-foreground">Pricing comparison for every team size.</p>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Current plan: <span className="text-foreground font-semibold">FREE FOREVER PLAN</span>
          </div>

      <div className="relative blur-sm pointer-events-none select-none">
        <div className="grid gap-6 lg:grid-cols-3">
          <div
            className="glass-panel rounded-2xl p-6 space-y-5 border border-border/60 transition-transform duration-200 hover:scale-[1.02] hover:border-amber-300/60 hover:shadow-[0_0_25px_rgba(251,191,36,0.15)]"
          >
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Free Forever</p>
              <h3 className="text-2xl font-semibold">Free Forever</h3>
              <p className="text-sm text-primary uppercase tracking-[0.25em]">
                Free Forever – No Credit Card
              </p>
            </div>
            <div className="h-6" />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="font-semibold text-foreground">1</span> Dynamic QR Code</li>
              <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
              <li className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">1</span> Seat
              </li>
              <li><span className="font-semibold text-foreground">Basic</span> Intel</li>
              <li><span className="font-semibold text-foreground">Standard</span> QR Styles</li>
              <li><span className="font-semibold text-foreground">Community</span> Support</li>
              <li><span className="font-semibold text-foreground">Watermark</span> Enabled</li>
              <li className="flex items-center gap-2">
                <span className="font-semibold text-foreground">1</span>
                <span className={adaptiveGradientText}>Adaptive QRC™</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-foreground">Autodestroy in 7 days</span>
                <span className="relative group">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="pointer-events-none absolute left-1/2 top-full mt-2 w-52 -translate-x-1/2 rounded-lg border border-border/70 bg-card px-3 py-2 text-[11px] text-muted-foreground opacity-0 shadow-lg transition group-hover:opacity-100">
                    This is a taste of Pro power. Avoid autodestroy by upgrading to Pro or Command.
                  </span>
                </span>
              </li>
            </ul>
            <Button
              disabled
              className="w-full bg-secondary/60 text-muted-foreground uppercase tracking-[0.2em] text-xs pointer-events-none"
            >
              View Plan
            </Button>
          </div>

          <div
            className="glass-panel rounded-2xl p-6 space-y-5 border-2 border-primary/80 shadow-[0_0_40px_rgba(59,130,246,0.25)] transition-transform duration-200 hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(59,130,246,0.35)] cursor-pointer"
            onClick={() => setSelectedPlanComparison('pro')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === 'Enter' && setSelectedPlanComparison('pro')}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pro</p>
              <span className="rounded-full bg-primary/10 text-primary text-[10px] uppercase tracking-[0.35em] px-3 py-1">
                Most Popular
              </span>
            </div>
            <h3 className="text-2xl font-semibold">Pro</h3>
            <div className="h-6" />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="font-semibold text-foreground">25</span> Dynamic QR Codes</li>
              <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
              <li className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">1</span> Seat
              </li>
              <li><span className="font-semibold text-foreground">Full</span> Intel (analytics)</li>
              <li><span className="font-semibold text-foreground">Bulk</span> QR Creation</li>
              <li><span className="font-semibold text-foreground">Custom</span> Colors & Logos</li>
              <li><span className="font-semibold text-foreground">Preset</span> Loadouts</li>
              <li><span className="font-semibold text-foreground">Priority</span> Updates</li>
              <li><span className="font-semibold text-foreground">No</span> Watermark</li>
              <li><span className={adaptiveGradientText}>Adaptive QRC™</span> Unlimited Scans</li>
              <li><span className="font-semibold text-foreground">+ $3</span> per extra Adaptive QRC™</li>
            </ul>
            <div className="text-xs uppercase tracking-[0.3em] text-primary">Compare</div>
          </div>

          <div
            className="group glass-panel rounded-2xl p-6 space-y-5 border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-transform duration-200 hover:scale-[1.02] hover:border-amber-300/80 hover:shadow-[0_0_35px_rgba(251,191,36,0.35)] cursor-pointer"
            onClick={() => setSelectedPlanComparison('command')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === 'Enter' && setSelectedPlanComparison('command')}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Command</p>
                <h3 className="text-2xl font-semibold">Command</h3>
              </div>
              <div className="text-amber-300 text-[11px] uppercase tracking-[0.3em] text-right">
                <span className="block transition-all duration-200 group-hover:-translate-y-2 group-hover:opacity-0">
                  Business Plan
                </span>
                <span className="block -mt-3 opacity-0 transition-all duration-200 group-hover:opacity-100">
                  The best QRC Plan on Earth...Literally
                </span>
              </div>
            </div>
            <div className="h-6" />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="font-semibold text-foreground">Unlimited</span> Dynamic QR Codes</li>
              <li><span className="font-semibold text-foreground">Unlimited</span> Scans</li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">5</span> Seats
              </li>
              <li><span className="font-semibold text-foreground">Advanced</span> Intel (reports & trends)</li>
              <li><span className="font-semibold text-foreground">Bulk</span> Creation (High-volume)</li>
              <li><span className="font-semibold text-foreground">API</span> Access</li>
              <li><span className="font-semibold text-foreground">Up to 5</span> Team Users</li>
              <li><span className="font-semibold text-foreground">Shared</span> Arsenal</li>
              <li><span className="font-semibold text-foreground">Priority</span> Support</li>
              <li><span className="font-semibold text-foreground">No</span> Watermark</li>
              <li><span className={adaptiveGradientText}>Adaptive QRC™</span> Unlimited Scans</li>
              <li><span className="font-semibold text-foreground">+ $2</span> per extra Adaptive QRC™</li>
            </ul>
            <div className="text-xs uppercase tracking-[0.3em] text-amber-200">Compare</div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 overflow-x-auto blur-sm pointer-events-none select-none">
        <table className="w-full text-sm text-muted-foreground">
          <thead>
            <tr className="text-left border-b border-border/60">
              <th className="py-3 pr-4 text-foreground">Feature</th>
              <th className="py-3 px-4 text-foreground">Free Forever</th>
              <th className="py-3 px-4 text-foreground">Pro</th>
              <th className="py-3 pl-4 text-foreground">Command</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Dynamic QR Codes', '1', '25', 'Unlimited'],
              ['Scans', 'Unlimited', 'Unlimited', 'Unlimited'],
              ['Intel', 'Basic', 'Full', 'Advanced'],
              ['Bulk Creation', '—', 'Included', 'High-volume'],
              ['Custom Colors & Logos', '—', 'Included', 'Included'],
              ['Preset Loadouts', '—', 'Included', 'Included'],
              ['Adaptive QRC™', '1 (Autodestroy 7 Days)', '1 Included', '5 Included'],
              ['Extra Adaptive QRC™', '—', '$3 / mo', '$2 / mo'],
              ['API Access', '—', '—', 'Included'],
              ['Team Users', '—', '—', 'Up to 5'],
              ['Shared Arsenal', '—', '—', 'Included'],
              ['Support', 'Community', 'Priority Updates', 'Priority Support'],
              ['Watermark', 'Enabled', 'No', 'No'],
            ].map(([feature, free, pro, command]) => (
              <tr key={feature} className="border-b border-border/40">
                <td className="py-3 pr-4 text-foreground">{feature}</td>
                <td className="py-3 px-4">{free}</td>
                <td className="py-3 px-4">{pro}</td>
                <td className="py-3 pl-4">{command}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPlanComparison && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setSelectedPlanComparison(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 12 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-3xl space-y-5 blur-sm pointer-events-none select-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Compare vs Free Forever
              </p>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedPlanComparison(null)}
              >
                X
              </button>
            </div>
            {selectedPlanComparison === 'pro' ? (
              <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-2">
                  <p className="text-foreground font-semibold">Free Forever</p>
                  <ul className="space-y-1">
                    <li>1 Dynamic QR Code</li>
                    <li>Basic Intel</li>
                    <li>Watermark Enabled</li>
                    <li><span className={adaptiveGradientText}>Adaptive QRC™</span> autodestroy in 7 days</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-primary/60 bg-primary/10 p-4 space-y-2">
                  <p className="text-foreground font-semibold">Pro</p>
                  <ul className="space-y-1">
                    <li>25 Dynamic QR Codes</li>
                    <li>Full Intel + Bulk Creation</li>
                    <li>No Watermark</li>
                    <li><span className={adaptiveGradientText}>Adaptive QRC™</span> unlimited scans</li>
                    <li>$3 per extra Adaptive QRC™</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-2">
                  <p className="text-foreground font-semibold">Free Forever</p>
                  <ul className="space-y-1">
                    <li>1 Dynamic QR Code</li>
                    <li>Basic Intel</li>
                    <li>Watermark Enabled</li>
                    <li><span className={adaptiveGradientText}>Adaptive QRC™</span> autodestroy in 7 days</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-300/60 bg-amber-400/10 p-4 space-y-2">
                  <p className="text-foreground font-semibold">Command</p>
                  <ul className="space-y-1">
                    <li>Unlimited Dynamic QR Codes</li>
                    <li>Advanced Intel + API Access</li>
                    <li>No Watermark + Priority Support</li>
                    <li><span className={adaptiveGradientText}>Adaptive QRC™</span> unlimited scans</li>
                    <li>$2 per extra Adaptive QRC™</li>
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </div>
        </section>
      )}
    </NavPageLayout>
  );
}
