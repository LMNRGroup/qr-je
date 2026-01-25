import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import { 
  ArrowRight, 
  ArrowLeft, 
  Timer, 
  Users, 
  Plus, 
  X, 
  Loader2,
  Sparkles,
  Check,
  Calendar,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdaptiveConfig } from '@/types/qr';

interface AdaptiveContent {
  id: string;
  url: string;
  label?: string;
}

interface TimeRule {
  id: string;
  contentId: string;
  startTime?: string;
  endTime?: string;
  days?: string[];
  startDate?: string;
  endDate?: string;
}

interface VisitRule {
  id: string;
  contentId: string;
  visitNumber: 1 | 2;
}

type RuleType = 'time' | 'visit' | null;

interface AdaptiveQRCWizardProps {
  user: any;
  userProfile: any;
  onComplete: (config: AdaptiveConfig, qrName: string) => Promise<void>;
  onCancel: () => void;
  existingAdaptiveQRC?: any;
  isMobile?: boolean;
  isMobileV2?: boolean;
}

export const AdaptiveQRCWizard = ({
  user,
  userProfile,
  onComplete,
  onCancel,
  existingAdaptiveQRC,
  isMobile = false,
  isMobileV2 = false,
}: AdaptiveQRCWizardProps) => {
  const [step, setStep] = useState(1);
  const [qrName, setQrName] = useState(existingAdaptiveQRC?.name || 'My Adaptive QRC');
  const [ruleType, setRuleType] = useState<RuleType>(null);
  const [contents, setContents] = useState<AdaptiveContent[]>([]);
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  const [visitRules, setVisitRules] = useState<VisitRule[]>([]);
  const [defaultContentId, setDefaultContentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const qrRef = useRef<QRPreviewHandle>(null);

  const appBaseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');

  // Initialize contents based on rule type
  useEffect(() => {
    if (ruleType === 'time' && contents.length === 0) {
      setContents([
        { id: crypto.randomUUID(), url: '', label: 'Content 1' },
        { id: crypto.randomUUID(), url: '', label: 'Content 2' },
      ]);
    } else if (ruleType === 'visit' && contents.length === 0) {
      setContents([
        { id: crypto.randomUUID(), url: '', label: 'First Visit' },
        { id: crypto.randomUUID(), url: '', label: 'Second Visit' },
      ]);
    }
  }, [ruleType]);

  // Load existing config if editing
  useEffect(() => {
    if (existingAdaptiveQRC?.options?.adaptive) {
      const adaptive = existingAdaptiveQRC.options.adaptive;
      setQrName(existingAdaptiveQRC.name || 'My Adaptive QRC');
      
      if (adaptive.slots && adaptive.slots.length > 0) {
        const loadedContents = adaptive.slots.map((slot: any, index: number) => ({
          id: slot.id || crypto.randomUUID(),
          url: slot.url || '',
          label: `Content ${index + 1}`,
        }));
        setContents(loadedContents);
        if (adaptive.defaultSlot) {
          setDefaultContentId(adaptive.defaultSlot);
        }
      }

      // Determine rule type
      if (adaptive.dateRules && adaptive.dateRules.length > 0) {
        setRuleType('time');
        const loadedRules = adaptive.dateRules.map((rule: any) => ({
          id: crypto.randomUUID(),
          contentId: rule.slot || '',
          startTime: rule.startTime,
          endTime: rule.endTime,
          days: rule.days,
          startDate: rule.startDate,
          endDate: rule.endDate,
        }));
        setTimeRules(loadedRules);
      } else if (adaptive.firstReturn) {
        setRuleType('visit');
        const loadedRules: VisitRule[] = [];
        if (adaptive.firstReturn.firstSlot) {
          loadedRules.push({
            id: crypto.randomUUID(),
            contentId: adaptive.firstReturn.firstSlot,
            visitNumber: 1,
          });
        }
        if (adaptive.firstReturn.returnSlot) {
          loadedRules.push({
            id: crypto.randomUUID(),
            contentId: adaptive.firstReturn.returnSlot,
            visitNumber: 2,
          });
        }
        setVisitRules(loadedRules);
      }
    }
  }, [existingAdaptiveQRC]);

  const canProceed = useMemo(() => {
    if (step === 1) return qrName.trim().length > 0;
    if (step === 2) return ruleType !== null;
    if (step === 3) {
      if (ruleType === 'time') {
        // Need at least 2 contents with valid URLs, max 3
        const validContents = contents.filter(c => c.url.trim().length > 0);
        return validContents.length >= 2 && validContents.length <= 3;
      } else if (ruleType === 'visit') {
        // Need exactly 2 contents with valid URLs
        const validContents = contents.filter(c => c.url.trim().length > 0);
        return validContents.length === 2;
      }
      return false;
    }
    if (step === 4) {
      if (ruleType === 'time') {
        // Need at least one time rule configured
        return timeRules.length > 0 && timeRules.every(rule => {
          const content = contents.find(c => c.id === rule.contentId);
          return content && content.url.trim().length > 0;
        });
      } else if (ruleType === 'visit') {
        // Need both visit rules configured
        return visitRules.length === 2 && visitRules.every(rule => {
          const content = contents.find(c => c.id === rule.contentId);
          return content && content.url.trim().length > 0;
        });
      }
      return false;
    }
    return true;
  }, [step, qrName, ruleType, contents, timeRules, visitRules]);

  const handleAddContent = () => {
    if (ruleType === 'time' && contents.length < 3) {
      setContents([...contents, { 
        id: crypto.randomUUID(), 
        url: '', 
        label: `Content ${contents.length + 1}` 
      }]);
    }
  };

  const handleRemoveContent = (id: string) => {
    if (contents.length > 2) {
      setContents(contents.filter(c => c.id !== id));
      setTimeRules(timeRules.filter(r => r.contentId !== id));
      setVisitRules(visitRules.filter(r => r.contentId !== id));
      if (defaultContentId === id) {
        setDefaultContentId('');
      }
    }
  };

  const handleContentChange = (id: string, field: 'url' | 'label', value: string) => {
    setContents(contents.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleAddTimeRule = () => {
    const validContents = contents.filter(c => c.url.trim().length > 0);
    if (validContents.length > 0) {
      setTimeRules([...timeRules, {
        id: crypto.randomUUID(),
        contentId: validContents[0].id,
        startTime: '09:00',
        endTime: '17:00',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      }]);
    }
  };

  const handleRemoveTimeRule = (id: string) => {
    setTimeRules(timeRules.filter(r => r.id !== id));
  };

  const handleTimeRuleChange = (id: string, field: keyof TimeRule, value: any) => {
    setTimeRules(timeRules.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const handleDayToggle = (ruleId: string, day: string) => {
    setTimeRules(timeRules.map(r => {
      if (r.id !== ruleId) return r;
      const days = r.days || [];
      const newDays = days.includes(day)
        ? days.filter(d => d !== day)
        : [...days, day];
      return { ...r, days: newDays };
    }));
  };

  const handleVisitRuleChange = (visitNumber: 1 | 2, contentId: string) => {
    const existing = visitRules.find(r => r.visitNumber === visitNumber);
    if (existing) {
      setVisitRules(visitRules.map(r => 
        r.visitNumber === visitNumber ? { ...r, contentId } : r
      ));
    } else {
      setVisitRules([...visitRules, { id: crypto.randomUUID(), contentId, visitNumber }]);
    }
  };

  const buildAdaptiveConfig = (): AdaptiveConfig => {
    const validContents = contents.filter(c => c.url.trim().length > 0);
    const slots = validContents.map(c => ({
      id: c.id,
      url: c.url.trim(),
    }));

    const config: AdaptiveConfig = {
      slots,
      defaultSlot: defaultContentId || validContents[0]?.id || '',
    };

    if (ruleType === 'time') {
      config.dateRules = timeRules.map(rule => ({
        slot: rule.contentId,
        startTime: rule.startTime,
        endTime: rule.endTime,
        days: rule.days && rule.days.length > 0 ? rule.days : undefined,
        startDate: rule.startDate || undefined,
        endDate: rule.endDate || undefined,
      }));
    } else if (ruleType === 'visit') {
      const firstRule = visitRules.find(r => r.visitNumber === 1);
      const returnRule = visitRules.find(r => r.visitNumber === 2);
      config.firstReturn = {
        enabled: true,
        firstSlot: firstRule?.contentId || '',
        returnSlot: returnRule?.contentId || '',
      };
    }

    if (userProfile?.timezone) {
      config.timezone = userProfile.timezone;
    }

    return config;
  };

  const handleGenerate = async () => {
    if (!canProceed) return;
    
    setLoading(true);
    try {
      const config = buildAdaptiveConfig();
      await onComplete(config, qrName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create Adaptive QRC';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const previewContent = useMemo(() => {
    if (existingAdaptiveQRC?.shortUrl) {
      return existingAdaptiveQRC.shortUrl.replace('/r/', '/adaptive/');
    }
    return `${appBaseUrl}/adaptive/preview`;
  }, [existingAdaptiveQRC, appBaseUrl]);

  const previewOptions = useMemo(() => ({
    content: previewContent,
    size: 256,
    fgColor: '#D4AF37',
    bgColor: '#1a1a1a',
    errorCorrectionLevel: 'M' as const,
    cornerStyle: 'rounded' as const,
  }), [previewContent]);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#0b0f14] via-[#1a1a1a] to-[#0b0f14] overflow-y-auto">
      {/* Gold gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-amber-900/20 pointer-events-none" />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-amber-500/20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                  Adaptive QRC
                </h1>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
                  {existingAdaptiveQRC ? 'Edit Your Adaptive QRC' : 'Create Your Adaptive QRC'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        s === step
                          ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black scale-110 shadow-lg shadow-amber-500/50'
                          : s < step
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                          : 'bg-secondary/40 text-muted-foreground border border-border'
                      }`}
                    >
                      {s < step ? <Check className="h-5 w-5" /> : s}
                    </div>
                    {s < 5 && (
                      <div
                        className={`h-1 w-8 transition-all ${
                          s < step ? 'bg-amber-500' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Name */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                        Name Your Adaptive QRC
                      </h2>
                      <p className="text-muted-foreground">
                        Give your Adaptive QRC a memorable name
                      </p>
                    </div>
                    <div className="glass-panel rounded-2xl p-8 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                      <Label htmlFor="qrName" className="text-sm font-medium mb-2 block">
                        Adaptive QRC Name
                      </Label>
                      <Input
                        id="qrName"
                        value={qrName}
                        onChange={(e) => setQrName(e.target.value.slice(0, 50))}
                        placeholder="My Adaptive QRC"
                        className="h-14 bg-secondary/40 border-amber-500/30 focus:border-amber-400 text-lg"
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {qrName.length}/50 characters
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Rule Type Selection */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                        Choose Your Rule Type
                      </h2>
                      <p className="text-muted-foreground">
                        Select how your Adaptive QRC will route content
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <button
                        type="button"
                        onClick={() => setRuleType('time')}
                        className={`glass-panel rounded-2xl p-8 border-2 transition-all text-left group ${
                          ruleType === 'time'
                            ? 'border-amber-400 shadow-lg shadow-amber-500/30 bg-amber-500/10'
                            : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-4 rounded-xl ${
                            ruleType === 'time' 
                              ? 'bg-amber-400/20' 
                              : 'bg-secondary/40'
                          }`}>
                            <Timer className={`h-8 w-8 ${
                              ruleType === 'time' 
                                ? 'text-amber-400' 
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Time & Day Rules</h3>
                            <p className="text-sm text-muted-foreground">Route by time, day, or date</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• 2-3 content options</li>
                          <li>• Time-based routing</li>
                          <li>• Day of week selection</li>
                          <li>• Calendar date ranges</li>
                        </ul>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRuleType('visit')}
                        className={`glass-panel rounded-2xl p-8 border-2 transition-all text-left group ${
                          ruleType === 'visit'
                            ? 'border-amber-400 shadow-lg shadow-amber-500/30 bg-amber-500/10'
                            : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-4 rounded-xl ${
                            ruleType === 'visit' 
                              ? 'bg-amber-400/20' 
                              : 'bg-secondary/40'
                          }`}>
                            <Users className={`h-8 w-8 ${
                              ruleType === 'visit' 
                                ? 'text-amber-400' 
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Visit-Based Rules</h3>
                            <p className="text-sm text-muted-foreground">Route by visitor count</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• 2 content options</li>
                          <li>• First visit content</li>
                          <li>• Second visit content</li>
                          <li>• Automatic detection</li>
                        </ul>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Add Contents */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                        Add Your Contents
                      </h2>
                      <p className="text-muted-foreground">
                        {ruleType === 'time' 
                          ? 'Add 2-3 URLs that will be shown based on time and day rules'
                          : 'Add 2 URLs for first and second visits'}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {contents.map((content, index) => (
                        <motion.div
                          key={content.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-panel rounded-2xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/10"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-semibold">
                                {index + 1}
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  {content.label || `Content ${index + 1}`}
                                </Label>
                                {ruleType === 'visit' && (
                                  <p className="text-xs text-muted-foreground">
                                    {index === 0 ? 'First Visit' : 'Second Visit'}
                                  </p>
                                )}
                              </div>
                            </div>
                            {contents.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveContent(content.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Input
                            value={content.url}
                            onChange={(e) => handleContentChange(content.id, 'url', e.target.value)}
                            placeholder="https://example.com"
                            className="h-12 bg-secondary/40 border-amber-500/30 focus:border-amber-400"
                          />
                        </motion.div>
                      ))}
                      {ruleType === 'time' && contents.length < 3 && (
                        <Button
                          variant="outline"
                          onClick={handleAddContent}
                          className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Content ({contents.length}/3)
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Configure Rules */}
                {step === 4 && ruleType === 'time' && (
                  <motion.div
                    key="step4-time"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                        Configure Time Rules
                      </h2>
                      <p className="text-muted-foreground">
                        Set when each content should be shown
                      </p>
                    </div>
                    <div className="space-y-4">
                      {timeRules.map((rule, index) => (
                        <div
                          key={rule.id}
                          className="glass-panel rounded-2xl p-6 border border-amber-500/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Rule {index + 1}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTimeRule(rule.id)}
                              className="text-red-400"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm mb-2 block">Content</Label>
                              <select
                                value={rule.contentId}
                                onChange={(e) => handleTimeRuleChange(rule.id, 'contentId', e.target.value)}
                                className="w-full h-11 rounded-xl border border-amber-500/30 bg-secondary/40 px-3"
                              >
                                {contents.filter(c => c.url.trim()).map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.label || c.url}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm mb-2 block">Start Time</Label>
                                <Input
                                  type="time"
                                  value={rule.startTime || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'startTime', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">End Time</Label>
                                <Input
                                  type="time"
                                  value={rule.endTime || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'endTime', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm mb-2 block">Start Date (Optional)</Label>
                                <Input
                                  type="date"
                                  value={rule.startDate || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'startDate', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">End Date (Optional)</Label>
                                <Input
                                  type="date"
                                  value={rule.endDate || ''}
                                  onChange={(e) => handleTimeRuleChange(rule.id, 'endDate', e.target.value)}
                                  className="bg-secondary/40 border-amber-500/30"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm mb-2 block">Days of Week</Label>
                              <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleDayToggle(rule.id, day)}
                                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                                      rule.days?.includes(day)
                                        ? 'bg-amber-400 text-black font-semibold shadow-lg shadow-amber-500/50'
                                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={handleAddTimeRule}
                        className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Rule
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && ruleType === 'visit' && (
                  <motion.div
                    key="step4-visit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                        Configure Visit Rules
                      </h2>
                      <p className="text-muted-foreground">
                        Assign content for first and second visits
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { number: 1 as const, label: 'First Visit' },
                        { number: 2 as const, label: 'Second Visit' },
                      ].map(({ number, label }) => {
                        const rule = visitRules.find(r => r.visitNumber === number);
                        const contentId = rule?.contentId || '';
                        return (
                          <div
                            key={number}
                            className="glass-panel rounded-2xl p-6 border border-amber-500/20"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-semibold">
                                {number}
                              </div>
                              <h3 className="font-semibold">{label}</h3>
                            </div>
                            <select
                              value={contentId}
                              onChange={(e) => handleVisitRuleChange(number, e.target.value)}
                              className="w-full h-11 rounded-xl border border-amber-500/30 bg-secondary/40 px-3"
                            >
                              <option value="">Select content...</option>
                              {contents.filter(c => c.url.trim()).map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.label || c.url}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Review & Generate */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                        Review & Generate
                      </h2>
                      <p className="text-muted-foreground">
                        Review your Adaptive QRC configuration
                      </p>
                    </div>
                    <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Name</Label>
                        <p className="text-lg font-semibold">{qrName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Rule Type</Label>
                        <p className="text-lg font-semibold capitalize">{ruleType}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Contents</Label>
                        <div className="space-y-2 mt-2">
                          {contents.filter(c => c.url.trim()).map((c, i) => (
                            <div key={c.id} className="flex items-center gap-2 text-sm">
                              <span className="text-amber-400 font-semibold">{i + 1}.</span>
                              <span className="truncate">{c.url}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {ruleType === 'time' && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Time Rules</Label>
                          <p className="text-lg font-semibold">{timeRules.length} rule(s)</p>
                        </div>
                      )}
                      {ruleType === 'visit' && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Visit Rules</Label>
                          <p className="text-lg font-semibold">Configured</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-amber-500/20">
                <Button
                  variant="outline"
                  onClick={() => step > 1 && setStep(step - 1)}
                  disabled={step === 1}
                  className="border-amber-500/30 text-amber-400"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {step < 5 ? (
                  <Button
                    onClick={() => canProceed && setStep(step + 1)}
                    disabled={!canProceed}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold shadow-lg shadow-amber-500/50"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={!canProceed || loading}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-semibold shadow-lg shadow-amber-500/50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Adaptive QRC
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                  <h3 className="text-lg font-semibold mb-4 text-amber-400">Preview</h3>
                  <div className="flex justify-center">
                    <QRPreview
                      ref={qrRef}
                      content={previewContent}
                      options={previewOptions}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
