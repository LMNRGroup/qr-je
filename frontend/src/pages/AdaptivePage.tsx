import { Button } from '@/components/ui/button';
import { NavPageLayout } from '@/components/NavPageLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRHistoryItem } from '@/types/qr';
import { UserProfile } from '@/lib/api';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Globe, Paintbrush, Timer, Users, Info } from 'lucide-react';

interface AdaptivePageProps {
  isMobileV2: boolean;
  user: User | null;
  existingAdaptiveQRC: QRHistoryItem | null;
  setShowAdaptiveWizard: (show: boolean) => void;
  setShowAdaptiveEditor: (show: boolean) => void;
  setShowNavOverlay: (show: boolean) => void;
}

export function AdaptivePage({
  isMobileV2,
  user,
  existingAdaptiveQRC,
  setShowAdaptiveWizard,
  setShowAdaptiveEditor,
  setShowNavOverlay,
}: AdaptivePageProps) {
  const navigate = useNavigate();

  return (
    <NavPageLayout
      sectionLabel="Rules Based QRC"
      title="Adaptive QRC™"
      isMobileV2={isMobileV2}
      onTitleClick={() => setShowNavOverlay(true)}
      titleClassName="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent hover:opacity-80"
    >
      {isMobileV2 ? (
        <div className="flex flex-col min-h-0 space-y-3">

              {/* Main Content */}
              {existingAdaptiveQRC ? (
                <div className="space-y-4 flex-1 min-h-0">
                  {/* Existing Adaptive QRC Card - Vertical Layout for Mobile */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-2xl p-4 border border-amber-500/20"
                  >
                    {/* Header Section - Vertical */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-amber-400/20 border border-amber-400/30">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent truncate">
                            {existingAdaptiveQRC.name || 'My Adaptive QRC™'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Created {new Date(existingAdaptiveQRC.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{existingAdaptiveQRC.shortUrl?.replace('/r/', '/adaptive/') || existingAdaptiveQRC.content}</span>
                      </div>
                      <Button
                        onClick={() => setShowAdaptiveEditor(true)}
                        size="sm"
                        className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold text-xs py-2"
                      >
                        <Paintbrush className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </Button>
                    </div>
                    
                    {/* Quick Stats - Vertical Stack */}
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-amber-500/20">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Contents</p>
                        <p className="text-lg font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                          {existingAdaptiveQRC.options?.adaptive?.slots?.length || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Rule Type</p>
                        <p className="text-lg font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent capitalize">
                          {existingAdaptiveQRC.options?.adaptive?.dateRules ? 'Time' : 
                           existingAdaptiveQRC.options?.adaptive?.firstReturn ? 'Visit' : 'None'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Status</p>
                        <p className="text-lg font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">Active</p>
                      </div>
                    </div>

                    {/* Contents & Rules Display - Mobile Optimized */}
                    {existingAdaptiveQRC.options?.adaptive && (
                      <div className="mt-4 pt-4 border-t border-amber-500/20">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Rules & Contents</p>
                        <div className="space-y-2">
                          {existingAdaptiveQRC.options.adaptive.firstReturn?.enabled && (
                            <>
                              {existingAdaptiveQRC.options.adaptive.firstReturn.firstSlot && (() => {
                                const firstSlot = existingAdaptiveQRC.options.adaptive.slots?.find((s: any) => s.id === existingAdaptiveQRC.options.adaptive.firstReturn.firstSlot);
                                return firstSlot ? (
                                  <div className="flex flex-col py-2 px-3 rounded-lg bg-secondary/40 border border-amber-500/20">
                                    <span className="text-xs font-medium text-muted-foreground mb-0.5">First Visit:</span>
                                    <span className="text-xs font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">{firstSlot.name || 'Unnamed'}</span>
                                  </div>
                                ) : null;
                              })()}
                              {existingAdaptiveQRC.options.adaptive.firstReturn.returnSlot && (() => {
                                const returnSlot = existingAdaptiveQRC.options.adaptive.slots?.find((s: any) => s.id === existingAdaptiveQRC.options.adaptive.firstReturn.returnSlot);
                                return returnSlot ? (
                                  <div className="flex flex-col py-2 px-3 rounded-lg bg-secondary/40 border border-amber-500/20">
                                    <span className="text-xs font-medium text-muted-foreground mb-0.5">Returning Visit:</span>
                                    <span className="text-xs font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">{returnSlot.name || 'Unnamed'}</span>
                                  </div>
                                ) : null;
                              })()}
                            </>
                          )}
                          {existingAdaptiveQRC.options.adaptive.dateRules && existingAdaptiveQRC.options.adaptive.dateRules.length > 0 && (
                            existingAdaptiveQRC.options.adaptive.dateRules.map((rule: any, index: number) => {
                              const slot = existingAdaptiveQRC.options.adaptive.slots?.find((s: any) => s.id === rule.slot);
                              const timeRange = rule.startTime && rule.endTime 
                                ? `${rule.startTime} - ${rule.endTime}`
                                : rule.startTime || rule.endTime || 'All day';
                              const days = rule.days && rule.days.length > 0 
                                ? rule.days.join(', ')
                                : 'Every day';
                              return slot ? (
                                <div key={index} className="flex flex-col py-2 px-3 rounded-lg bg-secondary/40 border border-amber-500/20">
                                  <div className="flex items-start justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">Rule {index + 1} ({days})</span>
                                    <span className="text-[10px] text-muted-foreground/60 ml-2">{timeRange}</span>
                                  </div>
                                  <span className="text-xs font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">{slot.name || 'Unnamed'}</span>
                                </div>
                              ) : null;
                            })
                          )}
                          {(!existingAdaptiveQRC.options.adaptive.firstReturn?.enabled && (!existingAdaptiveQRC.options.adaptive.dateRules || existingAdaptiveQRC.options.adaptive.dateRules.length === 0)) && (
                            <div className="py-2 px-3 rounded-lg bg-secondary/40 border border-amber-500/20">
                              <span className="text-xs text-muted-foreground">No rules configured. Using default content.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Info Card - Mobile Optimized */}
                  <div className="glass-panel rounded-2xl p-4 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-xs font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">Monthly Scan Limit</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your Adaptive QRC™ has a limit of <span className="font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">500 scans per month</span>. 
                          Upgrade to Pro or Command for unlimited scans.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1 min-h-0">
                  {/* Create Card - Mobile Optimized */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-2xl p-6 border border-amber-500/20 text-center"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-400/30">
                          <Sparkles className="h-10 w-10 text-amber-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent mb-2">
                          Create Your Adaptive QRC™
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                          Build a premium QR code that routes content based on time, day, or visitor count. 
                          One Adaptive QRC™ per account with 500 scans per month.
                        </p>
                      </div>
                      {!user ? (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Sign in to create your Adaptive QRC™
                          </p>
                          <Button
                            onClick={() => navigate('/login')}
                            size="sm"
                            className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold text-xs"
                          >
                            Sign In
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowAdaptiveWizard(true)}
                          size="sm"
                          className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black hover:opacity-90 font-bold text-xs py-3"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Create Adaptive QRC™
                        </Button>
                      )}
                    </div>
                  </motion.div>

                  {/* Features - Mobile Stack */}
                  <div className="space-y-3">
                    <div className="glass-panel rounded-2xl p-4 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Timer className="h-5 w-5 text-amber-400" />
                        <h4 className="text-sm font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">Time & Day Rules</h4>
                      </div>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li>• 2-3 content options</li>
                        <li>• Time-based routing</li>
                        <li>• Day of week selection</li>
                        <li>• Calendar date ranges</li>
                      </ul>
                    </div>
                    <div className="glass-panel rounded-2xl p-4 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-amber-400" />
                        <h4 className="text-sm font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">Visit-Based Rules</h4>
                      </div>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        <li>• 2 content options</li>
                        <li>• First visit content</li>
                        <li>• Second visit content</li>
                        <li>• Automatic detection</li>
                      </ul>
                    </div>
                  </div>

                  {/* Info Card - Mobile Optimized */}
                  <div className="glass-panel rounded-2xl p-4 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-xs font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">Limits & Restrictions</p>
                        <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                          <li>• One Adaptive QRC™ per account</li>
                          <li>• 500 scans per month limit (upgrade for unlimited)</li>
                          <li>• Choose either Time rules OR Visit rules (not both)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>
      ) : (
        <section id="adaptive" className="space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="h-8 w-8 text-amber-400" />
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Adaptive QRC™</p>
            </div>
            <h2 
              className="text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity inline-block"
              onClick={() => setShowNavOverlay(true)}
            >
              Adaptive QRC™
            </h2>
            <p className="text-xs uppercase tracking-[0.3em] bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              Premium Content Routing
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              QR Codes, reimagined. <span className="bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent font-semibold">Adaptive QRC™</span> lets you change what a code shows based on time, date,
              and who's scanning — the future of dynamic QR.
            </p>
          </div>

          {/* Main Content */}
          {existingAdaptiveQRC ? (
            <div className="space-y-6">
              {/* Existing Adaptive QRC Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-8 border-2 border-amber-500/30 bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-amber-400/10 dark:from-amber-500/15 dark:via-amber-400/10 dark:to-amber-500/15 shadow-xl shadow-amber-500/20"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-amber-400/20 border border-amber-400/30">
                        <Sparkles className="h-6 w-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-amber-300">{existingAdaptiveQRC.name || 'My Adaptive QRC™'}</h3>
                        <p className="text-sm text-amber-200/70 mt-1">
                          Created {new Date(existingAdaptiveQRC.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-amber-200/80">
                        <Globe className="h-4 w-4" />
                        <span className="truncate max-w-md">{existingAdaptiveQRC.shortUrl?.replace('/r/', '/adaptive/') || existingAdaptiveQRC.content}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowAdaptiveEditor(true)}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold shadow-lg shadow-amber-500/50"
                  >
                    <Paintbrush className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-amber-500/20">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-200/60 mb-1">Contents</p>
                    <p className="text-2xl font-bold text-amber-300">
                      {existingAdaptiveQRC.options?.adaptive?.slots?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-200/60 mb-1">Rule Type</p>
                    <p className="text-2xl font-bold text-amber-300 capitalize">
                      {existingAdaptiveQRC.options?.adaptive?.dateRules ? 'Time' : 
                       existingAdaptiveQRC.options?.adaptive?.firstReturn ? 'Visit' : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-200/60 mb-1">Status</p>
                    <p className="text-2xl font-bold text-amber-300">Active</p>
                  </div>
                </div>
              </motion.div>

              {/* Info Card */}
              <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-400/10 dark:bg-amber-500/15">
                <div className="flex items-start gap-4">
                  <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-200">Monthly Scan Limit</p>
                    <p className="text-sm text-amber-200/70">
                      Your Adaptive QRC™ has a limit of <span className="font-semibold text-amber-300">500 scans per month</span>. 
                      Upgrade to Pro or Command for unlimited scans.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Create Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-12 border-2 border-amber-500/30 bg-gradient-to-br from-amber-400/10 via-amber-300/5 to-amber-400/10 dark:from-amber-500/15 dark:via-amber-400/10 dark:to-amber-500/15 shadow-xl shadow-amber-500/20 text-center"
              >
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex justify-center">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border-2 border-amber-400/40">
                      <Sparkles className="h-16 w-16 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent mb-3">
                      Create Your Adaptive QRC™
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Build a premium QR code that routes content based on time, day, or visitor count. 
                      One Adaptive QRC™ per account with 500 scans per month.
                    </p>
                  </div>
                  {!user ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Sign in to create your Adaptive QRC™
                      </p>
                      <Button
                        onClick={() => navigate('/login')}
                        className="bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold shadow-lg shadow-amber-500/50"
                      >
                        Sign In
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowAdaptiveWizard(true)}
                      size="lg"
                      className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black hover:opacity-90 font-bold text-lg px-8 py-6 shadow-2xl shadow-amber-500/50"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Adaptive QRC™
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Features */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-panel rounded-2xl p-6 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Timer className="h-6 w-6 text-amber-400" />
                    <h4 className="text-lg font-semibold text-amber-300">Time & Day Rules</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• 2-3 content options</li>
                    <li>• Time-based routing</li>
                    <li>• Day of week selection</li>
                    <li>• Calendar date ranges</li>
                  </ul>
                </div>
                <div className="glass-panel rounded-2xl p-6 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-amber-400" />
                    <h4 className="text-lg font-semibold text-amber-300">Visit-Based Rules</h4>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• 2 content options</li>
                    <li>• First visit content</li>
                    <li>• Second visit content</li>
                    <li>• Automatic detection</li>
                  </ul>
                </div>
              </div>

              {/* Info Card */}
              <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-400/10 dark:bg-amber-500/15">
                <div className="flex items-start gap-4">
                  <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-200">Limits & Restrictions</p>
                    <ul className="text-sm text-amber-200/70 space-y-1">
                      <li>• One Adaptive QRC™ per account</li>
                      <li>• 500 scans per month limit (upgrade for unlimited)</li>
                      <li>• Choose either Time rules OR Visit rules (not both)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </NavPageLayout>
  );
}
