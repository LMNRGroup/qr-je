/**
 * Desktop Studio Wizard Component
 * 
 * Desktop-only QR creation wizard that follows the Mobile V2 step-by-step flow.
 * Provides a guided, step-by-step experience with progress indicator and navigation.
 * 
 * This component is scoped to desktop only (>= 1024px) and does not affect Mobile V2.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Link as LinkIcon,
  Phone,
  Mail,
  User,
  File,
  Utensils,
  QrCode,
  Zap,
  Check,
  ChevronRight,
  Paintbrush,
  Sparkles,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QRPreview } from '@/components/QRPreview';
import { ColorPicker } from '@/components/ColorPicker';
import { CornerStylePicker } from '@/components/CornerStylePicker';
import { ErrorCorrectionSelector } from '@/components/ErrorCorrectionSelector';
import { LogoUpload } from '@/components/LogoUpload';
import { SizeSlider } from '@/components/SizeSlider';
import { SocialMediaSelector, type SocialPlatform } from '@/components/SocialMediaSelector';
import { PortalEditor, type PortalLink, type PortalCustomization } from '@/components/PortalEditor';
import {
  QRWizardStep,
  STEP_CONFIG,
  canProceedFromStep,
  getNextStep,
  getPreviousStep,
  getEffectiveStep,
  type QRWizardState,
} from '@/lib/qr-wizard-steps';
import type { QROptions } from '@/types/qr';

interface DesktopStudioWizardProps {
  // State props
  qrMode: 'static' | 'dynamic' | null;
  qrType: 'website' | 'vcard' | 'email' | 'phone' | 'file' | 'menu' | 'social' | 'portal' | null;
  options: QROptions;
  websiteUrl: string;
  emailAddress: string;
  phoneNumber: string;
  fileUrl: string;
  fileName: string;
  vcardName: string;
  vcardSlug: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardWebsite: string;
  vcardCompany: string;
  vcardAbout: string;
  menuFilesCount: number;
  websiteTouched: boolean;
  emailTouched: boolean;
  phoneTouched: boolean;
  fileTouched: boolean;
  fileUploading: boolean;
  fileUploadProgress: number;
  fileUploadError: string | null;
  selectedQuickAction: string | null;
  previewContent: string;
  user: { id: string } | null;
  socialPlatform: SocialPlatform;
  socialHandle: string;
  portalLinks: PortalLink[];
  portalTitle: string;
  portalDescription: string;
  portalTemplate: number;
  portalCustomization: PortalCustomization;
  
  // Handlers
  onModeChange: (mode: 'static' | 'dynamic' | null) => void;
  onTypeChange: (type: 'website' | 'vcard' | 'email' | 'phone' | 'file' | 'menu' | 'social' | 'portal' | null) => void;
  onQuickActionSelect: (action: string | null) => void;
  onWebsiteUrlChange: (url: string) => void;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
  onFileChange: (url: string, name: string) => void;
  onVcardChange: (name: string, slug: string, phone?: string, email?: string, website?: string, company?: string, about?: string) => void;
  onOptionChange: (key: keyof QROptions, value: unknown) => void;
  onDone: () => void; // Called when user clicks Done - parent should show name overlay
  onWebsiteTouched: (touched: boolean) => void;
  onEmailTouched: (touched: boolean) => void;
  onPhoneTouched: (touched: boolean) => void;
  onFileTouched: (touched: boolean) => void;
  onSocialChange: (platform: SocialPlatform, handle: string) => void;
  onPortalChange: (links: PortalLink[], title: string, description: string, template: number, customization: PortalCustomization) => void;
  navigate: (path: string) => void;
  toast: {
    error: (message: string) => void;
    info: (message: string) => void;
  };
  // Overlay handlers
  onShowVcardCustomizer: () => void;
  onShowMenuBuilder: () => void;
  onShowFileUpload: () => void;
}

const QUICK_ACTIONS = [
  { id: 'website', label: 'Website', Icon: LinkIcon },
  { id: 'phone', label: 'Phone', Icon: Phone },
  { id: 'email', label: 'Email', Icon: Mail },
  { id: 'vcard', label: 'VCard', Icon: User },
  { id: 'file', label: 'File', Icon: File },
  { id: 'menu', label: 'Menu', Icon: Utensils },
] as const;

export function DesktopStudioWizard({
  qrMode,
  qrType,
  options,
  websiteUrl,
  emailAddress,
  phoneNumber,
  fileUrl,
  fileName,
  vcardName,
  vcardSlug,
  vcardPhone,
  vcardEmail,
  vcardWebsite,
  vcardCompany,
  vcardAbout,
  menuFilesCount,
  websiteTouched,
  emailTouched,
  phoneTouched,
  fileTouched,
  selectedQuickAction,
  previewContent,
  user,
  onModeChange,
  onTypeChange,
  onQuickActionSelect,
  onWebsiteUrlChange,
  onEmailChange,
  onPhoneChange,
  onFileChange,
  onVcardChange,
  onOptionChange,
  onDone,
  onWebsiteTouched,
  onEmailTouched,
  onPhoneTouched,
  onFileTouched,
  onSocialChange,
  onPortalChange,
  fileUploading,
  fileUploadProgress,
  fileUploadError,
  socialPlatform,
  socialHandle,
  portalLinks,
  portalTitle,
  portalDescription,
  portalTemplate,
  portalCustomization,
  navigate,
  toast,
  onShowVcardCustomizer,
  onShowMenuBuilder,
  onShowFileUpload,
}: DesktopStudioWizardProps) {
  const [currentStep, setCurrentStep] = useState<QRWizardStep>(1);
  const stepRefs = useRef<Record<QRWizardStep, HTMLDivElement | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
  });

  // Build wizard state for validation
  const wizardState: QRWizardState = useMemo(
    () => ({
      step: currentStep,
      mode: qrMode,
      type: qrType,
      quickAction: selectedQuickAction,
      websiteUrl,
      emailAddress,
      phoneNumber,
      fileUrl,
      fileName,
      vcardName,
      vcardSlug,
      menuFilesCount,
      socialPlatform: socialPlatform || '',
      socialHandle,
      portalLinks,
      portalTitle,
      portalDescription,
      portalTemplate,
      portalCustomization,
      websiteTouched,
      emailTouched,
      phoneTouched,
      fileTouched,
      socialTouched: Boolean(socialPlatform || socialHandle),
      portalTouched: false,
    }),
    [
      currentStep,
      qrMode,
      qrType,
      selectedQuickAction,
      websiteUrl,
      emailAddress,
      phoneNumber,
      fileUrl,
      fileName,
      vcardName,
      vcardSlug,
      menuFilesCount,
      socialPlatform,
      socialHandle,
      portalLinks,
      portalTitle,
      portalDescription,
      portalTemplate,
      portalCustomization,
      websiteTouched,
      emailTouched,
      phoneTouched,
      fileTouched,
    ]
  );

  const effectiveStep = getEffectiveStep(wizardState);
  const canProceed = canProceedFromStep(effectiveStep, wizardState);
  // Allow going back from any step > 1 (can always go back to previous step)
  const canGoBack = currentStep > 1;
  const nextStep = getNextStep(effectiveStep, wizardState);
  const prevStep = currentStep > 1 ? (currentStep - 1) as QRWizardStep : null;

  // Auto-advance when quick action is selected
  useEffect(() => {
    if (selectedQuickAction && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [selectedQuickAction, currentStep]);

  // Auto-advance when mode is selected
  useEffect(() => {
    if (qrMode && currentStep === 2) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setCurrentStep(3);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [qrMode, currentStep]);

  // Auto-advance when type is selected (if quick action wasn't used)
  useEffect(() => {
    if (qrType && currentStep === 3 && !selectedQuickAction) {
      // Don't auto-advance, let user fill in details first
    }
  }, [qrType, currentStep, selectedQuickAction]);

  // Scroll to step when it changes
  useEffect(() => {
    const stepElement = stepRefs.current[currentStep];
    if (stepElement) {
      stepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  const handleNext = () => {
    if (!canProceed) return;
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  // Handle Enter key to trigger Next (only if can proceed and not on step 2 or 4)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Enter key
      if (event.key !== 'Enter') return;
      
      // Don't trigger if user is typing in an input, textarea, or button
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.isContentEditable
      ) {
        return;
      }
      
      // Only trigger Next on steps 1 and 3 (not step 2 which auto-advances, not step 4 which has Done)
      if (currentStep === 1 || currentStep === 3) {
        if (canProceed && nextStep) {
          event.preventDefault();
          setCurrentStep(nextStep);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentStep, canProceed, nextStep]);

  const handleBack = () => {
    if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  const handleStepClick = (step: QRWizardStep) => {
    // Only allow clicking on completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handleQuickAction = (actionId: string) => {
    onQuickActionSelect(actionId);
    // Map quick action to type
    const typeMap: Record<string, 'website' | 'vcard' | 'email' | 'phone' | 'file' | 'menu'> = {
      website: 'website',
      phone: 'phone',
      email: 'email',
      vcard: 'vcard',
      file: 'file',
      menu: 'menu',
    };
    const type = typeMap[actionId];
    if (type) {
      onTypeChange(type);
    }
  };

  const handleDone = () => {
    // Trigger parent's name overlay
    onDone();
  };

  const isStepComplete = (step: QRWizardStep): boolean => {
    if (step < currentStep) return true;
    if (step === currentStep) return false;
    return false;
  };

  const getStepIcon = (step: QRWizardStep) => {
    switch (step) {
      case 1:
        return Sparkles; // Select Type
      case 2:
        return QrCode; // QR Mode
      case 3:
        return Edit; // Enter Content
      case 4:
        return Paintbrush; // Customize QR
      default:
        return Sparkles;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Studio</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Create Your QR Code</h2>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] text-primary">Step-by-step</span>
        </div>
        
        {/* Step Progress Bar */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => {
            const StepIcon = getStepIcon(step as QRWizardStep);
            const isActive = currentStep === step;
            const isComplete = isStepComplete(step as QRWizardStep);
            const config = STEP_CONFIG[step as QRWizardStep];
            
            return (
              <div key={step} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => handleStepClick(step as QRWizardStep)}
                  disabled={!isComplete && !isActive}
                  className={`group flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 flex-1 justify-center min-w-0 ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                      : isComplete
                        ? 'border-primary/40 bg-primary/5 text-primary/80 hover:border-primary/60 hover:bg-primary/10 hover:shadow-md cursor-pointer'
                        : 'border-border/50 bg-secondary/40 text-muted-foreground cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                    isComplete 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : isActive 
                        ? 'bg-primary/20 text-primary ring-2 ring-primary/30' 
                        : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] hidden lg:inline truncate">
                    {config.title}
                  </span>
                </button>
                {step < 4 && (
                  <ChevronRight className={`h-4 w-4 mx-1 flex-shrink-0 transition-colors ${
                    isComplete ? 'text-primary/40' : 'text-muted-foreground/30'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Left Column - Steps */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Quick Actions */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                ref={(el) => (stepRefs.current[1] = el)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel rounded-2xl p-6 space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-1">{STEP_CONFIG[1].title}</h3>
                  <p className="text-sm text-muted-foreground">{STEP_CONFIG[1].description}</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleQuickAction(action.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition ${
                        selectedQuickAction === action.id
                          ? 'border-primary/70 bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                      }`}
                    >
                      <action.Icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Or skip to choose mode and type manually
                </p>
              </motion.div>
            )}

            {/* Step 2: Mode Selection */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                ref={(el) => (stepRefs.current[2] = el)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel rounded-2xl p-6 space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-1">QR Mode</h3>
                  <p className="text-sm text-muted-foreground">Choose whether your QR code is static or dynamic.</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    className={`flex-1 border-2 transition ${
                      qrMode === 'static'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/60 border-border text-foreground hover:border-primary/60 hover:bg-secondary/80'
                    }`}
                    onClick={() => {
                      onModeChange('static');
                      if (!selectedQuickAction) {
                        onTypeChange(null);
                      }
                    }}
                  >
                    <QrCode className="mr-2 h-5 w-5" />
                    Static
                  </Button>
                  <Button
                    size="lg"
                    className={`flex-1 border-2 transition ${
                      qrMode === 'dynamic'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/60 border-border text-foreground hover:border-primary/60 hover:bg-secondary/80'
                    }`}
                    onClick={() => {
                      if (!user) {
                        toast.info('Create a free account to access these features no credit card required!');
                        navigate('/login?mode=signup');
                        return;
                      }
                      onModeChange('dynamic');
                      if (!selectedQuickAction) {
                        onTypeChange(null);
                      }
                    }}
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    Dynamic
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Type Selection & Details */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                ref={(el) => (stepRefs.current[3] = el)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel rounded-2xl p-6 space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {qrType === 'vcard' ? 'vCard Contents' : 
                     qrType === 'file' ? 'File Upload' :
                     qrType === 'menu' ? 'Menu Customization' :
                     qrType === 'social' ? 'Social Media' :
                     qrType === 'portal' ? 'Portal Links' :
                     STEP_CONFIG[3].title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {qrType === 'vcard' ? 'Enter your contact information' :
                     qrType === 'file' ? 'Upload a file to share via QR code' :
                     qrType === 'menu' ? 'Upload menu pages, add logo, and customize your menu' :
                     qrType === 'social' ? 'Select a platform and enter your handle' :
                     qrType === 'portal' ? 'Add up to 3 links and customize your portal' :
                     STEP_CONFIG[3].description}
                  </p>
                </div>

                {!selectedQuickAction && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Select QR Type</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { id: 'website', label: 'Website URL', desc: 'Open a URL' },
                        { id: 'vcard', label: 'Virtual Card', desc: 'Share your profile' },
                        { id: 'email', label: 'Email', desc: 'Send an email' },
                        { id: 'phone', label: 'Phone', desc: 'Call a number' },
                        { id: 'file', label: 'File', desc: 'Share a file' },
                        { id: 'menu', label: 'Menu', desc: 'Share a menu' },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => onTypeChange(type.id as any)}
                          className={`p-4 rounded-xl border text-left transition ${
                            qrType === type.id
                              ? 'border-primary/70 bg-primary/10'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="font-semibold">{type.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type-specific input fields */}
                {qrType === 'website' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website URL</label>
                    <Input
                      value={websiteUrl}
                      onChange={(e) => {
                        onWebsiteUrlChange(e.target.value);
                        onWebsiteTouched(true);
                      }}
                      placeholder="https://example.com"
                      className={websiteTouched && !canProceed ? 'border-destructive' : ''}
                    />
                    {websiteTouched && !canProceed && (
                      <p className="text-xs text-destructive">Please enter a valid website URL</p>
                    )}
                  </div>
                )}

                {qrType === 'email' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => {
                        onEmailChange(e.target.value);
                        onEmailTouched(true);
                      }}
                      placeholder="email@example.com"
                      className={emailTouched && !canProceed ? 'border-destructive' : ''}
                    />
                    {emailTouched && !canProceed && (
                      <p className="text-xs text-destructive">Please enter a valid email address</p>
                    )}
                  </div>
                )}

                {qrType === 'phone' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        onPhoneChange(e.target.value);
                        onPhoneTouched(true);
                      }}
                      placeholder="+1 (555) 123-4567"
                      className={phoneTouched && !canProceed ? 'border-destructive' : ''}
                    />
                    {phoneTouched && !canProceed && (
                      <p className="text-xs text-destructive">Please enter a valid phone number</p>
                    )}
                  </div>
                )}

                {qrType === 'file' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Upload a file to share via QR code
                      </p>
                    </div>
                    {fileUploading ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Uploading...</span>
                          <span className="font-semibold text-foreground">{Math.round(fileUploadProgress)}%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/30">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-amber-300 transition-all duration-300 ease-out relative overflow-hidden"
                            style={{ width: `${fileUploadProgress}%` }}
                          >
                            {fileUploadProgress > 0 && fileUploadProgress < 100 && (
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                  backgroundSize: '200% 100%',
                                  animation: 'shimmer 2s linear infinite',
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : fileUploadError ? (
                      <div className="space-y-2">
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                          <p className="text-sm text-destructive font-semibold">Upload Failed</p>
                          <p className="text-xs text-destructive/80 mt-1">{fileUploadError}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={onShowFileUpload}
                          className="w-full"
                          variant="outline"
                        >
                          <File className="mr-2 h-4 w-4" />
                          Try Again
                        </Button>
                      </div>
                    ) : fileUrl ? (
                      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                        <p className="text-sm font-medium">{fileName || 'File uploaded'}</p>
                        <p className="text-xs text-muted-foreground mt-1">File ready</p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={onShowFileUpload}
                        className="w-full"
                      >
                        <File className="mr-2 h-4 w-4" />
                        Upload File
                      </Button>
                    )}
                  </div>
                )}

                {qrType === 'social' && (
                  <div className="space-y-4">
                    <SocialMediaSelector
                      platform={socialPlatform}
                      handle={socialHandle}
                      onPlatformChange={(platform) => onSocialChange(platform, socialHandle)}
                      onHandleChange={(handle) => onSocialChange(socialPlatform, handle)}
                    />
                  </div>
                )}

                {qrType === 'portal' && (
                  <div className="space-y-4">
                    <PortalEditor
                      links={portalLinks}
                      onLinksChange={(links) => onPortalChange(links, portalTitle, portalDescription, portalTemplate, portalCustomization)}
                      title={portalTitle}
                      onTitleChange={(title) => onPortalChange(portalLinks, title, portalDescription, portalTemplate, portalCustomization)}
                      description={portalDescription}
                      onDescriptionChange={(description) => onPortalChange(portalLinks, portalTitle, description, portalTemplate, portalCustomization)}
                      template={portalTemplate}
                      onTemplateChange={(template) => onPortalChange(portalLinks, portalTitle, portalDescription, template, portalCustomization)}
                      customization={portalCustomization}
                      onCustomizationChange={(customization) => onPortalChange(portalLinks, portalTitle, portalDescription, portalTemplate, customization)}
                    />
                  </div>
                )}

                {qrType === 'vcard' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Enter your contact information
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name *</label>
                        <Input
                          value={vcardName}
                          onChange={(e) => onVcardChange(e.target.value, vcardSlug)}
                          placeholder="Your Name"
                          className={!vcardName && canProceed === false ? 'border-destructive' : ''}
                        />
                        {!vcardName && canProceed === false && (
                          <p className="text-xs text-destructive">Name is required</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input
                          type="tel"
                          value={vcardPhone}
                          onChange={(e) => onVcardChange(vcardName, vcardSlug, e.target.value, vcardEmail, vcardWebsite, vcardCompany, vcardAbout)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={vcardEmail}
                          onChange={(e) => onVcardChange(vcardName, vcardSlug, vcardPhone, e.target.value, vcardWebsite, vcardCompany, vcardAbout)}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Website</label>
                        <Input
                          value={vcardWebsite}
                          onChange={(e) => onVcardChange(vcardName, vcardSlug, vcardPhone, vcardEmail, e.target.value, vcardCompany, vcardAbout)}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Company</label>
                        <Input
                          value={vcardCompany}
                          onChange={(e) => onVcardChange(vcardName, vcardSlug, vcardPhone, vcardEmail, vcardWebsite, e.target.value, vcardAbout)}
                          placeholder="Company Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">About</label>
                        <Textarea
                          value={vcardAbout}
                          onChange={(e) => onVcardChange(vcardName, vcardSlug, vcardPhone, vcardEmail, vcardWebsite, vcardCompany, e.target.value)}
                          placeholder="A brief description about yourself"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {qrType === 'menu' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Upload menu pages, add logo, and customize your menu
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={onShowMenuBuilder}
                      className="w-full"
                    >
                      <Utensils className="mr-2 h-4 w-4" />
                      Customize Menu
                    </Button>
                    {menuFilesCount > 0 && (
                      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                        <p className="text-sm font-medium">{menuFilesCount} menu page{menuFilesCount !== 1 ? 's' : ''} uploaded</p>
                        <p className="text-xs text-muted-foreground mt-1">Menu ready</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Customization */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                ref={(el) => (stepRefs.current[4] = el)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-panel rounded-2xl p-6 space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-1">{STEP_CONFIG[4].title}</h3>
                  <p className="text-sm text-muted-foreground">{STEP_CONFIG[4].description}</p>
                </div>

                <div className="space-y-6">
                  {/* vCard Customization - Show for vCard type */}
                  {qrType === 'vcard' && (
                    <div className="space-y-4 pb-6 border-b">
                      <div>
                        <p className="text-sm font-medium mb-2">vCard Customization</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Customize your virtual card design, photo, and styling
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={onShowVcardCustomizer}
                        className="w-full"
                        variant="outline"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Customize vCard Design
                      </Button>
                      {vcardName && (
                        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                          <p className="text-sm font-medium">{vcardName}</p>
                          <p className="text-xs text-muted-foreground mt-1">vCard ready for customization</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <p className="text-sm font-medium">Colors</p>
                    <ColorPicker
                      label="Foreground Color"
                      value={options.fgColor}
                      onChange={(v) => onOptionChange('fgColor', v)}
                    />
                    <ColorPicker
                      label="Background Color"
                      value={options.bgColor}
                      onChange={(v) => onOptionChange('bgColor', v)}
                    />
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-medium">Style</p>
                    <CornerStylePicker
                      value={options.cornerStyle}
                      onChange={(v) => onOptionChange('cornerStyle', v)}
                    />
                    <ErrorCorrectionSelector
                      value={options.errorCorrectionLevel}
                      onChange={(v) => onOptionChange('errorCorrectionLevel', v)}
                    />
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-medium">Logo</p>
                    <LogoUpload
                      logo={options.logo}
                      maxLogoSize={Math.round((options.size - 32) * 0.22)}
                      onLogoChange={(v, meta) => {
                        onOptionChange('logo', v);
                        if (meta) {
                          onOptionChange('logoAspect', meta.aspect);
                          onOptionChange('logoWidth', meta.width);
                          onOptionChange('logoHeight', meta.height);
                        }
                      }}
                    />
                    {options.logo && (
                      <SizeSlider
                        value={options.logoSize || 50}
                        onChange={(v) => onOptionChange('logoSize', v)}
                        min={20}
                        max={100}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons - Hide Next for step 2 (auto-advance), hide for step 4 (Done is in preview) */}
          {currentStep !== 2 && currentStep !== 4 && (
            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={!canGoBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {currentStep < 4 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* Back button only for step 2 */}
          {currentStep === 2 && (
            <div className="flex items-center justify-start gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={!canGoBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Preview</h3>
              <p className="text-xs text-muted-foreground">Live preview of your QR code</p>
            </div>
            <div className="flex items-center justify-center min-h-[300px]">
              {previewContent ? (
                <QRPreview
                  options={options}
                  contentOverride={previewContent}
                  showCaption={false}
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Complete the steps to see preview</p>
                </div>
              )}
            </div>
            
            {/* Done button below preview when on step 4 */}
            {currentStep === 4 && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleDone}
                  disabled={!canProceed}
                  className="w-full gap-2 bg-gradient-primary"
                  size="lg"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
