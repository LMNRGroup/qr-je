import { ColorPicker } from '@/components/ColorPicker';
import { CornerStylePicker } from '@/components/CornerStylePicker';
import { ErrorCorrectionSelector } from '@/components/ErrorCorrectionSelector';
import { ArsenalPanel } from '@/components/ArsenalPanel';
import { LogoUpload } from '@/components/LogoUpload';
import { MapDots } from '@/components/MapDots';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import { SizeSlider } from '@/components/SizeSlider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { DesktopStudioWizard } from '@/components/DesktopStudioWizard';
import { AdaptiveQRCWizard } from '@/components/AdaptiveQRCWizard';
import { AdaptiveQRCEditor } from '@/components/AdaptiveQRCEditor';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import {
  checkUsernameAvailability,
  createVcard,
  generateQR,
  getQRHistory,
  getScanCounts,
  getScanAreas,
  getScanSummary,
  getScanTrends,
  getUserProfile,
  updateQR,
  updateUserProfile,
  type ScanAreaSummary,
  type UserProfile,
} from '@/lib/api';
import { QROptions, QRHistoryItem, defaultQROptions, AdaptiveConfig, AdaptiveSlot, AdaptiveRule } from '@/types/qr';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Copy,
  Download,
  File,
  Facebook,
  GraduationCap,
  Globe,
  Instagram,
  Link as LinkIcon,
  Loader2,
  Mail,
  Music2,
  Paintbrush,
  BarChart3,
  RefreshCcw,
  Rocket,
  ArrowLeft,
  Info,
  Monitor,
  Phone,
  Plus,
  QrCode,
  Settings,
  Sparkles,
  Star,
  Timer,
  Utensils,
  User,
  UserRound,
  Users,
  Zap,
  X,
} from 'lucide-react';
import { ChangeEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BUILD_STAMP = '2026-01-20T16:52:00Z';
const GUEST_WELCOME_KEY = `qr.guest.welcome.${BUILD_STAMP}`;
const TOUR_GUEST_KEY = `qr.tour.guest.${BUILD_STAMP}`;
const QR_ASSETS_BUCKET = 'qr-assets';
const MAX_MENU_FILE_BYTES = 10 * 1024 * 1024; // 10MB for images (before compression)
const MAX_MENU_PDF_BYTES = 10 * 1024 * 1024; // 10MB for PDFs (before compression)
const MAX_MENU_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB total for menu (before compression)
const MAX_MENU_FILES = 15;
const MAX_VCARD_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB before compression
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB before compression
const MAX_STORAGE_BYTES = 25 * 1024 * 1024; // 25MB total storage limit (compressed size)
const STORAGE_KEY = 'qrc.storage.usage'; // localStorage key for tracking storage

const Index = () => {
  const { user, loading: authLoading, signOut, signUp } = useAuth();
  const isLoggedIn = Boolean(user);
  const [options, setOptions] = useState<QROptions>(defaultQROptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastGeneratedContent, setLastGeneratedContent] = useState('');
  const [showNavOverlay, setShowNavOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'codes' | 'analytics' | 'settings' | 'upgrade' | 'adaptive'>(() => {
    if (typeof window === 'undefined') return 'studio';
    const stored = window.localStorage.getItem('qrc.activeTab');
    if (
      stored === 'studio' ||
      stored === 'codes' ||
      stored === 'analytics' ||
      stored === 'settings' ||
      stored === 'upgrade' ||
      stored === 'adaptive'
    ) {
      return stored;
    }
    return 'studio';
  });
  const [isMobile, setIsMobile] = useState(false);
  const isMobileUiV2 =
    typeof document !== 'undefined' && document.documentElement.dataset.mobileUi === 'v2';
  const isMobileV2 = isMobile && isMobileUiV2;
  const [mobileStudioStep, setMobileStudioStep] = useState<1 | 2 | 3 | 4>(1);
  const [isDialOpen, setIsDialOpen] = useState(false);
  const [dialAngle, setDialAngle] = useState(0);
  const [dialDragging, setDialDragging] = useState(false);
  const [dialSize, setDialSize] = useState(260);
  const [dialHintStage, setDialHintStage] = useState(0);
  const dialStartRef = useRef({ y: 0, angle: 0 });
  const dialAnimationRef = useRef<number | null>(null);
  const dialMomentumRef = useRef<number | null>(null);
  const dialMomentumVelocityRef = useRef(0);
  const dialMomentumLastTimeRef = useRef(0);
  const dialMomentumLastAngleRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const [qrMode, setQrMode] = useState<'static' | 'dynamic' | null>(null);
  const [qrType, setQrType] = useState<'website' | 'vcard' | 'email' | 'phone' | 'file' | 'menu' | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState<number>(0); // Compressed file size in bytes
  const [fileName, setFileName] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState<string>(''); // Cached file data (not uploaded to DB yet)
  const [fileBlob, setFileBlob] = useState<Blob | null>(null); // Cached file blob for PDFs
  const [fileTouched, setFileTouched] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<number>(0);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [showIntroAd, setShowIntroAd] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [showGuestWelcome, setShowGuestWelcome] = useState(false);
  const [guestIntroStep, setGuestIntroStep] = useState(0);
  const [guestCtaStep, setGuestCtaStep] = useState(0);
  const [showAnalyticsIntro, setShowAnalyticsIntro] = useState(false);
  const [analyticsSeen, setAnalyticsSeen] = useState(false);
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [welcomeHeadline, setWelcomeHeadline] = useState('');
  const [welcomeSubline, setWelcomeSubline] = useState('');
  const [showGoodbyeIntro, setShowGoodbyeIntro] = useState(false);
  const [goodbyeHeadline, setGoodbyeHeadline] = useState('');
  const [goodbyeSubline, setGoodbyeSubline] = useState('');
  const welcomeShownRef = useRef<string | null>(null);
  const easterEggEmail = (import.meta.env.VITE_EASTER_EGG_EMAIL ?? '').toLowerCase().trim();
  const easterEggUserId = (import.meta.env.VITE_EASTER_EGG_USER_ID ?? '').trim();
  const showEasterEggBanner = Boolean(
    (easterEggEmail && user?.email && user.email.toLowerCase() === easterEggEmail) ||
    (easterEggUserId && user?.id === easterEggUserId)
  );
  const [quickActionHover, setQuickActionHover] = useState<string | null>(null);
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);
  const [arsenalStats, setArsenalStats] = useState({ total: 0, dynamic: 0 });
  const [scanStats, setScanStats] = useState({ total: 0 });
  const [intelRange, setIntelRange] = useState<'all' | 'today' | '7d' | '30d'>('today');
  const [intelSummary, setIntelSummary] = useState({
    total: 0,
    today: 0,
    rangeTotal: 0,
    avgResponseMs: null as number | null,
  });
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelTrends, setIntelTrends] = useState<Array<{ date: string; count: number }>>([]);
  const [scanAreas, setScanAreas] = useState<ScanAreaSummary[]>([]);
  const [radarLabel, setRadarLabel] = useState('LOOKING FOR SIGNALS');
  const [isSignalsMenuOpen, setIsSignalsMenuOpen] = useState(false);
  const signalsCardRef = useRef<HTMLDivElement>(null);
  const [arsenalRefreshKey, setArsenalRefreshKey] = useState(0);
  const [navHint, setNavHint] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourRect, setTourRect] = useState<DOMRect | null>(null);
  const [tourTooltip, setTourTooltip] = useState<{ top: number; left: number } | null>(null);
  const [tourDialState, setTourDialState] = useState({ opened: false, rotated: false, closed: false });
  const tourDialStartAngleRef = useRef<number | null>(null);
  const tourGuestSeenRef = useRef(false);
  const isNewAccountRef = useRef(false);
  const welcomeTourReadyRef = useRef(false);
  const [showTourComplete, setShowTourComplete] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    username: '',
    timezone: '',
    language: 'en',
    leftie: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    avatarType: 'letter',
    avatarColor: 'purple',
  });
  const [generatedShortUrl, setGeneratedShortUrl] = useState('');
  const [generatedLongUrl, setGeneratedLongUrl] = useState('');
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);
  const [showNameOverlay, setShowNameOverlay] = useState(false);
  const [qrName, setQrName] = useState('QRC Untitled 1');
  const [showVcardCustomizer, setShowVcardCustomizer] = useState(false);
  const [showQrCustomizer, setShowQrCustomizer] = useState(false);
  const [showVcardContents, setShowVcardContents] = useState(false);
  const [showVcardPreview, setShowVcardPreview] = useState(false);
  const [vcardFromContents, setVcardFromContents] = useState(false);
  const [vcardPreviewSide, setVcardPreviewSide] = useState<'front' | 'back'>('front');
  const [showStudioBoot, setShowStudioBoot] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingCreateScroll, setPendingCreateScroll] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [initialProfileForm, setInitialProfileForm] = useState<typeof profileForm | null>(null);
  const [uiErrorBadge, setUiErrorBadge] = useState<{ code: string; message: string } | null>(null);
  const [pullRefreshState, setPullRefreshState] = useState({ visible: false, progress: 0, ready: false });
  const [stageOverlayOpen, setStageOverlayOpen] = useState(false);
  const [activeStageId, setActiveStageId] = useState<'stage1' | 'stage2' | 'stage3'>('stage1');
  const [accountForm, setAccountForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
  });
  const isSpanish = profileForm.language === 'es';
  const t = (en: string, es: string) => (isSpanish ? es : en);
  const isLeftie = Boolean(userProfile?.leftie ?? profileForm.leftie);
  const trendTimeZone =
    userProfile?.timezone || profileForm.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const previewOptions = useMemo(
    () => ({
      ...options,
      size: Math.max(180, Math.round(options.size * 0.75)),
    }),
    [options]
  );
  const trendPoints = useMemo(() => {
    const keyFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: trendTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    // Show actual dates (MM/DD) instead of just weekdays
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: trendTimeZone,
      month: 'short',
      day: 'numeric',
    });
    const map = new Map<string, number>();
    intelTrends.forEach((point) => {
      if (!point.date) return;
      const key = keyFormatter.format(new Date(point.date));
      map.set(key, point.count ?? 0);
    });
    
    // Determine number of days based on intelRange
    let days = 7; // default
    if (intelRange === 'today') {
      days = 1;
    } else if (intelRange === '7d') {
      days = 7;
    } else if (intelRange === '30d') {
      days = 30;
    } else if (intelRange === 'all') {
      // For "all", show last 30 days as a reasonable default
      days = 30;
    }
    
    const today = new Date();
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      const key = keyFormatter.format(date);
      return {
        date,
        count: map.get(key) ?? 0,
        label: dateFormatter.format(date), // Show actual date like "Jan 15"
      };
    });
  }, [intelTrends, trendTimeZone, intelRange]);
  const productionStages = useMemo(
    () => [
      {
        id: 'stage1' as const,
        label: 'Stage 1 · Friends & Family',
        title: 'FRIENDS & FAMILY',
        description:
          'This is where it all begins.\n\n' +
          'Right now, this app is only being shared with a small circle — friends, family, and people we trust enough to be honest with us. You\'re seeing it early, while things are still growing, changing, and sometimes breaking… and that\'s exactly how it\'s supposed to be.\n\n' +
          'At this stage, you\'re not just using the app — you\'re helping shape it. Your feedback, your patience, and even your frustration matter more than you know. Every tap, every comment, every "hey, this feels weird" helps push it forward.\n\n' +
          'We truly couldn\'t start this without you.\n' +
          'Thank you for believing in it early and for being part of the beginning 🤍',
      },
      {
        id: 'stage2' as const,
        label: 'Stage 2 · MVP · Word of Mouth',
        title: 'MVP · Word of Mouth',
        description:
          'Okay… now things start getting interesting.\n\n' +
          'At this stage, we’re officially live in the wild.\n' +
          'People are sharing the app, talking about it, and probably telling their friends way more than we expected.\n\n' +
          'We assume at this point you’ve already said something like:\n' +
          '“Bro, you HAVE to check this out.”\n\n' +
          'This is where analytics really start to matter, features get sharper, and feedback comes in hot.\n\n' +
          'It’s still an MVP — but a dangerous one 😏',
      },
      {
        id: 'stage3' as const,
        label: 'Stage 3 · DE PUERTO RICO PA’L MUNDO',
        title: 'DE PUERTO RICO PA’L MUNDO 🇵🇷🌍',
        description:
          'This is it.\n\n' +
          'No more “early.” No more “testing.”\n\n' +
          'We’re going FULL SEND.\n\n' +
          'The product is solid, the systems are ready, and the app is built to scale — globally.\n\n' +
          'What started small is now moving fast, reaching creators, businesses, and teams everywhere.\n\n' +
          'Built with love, pressure, and long nights.\n\n' +
          'DE PUERTO RICO PA’L MUNDO.\n\n' +
          'Let’s go. 🚀',
      },
    ],
    []
  );
  const activeStage = productionStages.find((stage) => stage.id === activeStageId) ?? productionStages[0];

  const normalizeUiErrorMessage = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message || 'Unexpected error';
    if (value && typeof value === 'object' && 'message' in value) {
      const message = (value as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Unexpected error';
  };

  const getUiErrorCode = useCallback((source: 'error' | 'rejection' | 'custom', message: string) => {
    const lowered = message.toLowerCase();
    if (lowered.includes('failed to fetch') || lowered.includes('network') || lowered.includes('offline')) {
      return 'NET-001';
    }
    if (lowered.includes('timeout')) return 'NET-002';
    if (lowered.includes('not found') || lowered.includes('404')) return 'API-404';
    if (lowered.includes('unauthorized') || lowered.includes('401')) return 'AUTH-401';
    if (lowered.includes('forbidden') || lowered.includes('403')) return 'AUTH-403';
    return source === 'rejection' ? 'APP-REJ' : source === 'custom' ? 'APP-CUS' : 'APP-ERR';
  }, []);

  const pushUiErrorBadge = useCallback((source: 'error' | 'rejection' | 'custom', value: unknown) => {
    const message = normalizeUiErrorMessage(value).slice(0, 140);
    const code = getUiErrorCode(source, message);
    setUiErrorBadge({ code, message });
  }, [getUiErrorCode]);


  const timeZoneOptions = useMemo(
    () => [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Puerto_Rico',
      'America/Mexico_City',
      'Europe/London',
      'Europe/Madrid',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Singapore',
    ],
    []
  );
  type VcardTexture = 'matte' | 'metallic' | 'glossy' | 'paper';
  const [vcard, setVcard] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    company: '',
    about: '',
    slug: '',
  });
  const [vcardStyle, setVcardStyle] = useState({
    fontFamily: 'Arial, sans-serif',
    radius: 18,
    texture: 'matte' as VcardTexture,
    frontColor: '#111827',
    frontGradient: '#2563eb',
    frontUseGradient: true,
    frontFontColor: '#F8FAFC',
    backColor: '#0f172a',
    backGradient: '#4f46e5',
    backUseGradient: true,
    backFontColor: '#F8FAFC',
    frontLogoDataUrl: '',
    backLogoDataUrl: '',
    profilePhotoDataUrl: '',
    photoZoom: 110,
    photoX: 50,
    photoY: 50,
  });
  const [vcardPhotoUploadProgress, setVcardPhotoUploadProgress] = useState<number>(0);
  const [vcardPhotoUploading, setVcardPhotoUploading] = useState(false);
  const [vcardPhotoUploadError, setVcardPhotoUploadError] = useState<string | null>(null);
  const [adaptiveSlotCount, setAdaptiveSlotCount] = useState(2);
  const [adaptiveSlots, setAdaptiveSlots] = useState([
    {
      id: 'A',
      name: 'Morning Menu',
      type: 'url',
      url: 'https://qrcode.luminarapps.com/menu-morning',
      note: 'Breakfast lineup',
    },
    {
      id: 'B',
      name: 'Weekend Promo',
      type: 'url',
      url: 'https://qrcode.luminarapps.com/weekend-promo',
      note: 'Weekend specials',
    },
    {
      id: 'C',
      name: 'Staff View',
      type: 'url',
      url: 'https://qrcode.luminarapps.com/staff',
      note: 'Internal staff dashboard',
    },
  ]);
  const [adaptiveDateRulesEnabled, setAdaptiveDateRulesEnabled] = useState(true);
  const [adaptiveDateRules, setAdaptiveDateRules] = useState([
    {
      id: crypto.randomUUID(),
      slot: 'A',
      startDate: '',
      endDate: '',
      startTime: '08:00',
      endTime: '12:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
  ]);
  const [adaptiveDefaultSlot, setAdaptiveDefaultSlot] = useState<'A' | 'B' | 'C'>('B');
  const [adaptiveFirstReturnEnabled, setAdaptiveFirstReturnEnabled] = useState(true);
  const [adaptiveFirstSlot, setAdaptiveFirstSlot] = useState<'A' | 'B' | 'C'>('A');
  const [adaptiveReturnSlot, setAdaptiveReturnSlot] = useState<'A' | 'B' | 'C'>('B');
  const [adaptiveAdminEnabled, setAdaptiveAdminEnabled] = useState(false);
  const [adaptiveAdminSlot, setAdaptiveAdminSlot] = useState<'A' | 'B' | 'C'>('C');
  const [adaptiveAdminIps, setAdaptiveAdminIps] = useState<string[]>(['192.168.1.24']);
  const [adaptiveAdminIpInput, setAdaptiveAdminIpInput] = useState('');
  const [selectedPlanComparison, setSelectedPlanComparison] = useState<'pro' | 'command' | null>(null);
  const [showAdaptiveWizard, setShowAdaptiveWizard] = useState(false);
  const [showAdaptiveEditor, setShowAdaptiveEditor] = useState(false);
  const [existingAdaptiveQRC, setExistingAdaptiveQRC] = useState<QRHistoryItem | null>(null);
  const [isGeneratingAdaptive, setIsGeneratingAdaptive] = useState(false);
  const [showAdaptiveBanner, setShowAdaptiveBanner] = useState(true);
  const [qrHistory, setQrHistory] = useState<QRHistoryItem[]>([]);
  const photoDragRef = useRef<HTMLDivElement>(null);
  const photoDragState = useRef({ dragging: false, startX: 0, startY: 0, startPhotoX: 50, startPhotoY: 50 });
  const [showMenuBuilder, setShowMenuBuilder] = useState(false);
  const [menuType, setMenuType] = useState<'restaurant' | 'service'>('restaurant');
  const [menuFiles, setMenuFiles] = useState<{ url: string; type: 'image' | 'pdf'; size: number }[]>([]);
  const [menuFlip, setMenuFlip] = useState(false);
  const [menuCarouselIndex, setMenuCarouselIndex] = useState(0);
  const menuSwipeRef = useRef({ dragging: false, startX: 0, currentX: 0 });
  const [menuLogoDataUrl, setMenuLogoDataUrl] = useState('');
  const [menuSocials, setMenuSocials] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
    website: '',
  });
  const [menuBuilderStep, setMenuBuilderStep] = useState<'menu' | 'logo' | 'socials'>('menu');
  const [showMenuOrganize, setShowMenuOrganize] = useState(false);
  const [menuUploadProgress, setMenuUploadProgress] = useState<number>(0);
  const [menuUploading, setMenuUploading] = useState(false);
  const [menuUploadError, setMenuUploadError] = useState<string | null>(null);
  const [menuLogoUploadProgress, setMenuLogoUploadProgress] = useState<number>(0);
  const [menuLogoUploading, setMenuLogoUploading] = useState(false);
  const [menuLogoUploadError, setMenuLogoUploadError] = useState<string | null>(null);
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const menuLogoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<QRPreviewHandle>(null);
  const optionsRef = useRef(options);
  const createSectionRef = useRef<HTMLDivElement>(null);
  const modeSectionRef = useRef<HTMLDivElement>(null);
  const detailsSectionRef = useRef<HTMLDivElement>(null);
  const customizeSectionRef = useRef<HTMLDivElement>(null);
  const customizePreviewRef = useRef<HTMLDivElement>(null);
  const colorsSectionRef = useRef<HTMLDivElement>(null);
  const styleSectionRef = useRef<HTMLDivElement>(null);
  const logoSectionRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const isValidWebsiteUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const candidate = normalizeUrl(trimmed);
    try {
      const url = new URL(candidate);
      const hostname = url.hostname;
      if (!hostname.includes('.')) return false;
      if (!/^[a-z0-9.-]+$/i.test(hostname)) return false;
      const tld = hostname.split('.').pop();
      if (!tld || tld.length < 2) return false;
      return true;
    } catch {
      return false;
    }
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '').trim();

  const isValidPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7;
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48);

  const normalizedWebsiteUrl = useMemo(
    () => normalizeUrl(websiteUrl),
    [websiteUrl]
  );
  const normalizedPhone = useMemo(() => normalizePhone(phoneNumber), [phoneNumber]);
  const isWebsiteValid = useMemo(
    () => isValidWebsiteUrl(websiteUrl),
    [websiteUrl]
  );
  const isEmailValid = useMemo(() => isValidEmail(emailAddress), [emailAddress]);
  const isPhoneValid = useMemo(() => isValidPhone(phoneNumber), [phoneNumber]);
  const vcardSlug = useMemo(
    () => (vcard.slug ? slugify(vcard.slug) : slugify(vcard.name)),
    [vcard.slug, vcard.name]
  );
  const appBaseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');
  const vcardBaseUrl = appBaseUrl;
  const vcardUrl = vcardSlug
    ? `${vcardBaseUrl}/v/${vcardSlug}`
    : '';
  const menuPreviewUrl = menuFiles.length
    ? `${appBaseUrl}/menu-preview`
    : '';
  const menuHasFiles = menuFiles.length > 0;
  const menuHasPdf = menuFiles.length === 1 && menuFiles[0]?.type === 'pdf';
  const menuHasFlip = menuFiles.length === 2 && menuFiles.every((file) => file.type === 'image');
  const menuHasCarousel = menuFiles.length >= 3 && menuFiles.every((file) => file.type === 'image');
  const fallbackContent = qrType === 'website'
    ? (isWebsiteValid ? normalizedWebsiteUrl : '')
    : qrType === 'vcard'
      ? vcardUrl
      : qrType === 'email'
        ? (isEmailValid ? `mailto:${emailAddress.trim()}` : '')
        : qrType === 'phone'
          ? (isPhoneValid ? `tel:${normalizedPhone}` : '')
          : qrType === 'file'
            ? fileUrl
            : qrType === 'menu'
              ? menuPreviewUrl
              : '';
  const generatedContent = generatedShortUrl || fallbackContent;
  const longFormContent = qrType === 'vcard' ? (generatedLongUrl || vcardUrl) : generatedContent;
  const hasSelectedMode = qrMode !== null;
  const hasSelectedType = qrType !== null;
  const canGenerate = hasSelectedMode && (qrType === 'website'
    ? isWebsiteValid
    : qrType === 'vcard'
      ? Boolean(vcardSlug)
      : qrType === 'email'
        ? isEmailValid
        : qrType === 'phone'
          ? isPhoneValid
          : qrType === 'file'
            ? (fileDataUrl || fileBlob || fileUrl.length > 0)
          : qrType === 'menu'
            ? menuFiles.length > 0
            : false);
  const previewUrl = qrType === 'website'
    ? normalizedWebsiteUrl
    : qrType === 'menu'
      ? menuPreviewUrl
      : vcardUrl;
  const canShowPreview = qrType === 'website' && isWebsiteValid;
  const previewContent = hasGenerated
    ? generatedContent
    : hasSelectedType
      ? 'https://preview.qrcodestudio.app'
      : '';
  const isSessionReady = isLoggedIn;

  const parseKind = useCallback((kind?: string | null) => {
    if (!kind) return { mode: 'static', type: 'url' };
    if (kind === 'vcard') return { mode: 'static', type: 'vcard' };
    if (kind === 'dynamic' || kind === 'static') return { mode: kind, type: 'url' };
    if (kind.includes(':')) {
      const [mode, type] = kind.split(':');
      return {
        mode: mode === 'dynamic' ? 'dynamic' : 'static',
        type: type || 'url',
      };
    }
    return { mode: 'static', type: kind };
  }, []);

  const scanNotifyRef = useRef<Record<string, number>>({});
  const scanNotifyPollingRef = useRef(false);
  const pushScanNotification = useCallback((label: string) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('qrc.feed.user');
      const parsed = raw ? (JSON.parse(raw) as Array<{ id: string; message: string; createdAt: number }>) : [];
      const next = Array.isArray(parsed) ? parsed : [];
      next.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: `${label} got a scan!`,
        createdAt: Date.now(),
      });
      const trimmed = next.slice(0, 10);
      window.localStorage.setItem('qrc.feed.user', JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent('qrc:feed-update'));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    if (!isMobile) return;
    if (activeTab === 'codes') return;
    let cancelled = false;
    let interval: number | undefined;
    const storageKey = `qrc.scan.counts.${user.id}`;
    const loadStoredCounts = () => {
      if (typeof window === 'undefined') return {};
      try {
        const raw = window.localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as Record<string, number>) : {};
      } catch {
        return {};
      }
    };
    scanNotifyRef.current = loadStoredCounts();
    const getLabel = (item: QRHistoryItem) => item.name?.trim() || 'QRC';
    const poll = async () => {
      if (cancelled || scanNotifyPollingRef.current) return;
      // Skip polling if tab is hidden to reduce egress
      if (typeof document !== 'undefined' && document.hidden) return;
      scanNotifyPollingRef.current = true;
      try {
        const history = await getQRHistory();
        if (!history.success || cancelled) return;
        const targets = history.data.slice(0, 10);
        
        // Use bulk endpoint instead of per-QR calls
        const bulkCounts = await getScanCounts();
        const results = targets.map((item) => {
          if (!item.random) {
            return { id: item.id, count: 0, label: getLabel(item) };
          }
          const key = `${item.id}:${item.random}`;
          const count = bulkCounts[key] ?? 0;
          return { id: item.id, count, label: getLabel(item) };
        });
        
        const prev = scanNotifyRef.current;
        results.forEach(({ id, count, label }) => {
          const previous = prev[id];
          if (previous !== undefined && count > previous) {
            pushScanNotification(label);
          }
        });
        const nextCounts = results.reduce<Record<string, number>>((acc, { id, count }) => {
          acc[id] = count;
          return acc;
        }, {});
        scanNotifyRef.current = nextCounts;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(nextCounts));
        }
      } catch {
        // ignore polling errors
      } finally {
        scanNotifyPollingRef.current = false;
      }
    };
    poll();
    // Reduced from 15s to 60s to reduce egress usage
    interval = window.setInterval(poll, 60000);
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [activeTab, isLoggedIn, isMobile, pushScanNotification, user?.id]);

  // Recalculate storage from actual QR codes in DB
  const recalculateStorageFromDB = useCallback(async () => {
    if (!isSessionReady || typeof window === 'undefined') return;
    try {
      const response = await getQRHistory();
      if (!response.success || !response.data) return;
      
      let totalStorage = 0;
      for (const item of response.data) {
        const opts = item.options;
        
        // File QR
        if (opts.fileSize && typeof opts.fileSize === 'number') {
          totalStorage += opts.fileSize;
        }
        
        // Menu files
        if (opts.menuFiles && Array.isArray(opts.menuFiles)) {
          for (const file of opts.menuFiles) {
            if (file && typeof file === 'object' && 'size' in file && typeof file.size === 'number') {
              totalStorage += file.size;
            }
          }
        }
        
        // Menu logo
        if (opts.menuLogoSize && typeof opts.menuLogoSize === 'number') {
          totalStorage += opts.menuLogoSize;
        }
        
        // Adaptive QRC files
        if (opts.adaptive && typeof opts.adaptive === 'object' && 'slots' in opts.adaptive) {
          const slots = opts.adaptive.slots;
          if (Array.isArray(slots)) {
            for (const slot of slots) {
              if (slot && typeof slot === 'object' && 'fileSize' in slot && typeof slot.fileSize === 'number') {
                totalStorage += slot.fileSize;
              }
            }
          }
        }
      }
      
      // Update localStorage with actual DB storage
      window.localStorage.setItem(STORAGE_KEY, String(totalStorage));
      window.dispatchEvent(new CustomEvent('qrc:storage-update', { detail: totalStorage }));
    } catch (error) {
      console.warn('[Index] Failed to recalculate storage from DB:', error);
    }
  }, [isSessionReady]);

  const refreshArsenalStats = useCallback(async () => {
    if (!isSessionReady) {
      setArsenalStats({ total: 0, dynamic: 0 });
      setScanStats({ total: 0 });
      return;
    }
    try {
      const [response, summary] = await Promise.all([getQRHistory(), getScanSummary('all')]);
      if (response.success) {
        setQrHistory(response.data);
        const dynamicCount = response.data.filter(
          (item) => parseKind(item.kind ?? null).mode === 'dynamic'
        ).length;
        setArsenalStats({ total: response.data.length, dynamic: dynamicCount });
        
        // Find existing Adaptive QRC
        const adaptiveQRC = response.data.find((item) => {
          return item.kind === 'adaptive' || 
                 (item.options && typeof item.options === 'object' && 
                  'adaptive' in item.options && item.options.adaptive !== null);
        });
        setExistingAdaptiveQRC(adaptiveQRC || null);
        
        // Recalculate storage from actual DB files
        await recalculateStorageFromDB();
      }
      if (Number.isFinite(summary.total)) {
        setScanStats({ total: summary.total });
      }
    } catch {
      // ignore stats errors
    }
  }, [isSessionReady, parseKind, recalculateStorageFromDB]);

  useEffect(() => {
    refreshArsenalStats();
  }, [refreshArsenalStats, arsenalRefreshKey]);

  const intelRangeLabels: Record<'all' | 'today' | '7d' | '30d', string> = {
    all: 'All time',
    today: 'Today',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
  };

  useEffect(() => {
    if (!isSessionReady) return;
    if (activeTab !== 'analytics') return;
    // Don't poll if tab is hidden to reduce egress
    if (typeof document !== 'undefined' && document.hidden) return;
    let cancelled = false;
    let pollTimer: number | undefined;
    const timeZone =
      userProfile?.timezone ||
      profileForm.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fetchSummary = async (showLoading: boolean) => {
      // Skip if tab is hidden to reduce egress
      if (typeof document !== 'undefined' && document.hidden && !showLoading) return;
      if (showLoading) setIntelLoading(true);
      try {
        const summary = await getScanSummary(intelRange, timeZone);
        if (cancelled) return;
        setIntelSummary({
          total: summary.total,
          today: summary.today,
          rangeTotal: summary.rangeTotal,
          avgResponseMs: summary.avgResponseMs,
        });
      } catch (error) {
        if (cancelled) return;
        if (showLoading) {
          const message = error instanceof Error ? error.message : 'Failed to load scan summary';
          toast.error(message);
        } else {
          console.warn('[intel] refresh failed', error);
        }
      } finally {
        if (cancelled) return;
        if (showLoading) setIntelLoading(false);
      }
    };
    fetchSummary(true);
    // Reduced from 30s to 120s to significantly reduce egress usage
    pollTimer = window.setInterval(() => fetchSummary(false), 120000);
    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
    };
    // Only depend on activeTab and isSessionReady - use refs for timezone/range to avoid restarting interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSessionReady]);

  useEffect(() => {
    if (!isSessionReady) return;
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    const timeZone =
      userProfile?.timezone ||
      profileForm.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Determine number of days based on intelRange
    let days = 7; // default
    if (intelRange === 'today') {
      days = 1;
    } else if (intelRange === '7d') {
      days = 7;
    } else if (intelRange === '30d') {
      days = 30;
    } else if (intelRange === 'all') {
      // For "all", show last 30 days as a reasonable default
      days = 30;
    }
    
    getScanTrends(days, timeZone)
      .then((points) => {
        if (cancelled) return;
        setIntelTrends(points);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load scan trends';
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, intelRange, isSessionReady, profileForm.timezone, userProfile?.timezone]);

  useEffect(() => {
    if (!isSessionReady) return;
    if (activeTab !== 'analytics') return;
    // Don't poll if tab is hidden to reduce egress
    if (typeof document !== 'undefined' && document.hidden) return;
    let cancelled = false;
    let pollTimer: number | undefined;
    const fetchAreas = async (showToast: boolean) => {
      // Skip if tab is hidden to reduce egress
      if (typeof document !== 'undefined' && document.hidden && !showToast) return;
      try {
        const areas = await getScanAreas();
        if (cancelled) return;
        setScanAreas(areas);
      } catch (error) {
        if (cancelled) return;
        if (showToast) {
          const message = error instanceof Error ? error.message : 'Failed to load scan areas';
          toast.error(message);
        } else {
          console.warn('[intel] area refresh failed', error);
        }
      }
    };
    fetchAreas(true);
    // Reduced from 60s to 180s (3 minutes) to significantly reduce egress usage
    pollTimer = window.setInterval(() => fetchAreas(false), 180000);
    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [activeTab, isSessionReady]);

  useEffect(() => {
    if (!isSignalsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!signalsCardRef.current) return;
      if (signalsCardRef.current.contains(event.target as Node)) return;
      setIsSignalsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSignalsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSignalsMenuOpen]);

  useEffect(() => {
    const baseText = 'LOOKING FOR SIGNALS';
    if (scanAreas.length > 0) {
      setRadarLabel(baseText);
      return;
    }
    let cancelled = false;
    let flickerTimer: number | undefined;
    let resetTimer: number | undefined;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const schedule = () => {
      const delay = 840 + Math.random() * 1120;
      flickerTimer = window.setTimeout(() => {
        if (cancelled) return;
        const indexes: number[] = [];
        const count = Math.random() > 0.6 ? 2 : 1;
        while (indexes.length < count) {
          const idx = Math.floor(Math.random() * baseText.length);
          if (baseText[idx] === ' ') continue;
          if (!indexes.includes(idx)) indexes.push(idx);
        }
        const next = baseText
          .split('')
          .map((char, index) =>
            indexes.includes(index) ? chars[Math.floor(Math.random() * chars.length)] : char
          )
          .join('');
        setRadarLabel(next);
        resetTimer = window.setTimeout(() => {
          if (cancelled) return;
          setRadarLabel(baseText);
        }, 260);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (flickerTimer) window.clearTimeout(flickerTimer);
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, [scanAreas.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => {
      setIsMobile(media.matches);
      const size = Math.max(240, Math.min(window.innerWidth * 0.78, 320));
      setDialSize(size * 1.1);
    };
    update();
    media.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Detect Android for banner header fix
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      document.body.classList.add('android');
    } else {
      document.body.classList.remove('android');
    }
    return () => {
      document.body.classList.remove('android');
    };
  }, []);

  const updateOption = useCallback(<K extends keyof QROptions>(key: K, value: QROptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    setOptions((prev) => (
      prev.content === generatedContent ? prev : { ...prev, content: generatedContent }
    ));
  }, [generatedContent]);

  useEffect(() => {
    setHasGenerated(Boolean(generatedContent) && generatedContent === lastGeneratedContent);
  }, [generatedContent, lastGeneratedContent]);

  useEffect(() => {
    if (authLoading) return;
    const introSessionKey = 'qr.intro.session';
    if (sessionStorage.getItem(introSessionKey)) {
      setIsBooting(false);
      setShowIntroAd(false);
      setShowStudioBoot(false);
      return;
    }

    const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
    const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    const isNewUser = Boolean(createdAt && lastSignIn && Math.abs(lastSignIn - createdAt) < 2 * 60 * 1000);
    if (!isNewUser) {
      setIsBooting(false);
      setShowIntroAd(false);
      setShowStudioBoot(false);
      sessionStorage.setItem(introSessionKey, 'true');
      return;
    }

    setShowIntroAd(true);
    setIsBooting(true);
    setShowStudioBoot(false);
    const steps = [0, 1, 2, 3];
    const timers = steps.map((step, index) =>
      window.setTimeout(() => setIntroStep(step), index * 650)
    );
    let studioTimer: number | null = null;
    const doneTimer = window.setTimeout(() => {
      setShowIntroAd(false);
      setShowStudioBoot(true);
      studioTimer = window.setTimeout(() => {
        setShowStudioBoot(false);
        setIsBooting(false);
      }, 1100);
      sessionStorage.setItem(introSessionKey, 'true');
    }, 2600);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
      if (studioTimer) {
        window.clearTimeout(studioTimer);
      }
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || isBooting) return;
    if (!user) {
      welcomeShownRef.current = null;
      isNewAccountRef.current = false;
      return;
    }
    if (welcomeShownRef.current === user.id) return;
    const sessionKey = `qr.welcome.session.${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const metadata = user.user_metadata as Record<string, string> | undefined;
    const rawName = metadata?.first_name || metadata?.full_name || metadata?.name || '';
    const fallbackName = user.email ? user.email.split('@')[0] : 'there';
    const firstName = (rawName.trim() ? rawName.split(' ')[0] : fallbackName).trim();
    const displayName = firstName
      ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`
      : 'there';

    const firstLoginKey = `qr.welcome.first.${user.id}`;
    const wasWelcomed = Boolean(localStorage.getItem(firstLoginKey));
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : null;
    const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : null;
    const isNewAccount = createdAt && lastSignInAt
      ? Math.abs(lastSignInAt - createdAt) < 2 * 60 * 1000
      : false;
    isNewAccountRef.current = isNewAccount;
    if (!wasWelcomed && isNewAccount) {
      setWelcomeHeadline(`Yo ${displayName}!`);
    setWelcomeSubline('Not everyone makes great decisions… but today you did.\nWelcome to QR Code Studio.');
      localStorage.setItem(firstLoginKey, 'true');
      welcomeTourReadyRef.current = true;
    } else {
      setWelcomeHeadline(`Welcome back, ${displayName}!`);
      setWelcomeSubline('');
      welcomeTourReadyRef.current = false;
    }
    setShowWelcomeIntro(true);
    welcomeShownRef.current = user.id;
    sessionStorage.setItem(sessionKey, 'true');
  }, [authLoading, isBooting, user]);

  useEffect(() => {
    if (!showWelcomeIntro) return;
    const timer = window.setTimeout(() => setShowWelcomeIntro(false), 2600);
    return () => window.clearTimeout(timer);
  }, [showWelcomeIntro]);


  useEffect(() => {
    if (!isLoggedIn) {
      setUserProfile(null);
      return;
    }
    let isActive = true;
    getUserProfile()
      .then((profile) => {
        if (!isActive) return;
        setUserProfile(profile);
        const updatedForm = {
          fullName: profile.name ?? '',
          username: profile.username ?? '',
          timezone: profile.timezone ?? '',
          language: profile.language ?? 'en',
          leftie: profile.leftie ?? false,
          avatarType: profile.avatarType ?? 'letter',
          avatarColor: profile.avatarColor ?? 'purple',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
        setProfileForm(updatedForm);
        setInitialProfileForm(updatedForm);
        setAvatarDirty(false);
        if (!profile.timezone) {
          const autoZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (autoZone) {
            updateUserProfile({ timezone: autoZone }).catch(() => null);
            setProfileForm((prev) => ({ ...prev, timezone: autoZone }));
          }
        }
      })
      .catch(() => null);
    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);


  const handleSignOut = useCallback(async () => {
    if (user?.id) {
      sessionStorage.removeItem(`qr.welcome.session.${user.id}`);
    }
    welcomeShownRef.current = null;
    const metadata = user?.user_metadata as Record<string, string> | undefined;
    const rawName = metadata?.first_name || metadata?.full_name || metadata?.name || '';
    const fallbackName = user?.email ? user.email.split('@')[0] : 'friend';
    const firstName = (rawName.trim() ? rawName.split(' ')[0] : fallbackName).trim();
    const displayName = firstName
      ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`
      : 'friend';
    setGoodbyeHeadline(`Goodbye, ${displayName}`);
    setGoodbyeSubline('We will keep your Arsenal ready for your return.');
    setShowGoodbyeIntro(true);
    setShowAccountModal(false);
    // Wait 2 seconds for animation, then sign out
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await signOut();
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.startsWith('qrc.auth')) {
        localStorage.removeItem(key);
      }
    });
    setShowWelcomeIntro(false);
    navigate('/login');
  }, [signOut, user, navigate]);


  const lastQrTypeRef = useRef<string | null>(null);
  useEffect(() => {
    const previousType = lastQrTypeRef.current;
    if (previousType && previousType !== qrType) {
      setGeneratedShortUrl('');
      setGeneratedLongUrl('');
      // Reset QR name to default when type changes
      const defaultName = qrType === 'file' ? fileName || 'File QR' : 'QRC Untitled 1';
      setQrName(defaultName);
    }
    lastQrTypeRef.current = qrType;
  }, [qrType, fileName]);

  useEffect(() => {
    if (qrType !== 'vcard') return;
    if (generatedLongUrl && generatedLongUrl !== vcardUrl) {
      setGeneratedShortUrl('');
      setGeneratedLongUrl('');
    }
  }, [qrType, vcardUrl, generatedLongUrl]);

  useEffect(() => {
    if (authLoading || isBooting) return;
    if (user) {
      setShowGuestWelcome(false);
      return;
    }

    if (localStorage.getItem(GUEST_WELCOME_KEY)) {
      setShowGuestWelcome(false);
      return;
    }

    setShowGuestWelcome(true);
    localStorage.setItem(GUEST_WELCOME_KEY, 'true');
  }, [authLoading, isBooting, user]);

  useEffect(() => {
    if (!showGuestWelcome) return;
    setGuestIntroStep(0);
    setGuestCtaStep(0);
    const steps = [0, 1, 2, 3];
    const timers = steps.map((step, index) =>
      window.setTimeout(() => setGuestIntroStep(step), index * 650)
    );
    const revealSignUpTimer = window.setTimeout(() => {
      setGuestCtaStep(1);
    }, 2600);
    const revealLoginTimer = window.setTimeout(() => {
      setGuestCtaStep(2);
    }, 3600);
    const revealContinueTimer = window.setTimeout(() => {
      setGuestCtaStep(3);
    }, 4400);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(revealSignUpTimer);
      window.clearTimeout(revealLoginTimer);
      window.clearTimeout(revealContinueTimer);
    };
  }, [showGuestWelcome]);

  useEffect(() => {
    if (activeTab !== 'analytics') {
      setShowAnalyticsIntro(false);
      return;
    }

    if (analyticsSeen) {
      setShowAnalyticsIntro(false);
      return;
    }

    setShowAnalyticsIntro(true);
    setAnalyticsSeen(true);
    const timer = window.setTimeout(() => {
      setShowAnalyticsIntro(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [activeTab, analyticsSeen]);

  useEffect(() => {
    if (activeTab !== 'studio') {
      setSelectedQuickAction(null);
      // Clean up file cache when leaving studio tab
      if (fileDataUrl || fileBlob || fileUrl) {
        // Revoke blob URL if it's a blob URL (for PDF previews)
        if (fileUrl && fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fileUrl);
        }
        setFileDataUrl('');
        setFileBlob(null);
        setFileUrl('');
        setFileName('');
        setFileSize(0);
        setFileTouched(false);
      }
    }
  }, [activeTab, fileDataUrl, fileBlob, fileUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authLoading) return;
    window.localStorage.setItem('qrc.activeTab', activeTab);
  }, [activeTab, authLoading]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setProfileForm({
        fullName: '',
        username: '',
        timezone: '',
        language: 'en',
        leftie: false,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        avatarType: 'letter',
        avatarColor: 'purple',
      });
      setAvatarDirty(false);
      return;
    }
    const metadata = user.user_metadata as Record<string, string> | undefined;
    const fullName = metadata?.full_name || metadata?.name || '';
    setProfileForm((prev) => ({ ...prev, fullName }));
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!user) return;
    const storedTheme = window.localStorage.getItem(`theme:${user.id}`);
    if (!storedTheme) return;
    const root = document.documentElement;
    if (storedTheme === 'dark') {
      root.classList.add('dark');
    } else if (storedTheme === 'light') {
      root.classList.remove('dark');
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showVcardCustomizer) {
        setShowVcardCustomizer(false);
        return;
      }
      if (showMenuBuilder) {
        setShowMenuBuilder(false);
    setMenuBuilderStep('menu'); // Reset step when closing
        return;
      }
      if (showQrCustomizer) {
        setShowQrCustomizer(false);
        return;
      }
      if (showVcardContents) {
        setShowVcardContents(false);
        return;
      }
      if (showAccountModal) {
        setShowAccountModal(false);
        return;
      }
      if (selectedPlanComparison) {
        setSelectedPlanComparison(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlanComparison, showAccountModal, showGuestWelcome, showMenuBuilder, showVcardCustomizer, showQrCustomizer, showVcardContents]);

  useEffect(() => {
    if (!pendingCreateScroll) return;
    if (activeTab !== 'studio') return;

    const timer = window.setTimeout(() => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingCreateScroll(false);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [activeTab, pendingCreateScroll]);

  const handleGenerate = async (name?: string | null) => {
    if (!hasSelectedMode) {
      toast.error('Choose Static or Dynamic to continue');
      return;
    }
    // Require authentication for dynamic QR codes
    if (qrMode === 'dynamic' && !user) {
      toast.info('Create a free account to access these features no credit card required!');
      navigate('/login?mode=signup');
      return;
    }
    if (!canGenerate) {
      const message = qrType === 'website'
        ? 'Please enter a valid website URL'
        : qrType === 'email'
          ? 'Please enter a valid email address'
          : qrType === 'phone'
            ? 'Please enter a valid phone number'
            : qrType === 'file'
              ? 'Please upload a file to continue'
            : qrType === 'menu'
              ? 'Please upload menu pages to continue'
              : 'Please add a name or profile slug';
      toast.error(message);
      return;
    }
    if (!longFormContent.trim()) {
      toast.error('Please enter content to generate');
      return;
    }
    const optionsSnapshot = { ...optionsRef.current };
    
    // Build adaptive configuration if enabled
    const adaptiveConfig = buildAdaptiveConfig();
    const isAdaptiveQR = Boolean(adaptiveConfig);
    
    // Merge adaptive config into options if enabled
    const finalOptions = isAdaptiveQR
      ? {
          ...optionsSnapshot,
          adaptive: adaptiveConfig,
        }
      : optionsSnapshot;
    
    setIsGenerating(true);
    // Declare file variables outside IIFE for use in adaptive logic
    let finalFileUrl = fileUrl;
    let finalFileSize = fileSize;
    
    try {
      const response = qrType === 'vcard'
        ? await createVcard({
          slug: vcardSlug || null,
          publicUrl: vcardUrl,
          data: {
            profile: vcard,
            style: vcardStyle,
          },
          options: {
            ...finalOptions,
            content: vcardUrl,
          },
        })
        : await (async () => {
          // For file QR, upload file to DB now (only when generating)
          finalFileUrl = fileUrl;
          finalFileSize = fileSize;
          
          if (qrType === 'file' && (fileDataUrl || fileBlob)) {
            try {
              // Create a File object from cached data for upload
              let fileToUpload: File;
              if (fileBlob) {
                fileToUpload = new File([fileBlob], fileName || 'file', { type: fileBlob.type || 'application/pdf' });
              } else if (fileDataUrl) {
                const blob = dataUrlToBlob(fileDataUrl);
                fileToUpload = new File([blob], fileName || 'file', { type: blob.type || 'image/png' });
              } else {
                throw new Error('No file data available');
              }
              
              const result = await uploadQrAsset(fileToUpload, 'files', fileDataUrl || undefined);
              if (!result?.url) {
                throw new Error('Upload returned no URL.');
              }
              finalFileUrl = result.url;
              finalFileSize = result.size;
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to upload file';
              toast.error(`File upload failed: ${message}`);
              throw error;
            }
          }
          
          return generateQR(
            qrType === 'file' || qrType === 'menu'
              ? `${appBaseUrl}/pending/${crypto.randomUUID()}`
              : longFormContent,
            qrType === 'file'
              ? {
                ...finalOptions,
                fileName: fileName || 'File QR',
                fileUrl: finalFileUrl,
                fileSize: finalFileSize,
              }
            : qrType === 'menu'
              ? {
                ...finalOptions,
                menuFiles,
                menuType,
                menuLogoDataUrl,
                menuSocials,
              }
              : finalOptions,
            `${qrMode ?? 'static'}:${qrType === 'website' ? 'url' : qrType ?? 'url'}`,
            name || (qrType === 'file' ? fileName || 'File QR' : null)
          );
        })();
      if (response.success) {
        if ('url' in response && response.url) {
          // For vCard, update the URL with the name and adaptive config if provided
          if (qrType === 'vcard' && response.url.id) {
            try {
              const updatePayload: { name?: string; options?: Record<string, unknown> } = {};
              if (name) {
                updatePayload.name = name;
              }
              if (isAdaptiveQR && adaptiveConfig) {
                updatePayload.options = {
                  ...finalOptions,
                  content: vcardUrl,
                };
              }
              if (Object.keys(updatePayload).length > 0) {
                await updateQR(response.url.id, updatePayload);
              }
            } catch (error) {
              console.warn('Failed to update vCard:', error);
            }
          }
          
          // For adaptive QR codes, convert /r/ URL to /adaptive/ URL
          let qrContent = response.url.shortUrl;
          if (isAdaptiveQR && response.url.id && response.url.random) {
            qrContent = `${appBaseUrl}/adaptive/${response.url.id}/${response.url.random}`;
            // Update the QR code content in the database to point to adaptive endpoint
            try {
              await updateQR(response.url.id, {
                options: {
                  ...finalOptions,
                  content: qrContent,
                },
              });
            } catch (error) {
              console.warn('Failed to update QR with adaptive URL:', error);
            }
          }
          
          setGeneratedShortUrl(response.url.shortUrl);
          setGeneratedLongUrl(response.url.targetUrl);
          setLastGeneratedContent(qrContent);
        } else if ('data' in response && response.data) {
          let nextItem = response.data;
          if ((qrType === 'file' || qrType === 'menu') && response.data.shortUrl) {
            const match = response.data.shortUrl.match(/\/r\/([^/]+)\/([^/]+)$/);
            if (match) {
              const [, id, random] = match;
              const targetUrl = qrType === 'file'
                ? `${appBaseUrl}/file/${id}/${random}`
                : `${appBaseUrl}/menu/${id}/${random}`;
              
              // Build options with adaptive config if enabled
              const updateOptions = qrType === 'file'
                ? {
                    ...finalOptions,
                    fileName: fileName || 'File QR',
                    fileUrl: finalFileUrl,
                    fileSize: finalFileSize,
                  }
                : {
                    ...finalOptions,
                    menuFiles,
                    menuType,
                    menuLogoDataUrl,
                    menuSocials,
                  };
              
              const updateResponse = await updateQR(id, {
                targetUrl,
                name: name || (qrType === 'file' ? fileName || 'File QR' : null),
                options: updateOptions,
                kind: `${qrMode ?? 'static'}:${qrType}`,
              });
              if (updateResponse.success && updateResponse.data) {
                nextItem = updateResponse.data;
              }
              
              // For adaptive QR codes, convert /r/ URL to /adaptive/ URL
              if (isAdaptiveQR) {
                const adaptiveUrl = `${appBaseUrl}/adaptive/${id}/${random}`;
                // Update QR code content to point to adaptive endpoint
                try {
                  await updateQR(id, {
                    options: {
                      ...updateOptions,
                      content: adaptiveUrl,
                    },
                  });
                  nextItem = {
                    ...nextItem,
                    shortUrl: adaptiveUrl,
                    content: adaptiveUrl,
                  };
                } catch (error) {
                  console.warn('Failed to update QR with adaptive URL:', error);
                }
              }
            }
          } else if (isAdaptiveQR && response.data.id && response.data.random) {
            // For non-file/menu adaptive QR codes, convert /r/ URL to /adaptive/ URL
            const adaptiveUrl = `${appBaseUrl}/adaptive/${response.data.id}/${response.data.random}`;
            try {
              await updateQR(response.data.id, {
                options: {
                  ...finalOptions,
                  content: adaptiveUrl,
                },
              });
              nextItem = {
                ...nextItem,
                shortUrl: adaptiveUrl,
                content: adaptiveUrl,
              };
            } catch (error) {
              console.warn('Failed to update QR with adaptive URL:', error);
            }
          }
          
          const qrValue = isAdaptiveQR && nextItem.shortUrl?.includes('/adaptive/')
            ? nextItem.shortUrl
            : (nextItem.shortUrl ?? nextItem.content);
          setGeneratedShortUrl(nextItem.shortUrl ?? '');
          setLastGeneratedContent(qrValue);
        }
        toast.success('QR code generated!');
        setHasGenerated(true);
        setArsenalRefreshKey((prev) => prev + 1);
        // refreshArsenalStats() will handle storage recalculation internally
        setShowGenerateSuccess(true);
        setShowNameOverlay(false);
        resetCreateFlow();
        setMobileCustomizeStep(false);
        if (isMobileV2) {
          setMobileStudioStep(1);
        }
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate QR code';
      if (message.includes('VITE_API_BASE_URL')) {
        toast.error('API base URL is missing. Add VITE_API_BASE_URL to frontend/.env.local.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const resetCreateFlow = useCallback(() => {
    setQrMode(null);
    setQrType(null);
    setSelectedQuickAction(null);
    setWebsiteUrl('');
    setWebsiteTouched(false);
    setEmailAddress('');
    setEmailTouched(false);
    setPhoneNumber('');
    setPhoneTouched(false);
    setFileUrl('');
    setFileName('');
    setFileSize(0);
    setFileDataUrl('');
    setFileBlob(null);
    setFileTouched(false);
    setMenuFiles([]);
    setMenuType('restaurant');
    setMenuLogoDataUrl('');
    setMenuSocials({
      instagram: '',
      facebook: '',
      tiktok: '',
      website: '',
    });
    // Reset adaptive state
    setAdaptiveSlotCount(2);
    setAdaptiveSlots([
      {
        id: 'A',
        name: 'Morning Menu',
        type: 'url',
        url: 'https://qrcode.luminarapps.com/menu-morning',
        note: 'Breakfast lineup',
      },
      {
        id: 'B',
        name: 'Weekend Promo',
        type: 'url',
        url: 'https://qrcode.luminarapps.com/weekend-promo',
        note: 'Weekend specials',
      },
      {
        id: 'C',
        name: 'Staff View',
        type: 'url',
        url: 'https://qrcode.luminarapps.com/staff',
        note: 'Internal staff dashboard',
      },
    ]);
    setAdaptiveDateRulesEnabled(true);
    setAdaptiveDateRules([
      {
        id: crypto.randomUUID(),
        slot: 'A',
        startDate: '',
        endDate: '',
        startTime: '08:00',
        endTime: '12:00',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      },
    ]);
    setAdaptiveDefaultSlot('B');
    setAdaptiveFirstReturnEnabled(true);
    setAdaptiveFirstSlot('A');
    setAdaptiveReturnSlot('B');
    setAdaptiveAdminEnabled(false);
    setAdaptiveAdminSlot('C');
    setAdaptiveAdminIps(['192.168.1.24']);
    setAdaptiveAdminIpInput('');
    setMenuFlip(false);
    setMenuCarouselIndex(0);
    setVcard({
      name: '',
      phone: '',
      email: '',
      website: '',
      company: '',
      about: '',
      slug: '',
    });
    setVcardStyle({
      fontFamily: 'Arial, sans-serif',
      radius: 18,
      texture: 'matte' as VcardTexture,
      frontColor: '#111827',
      frontGradient: '#2563eb',
      frontUseGradient: true,
      frontFontColor: '#F8FAFC',
      backColor: '#0f172a',
      backGradient: '#4f46e5',
      backUseGradient: true,
      backFontColor: '#F8FAFC',
      frontLogoDataUrl: '',
      backLogoDataUrl: '',
      profilePhotoDataUrl: '',
      photoZoom: 110,
      photoX: 50,
      photoY: 50,
    });
    setVcardPreviewSide('front');
    setShowVcardCustomizer(false);
    setShowVcardPreview(false);
    setShowMenuBuilder(false);
    setMenuBuilderStep('menu'); // Reset step when closing
    setOptions({ ...defaultQROptions });
    setGeneratedShortUrl('');
    setGeneratedLongUrl('');
    setLastGeneratedContent('');
    setHasGenerated(false);
    setIsGenerating(false);
    setMobileCustomizeStep(false);
  }, []);

  const handleDownload = async (format: 'png' | 'svg' | 'jpeg' | 'pdf') => {
    if (!qrRef.current) return;
    try {
      if (format === 'png') await qrRef.current.downloadPng();
      else if (format === 'svg') await qrRef.current.downloadSvg();
      else if (format === 'jpeg') await qrRef.current.downloadJpeg();
      else await qrRef.current.downloadPdf();
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleCopy = async () => {
    if (!qrRef.current) return;
    const success = await qrRef.current.copyToClipboard();
    if (success) {
      toast.success('Copied to clipboard!');
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleExportCsv = (range: 'day' | 'week' | 'month') => {
    const now = new Date();
    const rangeLabel = range === 'day' ? 'Today' : range === 'week' ? 'This Week' : 'This Month';
    const rows = [
      ['Range', rangeLabel],
      ['Exported At', now.toISOString()],
      [],
      ['Time', 'Region', 'Scans', 'Device'],
      ['08:12', 'Frankfurt', '48', 'Mobile'],
      ['10:04', 'Singapore', '36', 'Mobile'],
      ['12:18', 'Dallas', '21', 'Desktop'],
      ['16:42', 'Toronto', '18', 'Mobile'],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intel-${range}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleStartStatic = () => {
    setQrMode(null);
    setQrType('website');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setSelectedQuickAction('website');
    setPendingCreateScroll(true);
    if (isMobileV2) {
      setMobileStudioStep(2);
    }
  };

  const handleStartVcard = () => {
    if (!user) {
      toast.info('Create a free account to access these features no credit card required!');
      navigate('/login?mode=signup');
      return;
    }
    setQrMode(null);
    setQrType('vcard');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setSelectedQuickAction('vcard');
    setPendingCreateScroll(true);
    if (isMobileV2) {
      setMobileStudioStep(2);
    }
  };

  const handleStartEmail = () => {
    setQrMode(null);
    setQrType('email');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setSelectedQuickAction('email');
    setPendingCreateScroll(true);
    if (isMobileV2) {
      setMobileStudioStep(2);
    }
  };

  const handleStartPhone = () => {
    setQrMode(null);
    setQrType('phone');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setFileTouched(false);
    setSelectedQuickAction('phone');
    setPendingCreateScroll(true);
    if (isMobileV2) {
      setMobileStudioStep(2);
    }
  };

  const handleStartFile = () => {
    if (!user) {
      toast.info('Create a free account to access these features no credit card required!');
      navigate('/login?mode=signup');
      return;
    }
    setQrMode(null);
    setQrType('file');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setFileTouched(false);
    setSelectedQuickAction('file');
    setPendingCreateScroll(true);
    if (isMobileV2) {
      setMobileStudioStep(2);
    }
  };

  const handleStartMenu = () => {
    if (!user) {
      toast.info('Create a free account to access these features no credit card required!');
      navigate('/login?mode=signup');
      return;
    }
    setQrMode(null);
    setQrType('menu');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setFileTouched(false);
    setSelectedQuickAction('menu');
    setPendingCreateScroll(true);
    if (isMobileV2) {
      setMobileStudioStep(2);
    }
  };

  const handleClearStudioCache = async () => {
    if (typeof window === 'undefined') return;
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      toast.success('Cache cleared. Reloading…');
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear cache';
      toast.error(message);
    }
  };

  const handleCopyUrl = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleAccountCreate = async () => {
    if (accountLoading) return;
    if (!isSupabaseConfigured) {
      toast.error('Account creation requires a connected backend.');
      return;
    }
    if (!accountForm.fullName.trim() || !accountForm.username.trim() || !accountForm.email.trim() || !accountForm.password) {
      toast.error('Please complete all required fields.');
      return;
    }
    if (!acceptedTerms) {
      toast.error('Please accept the Terms & Conditions.');
      return;
    }
    setAccountLoading(true);
    const { error } = await signUp(accountForm.email.trim(), accountForm.password, {
      fullName: accountForm.fullName.trim(),
      username: accountForm.username.trim(),
    });
    setAccountLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Account created! Check your email to confirm.');
    setShowAccountModal(false);
  };

  const handleProfileSave = async () => {
    if (!isLoggedIn || !user) return;
    if (profileSaving) return;
    if (!isSupabaseConfigured) {
      toast.error('Profile updates require a connected backend.');
      return;
    }
    setProfileSaving(true);
    if (profileForm.newPassword || profileForm.currentPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword || !profileForm.newPassword) {
        toast.error('Enter your current and new password.');
        setProfileSaving(false);
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        toast.error('New passwords do not match.');
        setProfileSaving(false);
        return;
      }
      if (!user.email) {
        toast.error('Unable to verify password without an email.');
        setProfileSaving(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: profileForm.currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect.');
        setProfileSaving(false);
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({
        password: profileForm.newPassword,
      });
      if (passwordError) {
        toast.error(passwordError.message);
        setProfileSaving(false);
        return;
      }
    }

    try {
      const metadataUpdates: Record<string, unknown> = {};
      if (profileForm.fullName.trim()) {
        metadataUpdates.data = { full_name: profileForm.fullName.trim() };
      }
      if (Object.keys(metadataUpdates).length > 0) {
        const { error } = await supabase.auth.updateUser(metadataUpdates);
        if (error) {
          toast.error(error.message);
          return;
        }
      }

      const themeKey = user?.id ? `theme:${user.id}` : 'theme:default';
      const theme = localStorage.getItem(themeKey);
      const shouldPersistAvatar = avatarDirty || hasSavedAvatar;
      const updated = await updateUserProfile({
        name: profileForm.fullName.trim() || null,
        username: profileForm.username.trim() || null,
        timezone: profileForm.timezone || null,
        language: profileForm.language || 'en',
        theme: theme || null,
        leftie: profileForm.leftie,
        ...(shouldPersistAvatar
          ? {
              avatarType: profileForm.avatarType || null,
              avatarColor: profileForm.avatarColor || null,
            }
          : {}),
      });
      setUserProfile(updated);
      const savedForm = {
        fullName: updated.name ?? '',
        username: updated.username ?? '',
        timezone: updated.timezone ?? '',
        language: updated.language ?? 'en',
        leftie: updated.leftie ?? false,
        avatarType: updated.avatarType ?? 'letter',
        avatarColor: updated.avatarColor ?? 'purple',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
      setProfileForm(savedForm);
      setInitialProfileForm(savedForm);
      setAvatarDirty(false);
      setUsernameStatus('idle');
      setUsernameError('');
      toast.success('Preferences saved!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences.';
      toast.error(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUsernameCheck = async () => {
    if (!profileForm.username.trim()) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }
    setUsernameStatus('checking');
    try {
      const result = await checkUsernameAvailability(profileForm.username.trim());
      if (result.available) {
        setUsernameStatus('available');
        setUsernameError('');
      } else if (result.message) {
        setUsernameStatus('invalid');
        setUsernameError(result.message);
      } else {
        setUsernameStatus('taken');
        setUsernameError('Username is already taken.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check username.';
      setUsernameStatus('invalid');
      setUsernameError(message);
    }
  };

  const vcardFontOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Garamond', value: 'Garamond, "Times New Roman", serif' },
  ];
  const vcardTextureOptions: { id: VcardTexture; label: string }[] = [
    { id: 'matte', label: 'Matte' },
    { id: 'metallic', label: 'Metallic' },
    { id: 'glossy', label: 'Glossy' },
    { id: 'paper', label: 'Paper' },
  ];
  const avatarOptions = [
    { id: 'neutral', label: 'Neutral', Icon: User },
    { id: 'cap', label: 'Cap', Icon: GraduationCap },
    { id: 'bun', label: 'Bun', Icon: UserRound },
    { id: 'letter', label: 'Letter' },
  ] as const;
  const avatarColors = [
    { id: 'purple', label: 'Purple', bg: 'bg-violet-500', text: 'text-white' },
    { id: 'graphite', label: 'Graphite', bg: 'bg-slate-800', text: 'text-white' },
    { id: 'blue', label: 'Blue', bg: 'bg-blue-600', text: 'text-white' },
    { id: 'gold', label: 'Gold', bg: 'bg-amber-400', text: 'text-slate-900' },
  ] as const;
  const tourSteps = useMemo(() => {
    const steps = [
      {
        id: 'quick-actions',
        target: 'quick-actions',
        title: 'Quick Actions',
        description: 'Start fast with presets for websites, calls, emails, files, menus, and vcards.',
      },
      {
        id: 'overview',
        target: 'overview',
        title: 'Overview',
        description: 'Tap stats to jump into your Arsenal or Intel analytics.',
      },
      {
        id: 'studio-guide',
        target: 'studio-guide',
        title: 'Studio Guide',
        description: 'Your 3-step QR flow at a glance.',
      },
      {
        id: 'dark-mode',
        target: 'dark-mode',
        title: 'Dark Mode',
        description: 'Toggle the theme any time.',
      },
      {
        id: 'profile-icon',
        target: 'profile-icon',
        title: 'Profile',
        description: 'Manage preferences and sign out from here.',
      },
    ];

    if (isMobile) {
      steps.push({
        id: 'dial-controls',
        target: 'dial-open',
        title: 'Dial Controls',
        description: 'This button opens your navigation dial.',
      });
    }

    steps.push({
      id: 'cta',
      target: 'quick-actions',
      title: 'Create Your First QR',
      description: 'Pick a quick action to get started, or tap Done.',
    });

    return steps;
  }, [isMobile]);
  const currentTourStep = tourActive ? tourSteps[tourStepIndex] : null;
  const isTourDialStep = currentTourStep?.id === 'dial-controls';
  const isTourCtaStep = currentTourStep?.id === 'cta';
  const tourTargetId = useMemo(() => {
    if (!currentTourStep) return null;
    if (currentTourStep.id === 'dial-controls' && isDialOpen) {
      return 'dial-panel';
    }
    return currentTourStep.target;
  }, [currentTourStep, isDialOpen]);

  const makeVcardGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;
  const makeVcardBase = (useGradient: boolean, color: string, gradient: string) =>
    useGradient ? makeVcardGradient(color, gradient) : `linear-gradient(0deg, ${color}, ${color})`;
  const getVcardTextureStyle = (texture: VcardTexture, base: string) => {
    switch (texture) {
      case 'metallic':
        return {
          backgroundImage:
            'linear-gradient(120deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.25) 70%, rgba(255,255,255,0.25) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 6px), ' +
            base,
          backgroundBlendMode: 'screen, overlay, normal',
          boxShadow:
            'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.35)',
        };
      case 'glossy':
        return {
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.2)), ' +
            base,
          backgroundBlendMode: 'screen, overlay, normal',
          boxShadow:
            'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -10px 16px rgba(0,0,0,0.3)',
        };
      case 'paper':
        return {
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), rgba(255,255,255,0) 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px), ' +
            base,
          backgroundBlendMode: 'soft-light, overlay, normal',
          filter: 'saturate(0.95)',
        };
      case 'matte':
      default:
        return {
          backgroundImage:
            'linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px), ' +
            base,
          backgroundBlendMode: 'soft-light, overlay, normal',
          filter: 'saturate(0.9)',
        };
    }
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  };

  // Get current storage usage (compressed sizes)
  const getStorageUsage = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  };

  // Update storage usage (add compressed file size)
  const addStorageUsage = (bytes: number) => {
    if (typeof window === 'undefined') return;
    try {
      const current = getStorageUsage();
      const updated = current + bytes;
      localStorage.setItem(STORAGE_KEY, String(updated));
      window.dispatchEvent(new CustomEvent('qrc:storage-update', { detail: updated }));
    } catch {
      // Ignore storage errors
    }
  };

  // Remove storage usage (when file is deleted)
  const removeStorageUsage = (bytes: number) => {
    if (typeof window === 'undefined') return;
    try {
      const current = getStorageUsage();
      const updated = Math.max(0, current - bytes);
      localStorage.setItem(STORAGE_KEY, String(updated));
      window.dispatchEvent(new CustomEvent('qrc:storage-update', { detail: updated }));
    } catch {
      // Ignore storage errors
    }
  };

  // Check if upload would exceed storage limit
  const checkStorageLimit = (additionalBytes: number): { allowed: boolean; current: number; limit: number; available: number } => {
    const current = getStorageUsage();
    const limit = MAX_STORAGE_BYTES;
    const available = limit - current;
    const allowed = current + additionalBytes <= limit;
    return { allowed, current, limit, available };
  };

  // Compress PDF (basic compression - reduce quality if possible)
  const compressPdf = async (file: File): Promise<Blob> => {
    // For PDFs, we can't really compress them client-side effectively
    // But we can at least validate and return the file
    // In production, you might want server-side PDF compression
    return file;
  };

  const uploadQrAsset = async (file: File, folder: 'files' | 'menus' | 'logos', dataUrl?: string): Promise<{ url: string; size: number } | null> => {
    if (!isSupabaseConfigured) {
      throw new Error('Storage is not configured yet.');
    }
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be signed in to upload files. Please sign in and try again.');
    }
    
    try {
      const extension = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'png');
      const fileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = `${folder}/${fileName}`;
      
      // Use compressed dataUrl if provided, otherwise use original file
      let payload: Blob | File;
      let compressedSize: number;
      
      if (dataUrl) {
        const blob = dataUrlToBlob(dataUrl);
        payload = blob;
        compressedSize = blob.size;
      } else {
        payload = file;
        compressedSize = file.size;
      }
      
      // Check storage limit before upload
      const storageCheck = checkStorageLimit(compressedSize);
      if (!storageCheck.allowed) {
        const availableMB = (storageCheck.available / (1024 * 1024)).toFixed(1);
        const neededMB = (compressedSize / (1024 * 1024)).toFixed(1);
        throw new Error(`Storage limit exceeded. You have ${availableMB}MB available, but need ${neededMB}MB. Please delete some files or upgrade your plan.`);
      }
      
      const { error, data: uploadData } = await supabase.storage
        .from(QR_ASSETS_BUCKET)
        .upload(filePath, payload, { upsert: true, contentType: file.type });
      
      if (error) {
        // Provide detailed error messages
        let errorMessage = 'Failed to upload file.';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.statusCode === '413') {
          errorMessage = 'File is too large for upload.';
        } else if (error.statusCode === '400') {
          errorMessage = 'Invalid file type or format.';
        } else if (error.statusCode === '403') {
          errorMessage = 'Permission denied. This usually means:\n1. Your storage policies are not set up correctly\n2. The folder path does not match the policy (must be "files", "menus", or "logos")\n3. You need to be authenticated. Please sign in and try again.\n\nCheck SUPABASE_STORAGE_SETUP.md for policy setup instructions.';
        } else if (error.statusCode === '500' || error.statusCode === '503') {
          errorMessage = 'Storage service is temporarily unavailable. Please try again.';
        }
        throw new Error(`${errorMessage} (${error.statusCode || 'unknown'})`);
      }
      
      // Track storage usage (compressed size)
      addStorageUsage(compressedSize);
      
      const { data } = supabase.storage.from(QR_ASSETS_BUCKET).getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file.');
      }
      return { url: data.publicUrl, size: compressedSize };
    } catch (error) {
      // Re-throw with context if it's already an Error, otherwise wrap it
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Upload failed: ${String(error)}`);
    }
  };
  const handleVcardPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    // Reset states
    setVcardPhotoUploadError(null);
    setVcardPhotoUploadProgress(0);
    setVcardPhotoUploading(true);

    try {
      if (!file.type.startsWith('image/')) {
        const errorMsg = `"${file.name}" is not an image file. Please upload an image (JPG, PNG, etc.).`;
        setVcardPhotoUploadError(errorMsg);
        toast.error(errorMsg);
        setVcardPhotoUploading(false);
        return;
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setVcardPhotoUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      // Compress to 250x250px max for vCard (small display size)
      toast.info('Compressing photo for vCard...');
      const compressedDataUrl = await compressImageFile(file, { targetSize: 250, quality: 0.85 });
      const compressedBlob = dataUrlToBlob(compressedDataUrl);
      
      // Check storage limit
      const storageCheck = checkStorageLimit(compressedBlob.size);
      if (!storageCheck.allowed) {
        const availableMB = (storageCheck.available / (1024 * 1024)).toFixed(1);
        const neededMB = (compressedBlob.size / (1024 * 1024)).toFixed(1);
        clearInterval(progressInterval);
        const errorMsg = `Storage limit exceeded. You have ${availableMB}MB available, but need ${neededMB}MB.`;
        setVcardPhotoUploadError(errorMsg);
        toast.error(errorMsg);
        setVcardPhotoUploading(false);
        return;
      }

      // Track storage (we'll add it when we upload, but for vCard we store locally)
      // For vCard, we store the dataUrl locally, so we track it
      addStorageUsage(compressedBlob.size);

      clearInterval(progressInterval);
      setVcardPhotoUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      setVcardStyle((prev) => ({
        ...prev,
        profilePhotoDataUrl: compressedDataUrl,
        photoZoom: 110,
        photoX: 50,
        photoY: 50,
      }));
      toast.success('Photo compressed and uploaded successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process photo.';
      setVcardPhotoUploadError(message);
      toast.error(`Upload failed: ${message}`);
    } finally {
      setVcardPhotoUploading(false);
      setVcardPhotoUploadProgress(0);
    }
  };

  const handlePhotoPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!photoDragRef.current) return;
    photoDragRef.current.setPointerCapture(event.pointerId);
    photoDragState.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startPhotoX: vcardStyle.photoX,
      startPhotoY: vcardStyle.photoY,
    };
  };

  const handlePhotoPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!photoDragState.current.dragging || !photoDragRef.current) return;
    const rect = photoDragRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - photoDragState.current.startX) / rect.width) * 100;
    const deltaY = ((event.clientY - photoDragState.current.startY) / rect.height) * 100;
    setVcardStyle((prev) => ({
      ...prev,
      photoX: Math.min(100, Math.max(0, photoDragState.current.startPhotoX + deltaX)),
      photoY: Math.min(100, Math.max(0, photoDragState.current.startPhotoY + deltaY)),
    }));
  };

  const handlePhotoPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!photoDragRef.current) return;
    photoDragRef.current.releasePointerCapture(event.pointerId);
    photoDragState.current.dragging = false;
  };

  const readAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Invalid file data'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const compressImageFile = async (
    file: File,
    { maxDimension = 2000, quality = 0.80, targetSize = 250 }: { maxDimension?: number; quality?: number; targetSize?: number } = {}
  ) => {
    const dataUrl = await readAsDataUrl(file);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });
    
    // Use targetSize if provided (for vCard photos), otherwise use maxDimension
    const dimensionLimit = targetSize || maxDimension;
    const scale = Math.min(1, dimensionLimit / Math.max(image.width, image.height));
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    
    // Better quality for smaller images
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Use WebP if supported, otherwise JPEG
    let mimeType = 'image/jpeg';
    let finalQuality = quality;
    
    // Try WebP for better compression
    try {
      const webpDataUrl = canvas.toDataURL('image/webp', quality);
      if (webpDataUrl && webpDataUrl.length < dataUrl.length * 0.8) {
        return webpDataUrl;
      }
    } catch {
      // WebP not supported, fall back to JPEG
    }
    
    return canvas.toDataURL(mimeType, finalQuality);
  };

  const handleMenuLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    // Prevent duplicate uploads
    if (menuLogoUploading) {
      toast.warning('Upload already in progress. Please wait...');
      return;
    }

    // Reset states
    setMenuLogoUploadError(null);
    setMenuLogoUploadProgress(0);
    setMenuLogoUploading(true);

    try {
      if (!file.type.startsWith('image/')) {
        const errorMsg = `"${file.name}" is not an image file. Please upload an image (JPG, PNG, etc.).`;
        setMenuLogoUploadError(errorMsg);
        toast.error(errorMsg);
        setMenuLogoUploading(false);
        return;
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setMenuLogoUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      // Compress logo (max 2000px, 80% quality)
      toast.info('Compressing logo...');
      const compressed = file.type.startsWith('image/')
        ? await compressImageFile(file, { maxDimension: 2000, quality: 0.80 })
        : '';
      
      const result = await uploadQrAsset(file, 'logos', compressed || undefined);
      
      clearInterval(progressInterval);
      setMenuLogoUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!result?.url) {
        throw new Error('Upload returned no URL.');
      }
      setMenuLogoDataUrl(result.url);
      toast.success('Logo compressed and uploaded successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo.';
      setMenuLogoUploadError(message);
      toast.error(`Upload failed: ${message}`);
    } finally {
      setMenuLogoUploading(false);
      setMenuLogoUploadProgress(0);
    }
  };

  const handleMenuContinue = () => {
    if (menuBuilderStep === 'menu' && menuFiles.length > 0) {
      setMenuBuilderStep('logo');
    } else if (menuBuilderStep === 'logo') {
      setMenuBuilderStep('socials');
    } else if (menuBuilderStep === 'socials') {
      // Menu is complete, close builder and go to step 4
      setShowMenuBuilder(false);
    setMenuBuilderStep('menu'); // Reset step when closing
      setMobileStudioStep(4);
      setMobileCustomizeStep(true);
    }
  };

  const handleMenuFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    // Prevent duplicate uploads
    if (menuUploading) {
      toast.warning('Upload already in progress. Please wait...');
      return;
    }

    // Reset states
    setMenuUploadError(null);
    setMenuUploadProgress(0);
    setMenuUploading(true);

    try {
      // Validate file count
      if (files.length > MAX_MENU_FILES) {
        const errorMsg = `You can upload up to ${MAX_MENU_FILES} files. You selected ${files.length}.`;
        setMenuUploadError(errorMsg);
        toast.error(errorMsg);
        setMenuUploading(false);
        return;
      }

      // Validate file types
      const invalidFiles = files.filter(
        (file) => !file.type.startsWith('image/') && file.type !== 'application/pdf'
      );
      if (invalidFiles.length > 0) {
        const errorMsg = `Unsupported file type. Please upload images (JPG, PNG) or PDF files only.`;
        setMenuUploadError(errorMsg);
        toast.error(errorMsg);
        setMenuUploading(false);
        return;
      }

      const hasPdf = files.some((file) => file.type === 'application/pdf');
      if (hasPdf && files.length > 1) {
        const errorMsg = 'Upload a single PDF or up to 15 images. You cannot mix PDFs with images.';
        setMenuUploadError(errorMsg);
        toast.error(errorMsg);
        setMenuUploading(false);
        return;
      }

      // Validate file sizes
      for (const file of files) {
        if (file.type === 'application/pdf') {
          if (file.size > MAX_MENU_PDF_BYTES) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const maxMB = (MAX_MENU_PDF_BYTES / (1024 * 1024)).toFixed(0);
            const errorMsg = `PDF file "${file.name}" is too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`;
            setMenuUploadError(errorMsg);
            toast.error(errorMsg);
            setMenuUploading(false);
            return;
          }
        } else if (file.type.startsWith('image/')) {
          if (file.size > MAX_MENU_FILE_BYTES) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const maxMB = (MAX_MENU_FILE_BYTES / (1024 * 1024)).toFixed(1);
            const errorMsg = `Image file "${file.name}" is too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`;
            setMenuUploadError(errorMsg);
            toast.error(errorMsg);
            setMenuUploading(false);
            return;
          }
        }
      }

      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_MENU_TOTAL_BYTES) {
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
        const maxMB = (MAX_MENU_TOTAL_BYTES / (1024 * 1024)).toFixed(0);
        const errorMsg = `Total file size (${totalMB}MB) exceeds the limit of ${maxMB}MB. Please reduce file sizes or upload fewer files.`;
        setMenuUploadError(errorMsg);
        toast.error(errorMsg);
        setMenuUploading(false);
        return;
      }

      // Simulate progress for better UX (Supabase doesn't provide progress callbacks)
      const progressInterval = setInterval(() => {
        setMenuUploadProgress((prev) => {
          if (prev >= 90) return prev; // Don't go to 100% until upload completes
          return prev + Math.random() * 10;
        });
      }, 200);

      // Upload files with compression
      toast.info('Compressing files...');
      const uploads = await Promise.all(
        files.map(async (file, index) => {
          try {
            if (file.type === 'application/pdf') {
              // PDFs: compress if possible (basic compression)
              const compressedPdf = await compressPdf(file);
              const result = await uploadQrAsset(file, 'menus', undefined);
              if (!result?.url) throw new Error('Failed to upload menu PDF.');
              return { url: result.url, type: 'pdf' as const, size: result.size };
            }
            // Images: compress aggressively (max 2000px, 75% quality for menus)
            const compressed = await compressImageFile(file, { maxDimension: 2000, quality: 0.75 });
            const result = await uploadQrAsset(file, 'menus', compressed);
            if (!result?.url) throw new Error('Failed to upload menu image.');
            return { url: result.url, type: 'image' as const, size: result.size };
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload file.';
            throw new Error(`Failed to upload "${file.name}": ${message}`);
          }
        })
      );

      clearInterval(progressInterval);
      setMenuUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Brief delay to show 100%

      // Update state first - ensure modal stays open
      setMenuFiles(uploads);
      setMenuFlip(false);
      setMenuCarouselIndex(0);
      setMenuUploadError(null); // Clear any previous errors
      
      // Ensure menu builder is open before advancing step
      if (!showMenuBuilder) {
        setShowMenuBuilder(true);
      }
      
      // Advance to logo step - use setTimeout to ensure state updates are processed
      // Use a longer delay to ensure React has processed all state updates
      setTimeout(() => {
        setMenuBuilderStep('logo'); // Advance to logo step after menu upload
      }, 200);
      
      toast.success(`Successfully uploaded ${uploads.length} file${uploads.length === 1 ? '' : 's'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process menu files.';
      setMenuUploadError(message);
      toast.error(message);
      // Ensure modal stays open even on error so user can retry
      if (!showMenuBuilder) {
        setShowMenuBuilder(true);
      }
    } finally {
      setMenuUploading(false);
      setMenuUploadProgress(0);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    // Prevent duplicate uploads
    if (fileUploading) {
      toast.warning('Upload already in progress. Please wait...');
      return;
    }

    // Reset states
    setFileUploadError(null);
    setFileUploadProgress(0);
    setFileUploading(true);

    try {
      const isPdf = file.type === 'application/pdf';
      if (file.size > MAX_FILE_BYTES && isPdf) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const maxMB = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
        const errorMsg = `PDF file "${file.name}" is too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`;
        setFileUploadError(errorMsg);
        toast.error(errorMsg);
        setFileUploading(false);
        return;
      }

      // Compress files before upload and check storage with compressed size
      let compressed = '';
      let estimatedSize = file.size; // Default to original size for PDFs
      
      if (file.type.startsWith('image/')) {
        toast.info('Compressing image...');
        compressed = await compressImageFile(file, { maxDimension: 2000, quality: 0.80 });
        // Get compressed size for storage check
        if (compressed) {
          const compressedBlob = dataUrlToBlob(compressed);
          estimatedSize = compressedBlob.size;
        }
      } else if (file.type === 'application/pdf') {
        toast.info('Preparing PDF...');
        // PDFs can't be compressed client-side effectively, use original size
        estimatedSize = file.size;
      }
      
      // Check storage limit with estimated (compressed) size BEFORE caching
      const storageCheck = checkStorageLimit(estimatedSize);
      if (!storageCheck.allowed) {
        const availableMB = (storageCheck.available / (1024 * 1024)).toFixed(1);
        const neededMB = (estimatedSize / (1024 * 1024)).toFixed(1);
        const errorMsg = `Storage limit exceeded. You have ${availableMB}MB available, but need ${neededMB}MB. Please delete some files or upgrade your plan.`;
        setFileUploadError(errorMsg);
        toast.error(errorMsg);
        setFileUploading(false);
        return;
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFileUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
      
      // Cache file locally (dataUrl for images, blob for PDFs) - don't upload to DB yet
      if (compressed) {
        setFileDataUrl(compressed);
        const compressedBlob = dataUrlToBlob(compressed);
        setFileBlob(compressedBlob);
        setFileSize(compressedBlob.size);
      } else if (file.type === 'application/pdf') {
        // For PDFs, store the file as blob
        setFileBlob(file);
        setFileSize(file.size);
      }
      
      clearInterval(progressInterval);
      setFileUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Create a local preview URL for display (not uploaded to DB)
      if (compressed) {
        setFileUrl(compressed); // Use dataUrl as preview
      } else if (file.type === 'application/pdf') {
        // For PDFs, create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        setFileUrl(objectUrl);
      }
      setFileName(file.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process file upload.';
      setFileUploadError(message);
      toast.error(`Upload failed: ${message}`);
    } finally {
      setFileUploading(false);
      setFileUploadProgress(0);
    }
  };

  const moveMenuFile = (index: number, direction: number) => {
    setMenuFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const removeMenuFile = (index: number) => {
    setMenuFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openMenuBuilder = () => {
    if (!user) {
      toast.info('Create a free account to access these features no credit card required!');
      navigate('/login?mode=signup');
      return;
    }
    setShowMenuBuilder(true);
    setQrMode('dynamic');
    setQrType('menu');
    setActiveTab('studio');
    setSelectedQuickAction('menu');
    setPendingCreateScroll(true);
    setMenuBuilderStep('menu'); // Reset to menu step
  };

  const handleMenuSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!menuHasCarousel) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    menuSwipeRef.current = {
      dragging: true,
      startX: event.clientX,
      currentX: event.clientX,
    };
  };

  const handleMenuSwipeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!menuSwipeRef.current.dragging) return;
    menuSwipeRef.current.currentX = event.clientX;
  };

  const handleMenuSwipeEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!menuSwipeRef.current.dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = menuSwipeRef.current.currentX - menuSwipeRef.current.startX;
    menuSwipeRef.current.dragging = false;
    if (Math.abs(deltaX) < 40) return;
    setMenuCarouselIndex((prev) => {
      const total = menuFiles.length || 1;
      if (deltaX < 0) return (prev + 1) % total;
      return (prev - 1 + total) % total;
    });
  };

  const DecodeText = ({ text, active }: { text: string; active: boolean }) => {
    const [display, setDisplay] = useState(text);

    useEffect(() => {
      if (!active) {
        setDisplay(text);
        return;
      }
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let frame = 0;
      const totalFrames = Math.max(6, Math.min(14, text.length + 6));
      const interval = window.setInterval(() => {
        frame += 1;
        const revealCount = Math.floor((frame / totalFrames) * text.length);
        const next = text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < revealCount) return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        setDisplay(next);
        if (frame >= totalFrames) {
          window.clearInterval(interval);
          setDisplay(text);
        }
      }, 30);
      return () => window.clearInterval(interval);
    }, [text, active]);

    return <span>{display}</span>;
  };

  const vcardFrontBase = makeVcardBase(
    vcardStyle.frontUseGradient,
    vcardStyle.frontColor,
    vcardStyle.frontGradient
  );
  const vcardBackBase = makeVcardBase(
    vcardStyle.backUseGradient,
    vcardStyle.backColor,
    vcardStyle.backGradient
  );
  const vcardFrontTexture = getVcardTextureStyle(vcardStyle.texture, vcardFrontBase);
  const vcardBackTexture = getVcardTextureStyle(vcardStyle.texture, vcardBackBase);
  const vcardPreviewBase = isMobile
    ? { width: 260, height: 420 }
    : { width: 280, height: 460 };
  
  // Make vCard preview responsive - larger on bigger screens
  // Calculate scale based on viewport height, reactive to window resize
  const [vcardPreviewScale, setVcardPreviewScale] = useState(() => {
    if (isMobile) return 0.65;
    if (typeof window === 'undefined') return 0.8;
    const vh = window.innerHeight;
    const baseScale = 0.8;
    const maxScale = 1.2;
    // Scale from 0.8 at 600px height to 1.2 at 1200px+ height
    const scale = Math.min(maxScale, baseScale + ((vh - 600) / 600) * 0.4);
    return Math.max(0.8, scale);
  });

  useEffect(() => {
    if (isMobile) return;
    const updateScale = () => {
      if (typeof window === 'undefined') return;
      const vh = window.innerHeight;
      const baseScale = 0.8;
      const maxScale = 1.2;
      const scale = Math.min(maxScale, baseScale + ((vh - 600) / 600) * 0.4);
      setVcardPreviewScale(Math.max(0.8, scale));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isMobile]);

  const vcardPreviewScaled = {
    width: vcardPreviewBase.width * vcardPreviewScale,
    height: vcardPreviewBase.height * vcardPreviewScale,
  };
  const vcardFrontStyle = {
    fontFamily: vcardStyle.fontFamily,
    borderRadius: `${vcardStyle.radius}px`,
    backgroundColor: vcardStyle.frontColor,
    ...vcardFrontTexture,
  };

  const vcardBackStyle = {
    fontFamily: vcardStyle.fontFamily,
    borderRadius: `${vcardStyle.radius}px`,
    backgroundColor: vcardStyle.backColor,
    ...vcardBackTexture,
  };

  const adaptiveGradientText =
    'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-transparent bg-clip-text';
  const adaptiveGlowText = 'font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]';
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone);
  const dialDragSensitivity = isAndroid ? 1.25 : 0.6;
  const dialMomentumThreshold = isAndroid ? 0.08 : 0.12;
  const usernameCooldownUntil = userProfile?.usernameChangedAt
    ? new Date(userProfile.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000
    : null;
  const isUsernameCooldown = Boolean(usernameCooldownUntil && Date.now() < usernameCooldownUntil);
  const avatarLetter = (profileForm.fullName || user?.email || 'Q').trim().charAt(0).toUpperCase() || 'Q';
  const selectedAvatarColor =
    avatarColors.find((color) => color.id === profileForm.avatarColor) ?? avatarColors[0];
  const hasSavedAvatar = Boolean(userProfile?.avatarType && userProfile?.avatarColor);
  const headerAvatarType = userProfile?.avatarType ?? null;
  const headerAvatarColor =
    avatarColors.find((color) => color.id === userProfile?.avatarColor) ?? null;
  const tourCanProceed = !isTourDialStep || isMobile;
  const endTour = useCallback(() => {
    setTourActive(false);
    setTourStepIndex(0);
    setTourDialState({ opened: false, rotated: false, closed: false });
    setTourRect(null);
    setTourTooltip(null);
  }, []);
  const advanceTour = useCallback(() => {
    if (!currentTourStep) return;
    if (tourStepIndex >= tourSteps.length - 1) {
      endTour();
      setShowTourComplete(true);
      window.setTimeout(() => setShowTourComplete(false), 1700);
      return;
    }
    setTourStepIndex((prev) => prev + 1);
  }, [currentTourStep, endTour, tourStepIndex, tourSteps.length]);
  const handleTourQuickAction = useCallback(() => {
    if (tourActive && isTourCtaStep) {
      endTour();
    }
  }, [tourActive, isTourCtaStep, endTour]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (showWelcomeIntro || !user || !isNewAccountRef.current) return;
    if (!welcomeTourReadyRef.current) return;
    if (tourActive) return;
    const tourKey = `qr.tour.user.${user.id}`;
    if (localStorage.getItem(tourKey)) return;
    localStorage.setItem(tourKey, 'true');
    setTourActive(true);
    setTourStepIndex(0);
    welcomeTourReadyRef.current = false;
  }, [showWelcomeIntro, tourActive, user]);

  useEffect(() => {
    if (!tourActive) return;
    if (user) return;
    endTour();
  }, [tourActive, user, endTour]);

  useEffect(() => {
    if (!tourActive || !tourTargetId) {
      setTourRect(null);
      return;
    }
    if (typeof window === 'undefined') return;
    const updateRect = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour-id="${tourTargetId}"]`);
      if (!element) {
        setTourRect(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setTourRect(rect);
    };
    const element = document.querySelector<HTMLElement>(`[data-tour-id="${tourTargetId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(updateRect);
      });
    } else {
      setTourRect(null);
    }
  }, [tourActive, tourTargetId, tourStepIndex]);

  useEffect(() => {
    if (!tourRect) {
      setTourTooltip(null);
      return;
    }
    if (typeof window === 'undefined') return;
    const tooltipWidth = 320;
    const tooltipHeight = 160;
    const padding = 16;
    let top = tourRect.bottom + padding;
    if (top + tooltipHeight > window.innerHeight) {
      top = Math.max(padding, tourRect.top - tooltipHeight - padding);
    }
    let left = tourRect.left;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }
    setTourTooltip({ top, left });
  }, [tourRect]);

  useEffect(() => {
    if (!tourActive || !tourTargetId) return;
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const element = document.querySelector<HTMLElement>(`[data-tour-id="${tourTargetId}"]`);
      if (!element) return;
      setTourRect(element.getBoundingClientRect());
    };
    const handleScroll = () => handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [tourActive, tourTargetId]);

  useEffect(() => {
    if (!tourActive || !isTourDialStep) {
      if (tourDialState.opened || tourDialState.rotated || tourDialState.closed) {
        setTourDialState({ opened: false, rotated: false, closed: false });
      }
      tourDialStartAngleRef.current = null;
      return;
    }
    if (isDialOpen && !tourDialState.opened) {
      setTourDialState((prev) => ({ ...prev, opened: true }));
      tourDialStartAngleRef.current = dialAngle;
      return;
    }
    if (isDialOpen && tourDialStartAngleRef.current !== null && !tourDialState.rotated) {
      if (Math.abs(dialAngle - tourDialStartAngleRef.current) > 10) {
        setTourDialState((prev) => ({ ...prev, rotated: true }));
      }
      return;
    }
    if (!isDialOpen && tourDialState.opened && tourDialState.rotated && !tourDialState.closed) {
      setTourDialState((prev) => ({ ...prev, closed: true }));
    }
  }, [tourActive, isTourDialStep, isDialOpen, dialAngle, tourDialState]);

  useEffect(() => {
    if (!tourActive) return;
    return () => undefined;
  }, [tourActive]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!tourActive) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [tourActive]);
  const adaptiveSlotsVisible = adaptiveSlots.slice(0, adaptiveSlotCount);
  const adaptiveNowSlot = adaptiveDateRulesEnabled ? adaptiveDateRules[0]?.slot ?? adaptiveDefaultSlot : adaptiveDefaultSlot;
  const adaptiveReturningSlot = adaptiveFirstReturnEnabled ? adaptiveReturnSlot : adaptiveDefaultSlot;
  const adaptiveAdminPreviewSlot = adaptiveAdminEnabled ? adaptiveAdminSlot : adaptiveDefaultSlot;

  const handleAdaptiveSlotChange = (id: string, field: 'name' | 'type' | 'url' | 'note', value: string) => {
    setAdaptiveSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAdaptiveRuleChange = (
    id: string,
    field: 'slot' | 'startDate' | 'endDate' | 'startTime' | 'endTime' | 'days',
    value: string | string[]
  ) => {
    setAdaptiveDateRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule))
    );
  };

  const handleAdaptiveDayToggle = (ruleId: string, day: string) => {
    setAdaptiveDateRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== ruleId) return rule;
        const days = rule.days.includes(day)
          ? rule.days.filter((entry) => entry !== day)
          : [...rule.days, day];
        return { ...rule, days };
      })
    );
  };

  const handleAddAdaptiveRule = () => {
    setAdaptiveDateRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        slot: adaptiveDefaultSlot,
        startDate: '',
        endDate: '',
        startTime: '12:00',
        endTime: '18:00',
        days: [],
      },
    ]);
  };

  const handleRemoveAdaptiveRule = (id: string) => {
    setAdaptiveDateRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleAddAdaptiveIp = () => {
    const value = adaptiveAdminIpInput.trim();
    if (!value) return;
    if (!adaptiveAdminIps.includes(value)) {
      setAdaptiveAdminIps((prev) => [...prev, value]);
    }
    setAdaptiveAdminIpInput('');
  };

  const handleAdaptiveMockOpen = () => {
    setAdaptiveSlotCount(3);
    setAdaptiveDefaultSlot('B');
    setAdaptiveFirstReturnEnabled(true);
    setAdaptiveAdminEnabled(true);
    setAdaptiveAdminIps(['10.0.0.24', '192.168.1.24']);
    setActiveTab('adaptive');
    setPendingCreateScroll(false);
  };

  // Handle Adaptive QRC creation
  const handleAdaptiveQRCCreate = async (config: AdaptiveConfig, name: string) => {
    if (!user) {
      toast.error('Please sign in to create Adaptive QRC™');
      return;
    }

    // Check if user already has an Adaptive QRC
    if (existingAdaptiveQRC) {
      toast.error('You already have an Adaptive QRC™. Please edit your existing one.');
      setShowAdaptiveWizard(false);
      setShowAdaptiveEditor(true);
      return;
    }

    setIsGeneratingAdaptive(true);
    try {
      const appBaseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');

      // Generate Adaptive QRC with placeholder target URL
      const response = await generateQR(
        `${appBaseUrl}/pending/${crypto.randomUUID()}`,
        {
          content: `${appBaseUrl}/adaptive/preview`,
          size: 256,
          fgColor: '#D4AF37',
          bgColor: '#1a1a1a',
          errorCorrectionLevel: 'M',
          cornerStyle: 'rounded',
          adaptive: config,
        },
        'adaptive',
        name
      );

      if (response.success && response.data) {
        const { id, random } = response.data;
        const adaptiveUrl = `${appBaseUrl}/adaptive/${id}/${random}`;

        // Update QR code to point to adaptive endpoint
        await updateQR(id, {
          targetUrl: adaptiveUrl,
          options: {
            content: adaptiveUrl,
            size: 256,
            fgColor: '#D4AF37',
            bgColor: '#1a1a1a',
            errorCorrectionLevel: 'M',
            cornerStyle: 'rounded',
            adaptive: config,
          },
        });

        toast.success('Adaptive QRC™ created successfully!');
        setShowAdaptiveWizard(false);
        setArsenalRefreshKey((prev) => prev + 1);
        // refreshArsenalStats() will handle storage recalculation internally
        await refreshArsenalStats();
      } else {
        throw new Error('Failed to create Adaptive QRC™');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create Adaptive QRC™';
      if (message.includes('already have')) {
        toast.error(message);
        setShowAdaptiveWizard(false);
        setShowAdaptiveEditor(true);
      } else {
        throw error;
      }
    } finally {
      setIsGeneratingAdaptive(false);
    }
  };

  // Handle Adaptive QRC edit from Arsenal
  const handleAdaptiveEdit = (item: QRHistoryItem) => {
    setExistingAdaptiveQRC(item);
    setShowAdaptiveEditor(true);
  };

  // Handle Adaptive QRC update
  const handleAdaptiveQRCUpdate = async (config: AdaptiveConfig, name: string) => {
    if (!existingAdaptiveQRC) return;

    setIsGeneratingAdaptive(true);
    try {
      const appBaseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');

      // Get old file URLs to delete
      const oldConfig = existingAdaptiveQRC.options?.adaptive;
      const oldFileUrls: string[] = [];
      if (oldConfig?.slots) {
        for (const slot of oldConfig.slots) {
          if (slot.fileUrl) {
            oldFileUrls.push(slot.fileUrl);
          }
        }
      }

      // Get new file URLs
      const newFileUrls: string[] = [];
      if (config.slots) {
        for (const slot of config.slots) {
          if (slot.fileUrl) {
            newFileUrls.push(slot.fileUrl);
          }
        }
      }

      // Find files to delete (in old but not in new)
      const filesToDelete = oldFileUrls.filter(url => !newFileUrls.includes(url));

      const adaptiveUrl = existingAdaptiveQRC.shortUrl?.replace('/r/', '/adaptive/') || 
                         `${appBaseUrl}/adaptive/${existingAdaptiveQRC.id}/${existingAdaptiveQRC.random}`;

      await updateQR(existingAdaptiveQRC.id, {
        name,
        options: {
          ...existingAdaptiveQRC.options,
          content: adaptiveUrl,
          adaptive: config,
        },
      });

      // Delete old files from storage
      if (filesToDelete.length > 0 && isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            for (const fileUrl of filesToDelete) {
              try {
                // Extract file path from URL
                const urlParts = fileUrl.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const folder = urlParts[urlParts.length - 2];
                const filePath = `${folder}/${fileName}`;
                
                const { error } = await supabase.storage
                  .from(QR_ASSETS_BUCKET)
                  .remove([filePath]);
                
                if (error) {
                  console.warn(`Failed to delete file ${filePath}:`, error);
                }
              } catch (error) {
                console.warn(`Error deleting file ${fileUrl}:`, error);
              }
            }
          }
        } catch (error) {
          console.warn('Error cleaning up old files:', error);
        }
      }

      toast.success('Adaptive QRC™ updated successfully!');
      setShowAdaptiveEditor(false);
      setArsenalRefreshKey((prev) => prev + 1);
      // refreshArsenalStats() will handle storage recalculation internally
      await refreshArsenalStats();
    } catch (error) {
      throw error;
    } finally {
      setIsGeneratingAdaptive(false);
    }
  };

  // Check if a QR code is adaptive based on its content or options
  const isQRCodeAdaptive = useCallback((item: QRHistoryItem | { content?: string; options?: QROptions }): boolean => {
    // Check if content points to adaptive endpoint
    if (item.content && item.content.includes('/adaptive/')) {
      return true;
    }
    // Check if options contain adaptive config
    if (item.options?.adaptive) {
      return true;
    }
    return false;
  }, []);

  // Load adaptive configuration from saved QR options
  const loadAdaptiveConfigFromOptions = useCallback((options: QROptions | undefined) => {
    if (!options?.adaptive) {
      return;
    }

    const adaptive = options.adaptive;

    // Load slots
    if (adaptive.slots && adaptive.slots.length > 0) {
      const loadedSlots = adaptive.slots.map((slot, index) => {
        const slotId = slot.id || (index === 0 ? 'A' : index === 1 ? 'B' : 'C');
        return {
          id: slotId,
          name: `Slot ${slotId}`,
          type: 'url' as const,
          url: slot.url || '',
          note: '',
        };
      });
      setAdaptiveSlots(loadedSlots);
      setAdaptiveSlotCount(Math.min(loadedSlots.length, 3));
    }

    // Load default slot
    if (adaptive.defaultSlot) {
      setAdaptiveDefaultSlot(adaptive.defaultSlot as 'A' | 'B' | 'C');
    }

    // Load date rules
    if (adaptive.dateRules && adaptive.dateRules.length > 0) {
      setAdaptiveDateRulesEnabled(true);
      const loadedRules = adaptive.dateRules.map((rule) => ({
        id: crypto.randomUUID(),
        slot: rule.slot || adaptive.defaultSlot || 'A',
        startDate: rule.startDate || '',
        endDate: rule.endDate || '',
        startTime: rule.startTime || '',
        endTime: rule.endTime || '',
        days: rule.days || [],
      }));
      setAdaptiveDateRules(loadedRules);
    } else {
      setAdaptiveDateRulesEnabled(false);
    }

    // Load first-return visitor settings
    if (adaptive.firstReturn) {
      setAdaptiveFirstReturnEnabled(adaptive.firstReturn.enabled ?? false);
      if (adaptive.firstReturn.firstSlot) {
        setAdaptiveFirstSlot(adaptive.firstReturn.firstSlot as 'A' | 'B' | 'C');
      }
      if (adaptive.firstReturn.returnSlot) {
        setAdaptiveReturnSlot(adaptive.firstReturn.returnSlot as 'A' | 'B' | 'C');
      }
    }

    // Load admin settings
    if (adaptive.admin) {
      setAdaptiveAdminEnabled(adaptive.admin.enabled ?? false);
      if (adaptive.admin.ips && adaptive.admin.ips.length > 0) {
        setAdaptiveAdminIps(adaptive.admin.ips);
      }
      if (adaptive.admin.slot) {
        setAdaptiveAdminSlot(adaptive.admin.slot as 'A' | 'B' | 'C');
      }
    }
  }, []);

  // Build adaptive configuration from state
  const buildAdaptiveConfig = (): AdaptiveConfig | undefined => {
    // Check if adaptive is enabled (at least one slot has a valid URL)
    const hasValidSlots = adaptiveSlotsVisible.some((slot) => slot.url && slot.url.trim().length > 0);
    if (!hasValidSlots) {
      return undefined;
    }

    // Build slots array (only include slots with valid URLs)
    const slots: AdaptiveSlot[] = adaptiveSlotsVisible
      .filter((slot) => {
        if (!slot.url || !slot.url.trim()) return false;
        // Validate URL format
        try {
          const url = slot.url.trim();
          // Allow relative URLs or full URLs
          if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              new URL(url); // Will throw if invalid
            }
            return true;
          }
          return false;
        } catch {
          return false; // Invalid URL format
        }
      })
      .map((slot) => ({
        id: slot.id,
        url: slot.url?.trim(),
      }));

    if (slots.length === 0) {
      return undefined;
    }

    // Validate that default slot exists in slots
    const defaultSlotExists = slots.some((s) => s.id === adaptiveDefaultSlot);
    if (!defaultSlotExists && slots.length > 0) {
      // Fallback to first slot if default doesn't exist
      console.warn(`Default slot ${adaptiveDefaultSlot} not found in slots, using first slot`);
    }

    const config: AdaptiveConfig = {
      slots,
      defaultSlot: defaultSlotExists ? adaptiveDefaultSlot : slots[0]?.id,
    };

    // Add date rules if enabled and rules exist
    if (adaptiveDateRulesEnabled && adaptiveDateRules.length > 0) {
      const dateRules: AdaptiveRule[] = adaptiveDateRules
        .filter((rule) => {
          // Validate rule has a slot that exists
          if (!rule.slot) return false;
          const slotExists = slots.some((s) => s.id === rule.slot);
          if (!slotExists) {
            console.warn(`Rule references non-existent slot ${rule.slot}, skipping`);
            return false;
          }
          return true;
        })
        .map((rule) => ({
          slot: rule.slot,
          startDate: rule.startDate || undefined,
          endDate: rule.endDate || undefined,
          startTime: rule.startTime || undefined,
          endTime: rule.endTime || undefined,
          days: rule.days && rule.days.length > 0 ? rule.days : undefined,
        }));

      if (dateRules.length > 0) {
        config.dateRules = dateRules;
      }
    }

    // Add first-return visitor logic if enabled
    if (adaptiveFirstReturnEnabled) {
      // Validate slots exist
      const firstSlotExists = slots.some((s) => s.id === adaptiveFirstSlot);
      const returnSlotExists = slots.some((s) => s.id === adaptiveReturnSlot);
      
      if (firstSlotExists && returnSlotExists) {
        config.firstReturn = {
          enabled: true,
          firstSlot: adaptiveFirstSlot,
          returnSlot: adaptiveReturnSlot,
        };
      } else {
        console.warn('First-return visitor enabled but slots invalid, disabling');
      }
    }

    // Add admin IP routing if enabled
    if (adaptiveAdminEnabled && adaptiveAdminIps.length > 0) {
      const adminSlotExists = slots.some((s) => s.id === adaptiveAdminSlot);
      if (adminSlotExists) {
        config.admin = {
          enabled: true,
          ips: adaptiveAdminIps.filter((ip) => ip.trim().length > 0), // Filter empty IPs
          slot: adaptiveAdminSlot,
        };
      } else {
        console.warn('Admin routing enabled but slot invalid, disabling');
      }
    }

    // Add timezone if user has one set
    if (userProfile?.timezone) {
      config.timezone = userProfile.timezone;
    }

    return config;
  };

  // Check if adaptive QR code is enabled
  const isAdaptiveEnabled = useMemo(() => {
    return adaptiveSlotsVisible.some((slot) => slot.url && slot.url.trim().length > 0);
  }, [adaptiveSlotsVisible]);


  const navItems = [
    { id: 'studio', label: 'Studio' },
    { id: 'codes', label: 'Arsenal' },
    { id: 'analytics', label: 'Intel' },
    { id: 'adaptive', label: 'Adaptive QRC™' },
    { id: 'upgrade', label: 'Upgrade' },
    { id: 'settings', label: 'Config' },
  ] as const;
  const dialItems = navItems.map((item) => {
    const iconConfig = item.id === 'studio'
      ? { Icon: Paintbrush, color: 'text-muted-foreground' }
      : item.id === 'codes'
        ? { Icon: QrCode, color: 'text-muted-foreground' }
        : item.id === 'analytics'
          ? { Icon: BarChart3, color: 'text-muted-foreground' }
          : item.id === 'settings'
            ? { Icon: Settings, color: 'text-muted-foreground' }
            : item.id === 'adaptive'
              ? { Icon: QrCode, color: 'text-amber-300' }
              : { Icon: Star, color: 'text-amber-300' };
    return { ...item, ...iconConfig };
  });
  const dialStep = 360 / dialItems.length;
  const dialTargetAngle = 180;
  const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
  const angleDelta = (a: number, b: number) => {
    const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return diff > 180 ? 360 - diff : diff;
  };
  const shortestAngleDelta = (from: number, to: number) => {
    const delta = normalizeAngle(to) - normalizeAngle(from);
    return ((delta + 540) % 360) - 180;
  };
  const dialIndex = dialItems.reduce((closestIndex, _item, index) => {
    const iconAngle = index * dialStep - 90 + dialAngle;
    const closestAngle = closestIndex * dialStep - 90 + dialAngle;
    return angleDelta(iconAngle, dialTargetAngle) < angleDelta(closestAngle, dialTargetAngle)
      ? index
      : closestIndex;
  }, 0);
  const dialActive = dialItems[dialIndex];
  const dialDescriptions: Record<string, string> = {
    studio: 'Create a new QR in seconds.',
    codes: 'View your QR codes.',
    analytics: 'Review scans and insights.',
    adaptive: 'Adaptive QRC™ controls.',
    upgrade: 'Compare plans and features.',
    settings: 'Update your preferences.',
  };
  const dialInset = dialSize * 0.08;
  const dialOuterRadius = dialSize / 2;
  const dialIconSize = isAndroid
    ? Math.round(Math.min(84, Math.max(64, dialSize * 0.24)))
    : 96;
  const dialIconRadius = dialIconSize / 2;
  const dialOuterGap = dialSize * 0.05;
  const dialInnerGap = dialSize * 0.05;
  const dialRadius = Math.max(0, dialOuterRadius - dialIconRadius - dialOuterGap);
  const innerRingRadius = Math.max(0, dialRadius - dialIconRadius - dialInnerGap);
  const innerDialInset = Math.max(0, dialOuterRadius - innerRingRadius);
  const dialDragThresholdRef = useRef(false);
  const rotateDialToIndex = (index: number) => {
    if (typeof window === 'undefined') return;
    const currentAngle = index * dialStep - 90 + dialAngle;
    const delta = shortestAngleDelta(currentAngle, dialTargetAngle);
    const startAngle = dialAngle;
    const targetAngle = dialAngle + delta;
    const duration = 280;

    if (dialAnimationRef.current !== null) {
      window.cancelAnimationFrame(dialAnimationRef.current);
    }
    if (dialMomentumRef.current !== null) {
      window.cancelAnimationFrame(dialMomentumRef.current);
      dialMomentumRef.current = null;
    }

    const startTime = window.performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(progress);
      setDialAngle(startAngle + (targetAngle - startAngle) * eased);
      if (progress < 1) {
        dialAnimationRef.current = window.requestAnimationFrame(step);
      } else {
        dialAnimationRef.current = null;
      }
    };

    dialAnimationRef.current = window.requestAnimationFrame(step);
  };
  const startDialMomentum = (initialVelocity: number) => {
    if (typeof window === 'undefined') return;
    if (dialMomentumRef.current !== null) {
      window.cancelAnimationFrame(dialMomentumRef.current);
    }
    if (dialAnimationRef.current !== null) {
      window.cancelAnimationFrame(dialAnimationRef.current);
      dialAnimationRef.current = null;
    }

    const friction = 0.92;
    dialMomentumVelocityRef.current = initialVelocity;
    dialMomentumLastTimeRef.current = window.performance.now();

    const step = (now: number) => {
      const dt = Math.min(48, now - dialMomentumLastTimeRef.current);
      dialMomentumLastTimeRef.current = now;
      const velocity = dialMomentumVelocityRef.current;
      setDialAngle((prev) => prev + velocity * dt);

      const decay = Math.pow(friction, dt / 16);
      const nextVelocity = velocity * decay;
      dialMomentumVelocityRef.current = nextVelocity;

      if (Math.abs(nextVelocity) > 0.02) {
        dialMomentumRef.current = window.requestAnimationFrame(step);
      } else {
        dialMomentumRef.current = null;
      }
    };

    dialMomentumRef.current = window.requestAnimationFrame(step);
  };
  const playDialNoiseClick = useCallback((duration: number, gainLevel: number, highpass: number) => {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    const ctx = audioRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.value = gainLevel;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.start(now);
    source.stop(now + duration);
  }, []);
  const playDialTick = useCallback(() => {
    playDialNoiseClick(0.035, 0.08, 2200);
  }, [playDialNoiseClick]);
  const playDialSelect = useCallback(() => {
    playDialNoiseClick(0.045, 0.1, 1800);
  }, [playDialNoiseClick]);
  const lastDialIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDialOpen) {
      lastDialIndexRef.current = null;
      return;
    }
    if (lastDialIndexRef.current === null) {
      lastDialIndexRef.current = dialIndex;
      return;
    }
    if (lastDialIndexRef.current !== dialIndex) {
      playDialTick();
      lastDialIndexRef.current = dialIndex;
    }
  }, [dialIndex, isDialOpen, playDialTick]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isDialOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDialOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!showVcardCustomizer) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showVcardCustomizer]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!showQrCustomizer) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showQrCustomizer]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!showVcardContents) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showVcardContents]);

  useEffect(() => {
    if (!showVcardCustomizer) {
      setShowVcardPreview(false);
    }
  }, [showVcardCustomizer]);

  useEffect(() => {
    if (!isDialOpen) {
      setDialHintStage(0);
      return;
    }
    setDialHintStage(1);
    const lineTwoTimer = window.setTimeout(() => {
      setDialHintStage(2);
    }, 1000);
    return () => {
      window.clearTimeout(lineTwoTimer);
    };
  }, [isDialOpen]);

  const [mobileCustomizeStep, setMobileCustomizeStep] = useState(false);
  const showMobileCreateFlow = isMobile && Boolean(selectedQuickAction || qrType);
  const showStudioIntro = !isMobile || !showMobileCreateFlow;
  const showCreateSection = !isMobile || showMobileCreateFlow;
  const effectiveMobileStudioStep =
    isMobileV2 && selectedQuickAction ? Math.max(mobileStudioStep, 2) : mobileStudioStep;
  const showMobileCustomize =
    !isMobile || mobileCustomizeStep || (isMobileV2 && effectiveMobileStudioStep === 4);
  const getQrTypeIcon = () => {
    switch (qrType) {
      case 'website':
        return LinkIcon;
      case 'email':
        return Mail;
      case 'phone':
        return Phone;
      case 'file':
        return File;
      case 'menu':
        return Utensils;
      case 'vcard':
        return User;
      default:
        return QrCode;
    }
  };
  const getStepIcon = (step: 1 | 2 | 3 | 4) => {
    if (step === 1) return QrCode;
    if (step === 2) return qrMode === 'dynamic' ? Zap : QrCode;
    if (step === 3) return getQrTypeIcon();
    return Rocket;
  };

  useEffect(() => {
    if (!isMobileV2) return;
    if (!hasSelectedMode) {
      if (selectedQuickAction) {
        if (mobileStudioStep < 2) {
          setMobileStudioStep(2);
        }
        return;
      }
      if (mobileStudioStep > 1) {
        setMobileStudioStep(1);
      }
      return;
    }
    if (!hasSelectedType) {
      if (mobileStudioStep > 2) {
        setMobileStudioStep(2);
      }
      return;
    }
  }, [hasSelectedMode, hasSelectedType, isMobileV2, mobileStudioStep, selectedQuickAction]);

  useEffect(() => {
    if (!isMobile || !isStandalone) return;
    let startY = 0;
    let startX = 0;
    let isPulling = false;
    let isReady = false;
    const threshold = 120;
    const revealOffset = 32;
    const startZone = 24;
    const getScrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (getScrollTop() > 0) return;
      const touchY = event.touches[0]?.clientY ?? 0;
      const touchX = event.touches[0]?.clientX ?? 0;
      if (touchY > startZone) return;
      startY = touchY;
      startX = touchX;
      isPulling = true;
      isReady = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isPulling) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startY;
      const deltaX = Math.abs((event.touches[0]?.clientX ?? 0) - startX);
      if (delta <= 0 || deltaX > Math.abs(delta)) {
        setPullRefreshState({ visible: false, progress: 0, ready: false });
        return;
      }
      if (delta <= revealOffset) {
        setPullRefreshState({ visible: false, progress: 0, ready: false });
        return;
      }
      const progress = Math.min(1, Math.max(0, delta / threshold));
      isReady = delta > threshold;
      setPullRefreshState({ visible: true, progress, ready: isReady });
    };

    const handleTouchEnd = () => {
      if (isPulling && isReady) {
        window.location.reload();
      }
      isPulling = false;
      isReady = false;
      setPullRefreshState({ visible: false, progress: 0, ready: false });
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isStandalone]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleError = (event: ErrorEvent) => {
      pushUiErrorBadge('error', event.error ?? event.message);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      pushUiErrorBadge('rejection', event.reason);
    };
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string; message?: string }>).detail;
      if (!detail) return;
      const message = detail.message || 'Unexpected error';
      const code = detail.code || getUiErrorCode('custom', message);
      setUiErrorBadge({ code, message: message.slice(0, 140) });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('qrc:ui-error', handleCustom as EventListener);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('qrc:ui-error', handleCustom as EventListener);
    };
  }, [getUiErrorCode, pushUiErrorBadge]);
  const fgColorPresets = [
    '#2B2B2B',
    '#D4AF37',
    '#7C5CFF',
    '#58E1FF',
    '#2563EB',
    '#16A34A',
    '#F97316',
    '#DC2626',
    '#111827',
    '#000000',
  ];
  const bgColorPresets = [
    '#F3F3F0',
    '#FFFFFF',
    '#0B1120',
    '#1F2937',
    '#0A192F',
    '#F5E9C9',
    '#E0F2FE',
    '#DCFCE7',
    '#FFEDD5',
    '#FEF2F2',
  ];
  const hasInteractedRef = useRef(false);
  const scrollToRef = useCallback((ref: { current: HTMLElement | null }, block: ScrollLogicalPosition = 'center') => {
    if (typeof window === 'undefined') return;
    if (!ref.current) return;
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block });
    });
  }, []);

  useEffect(() => {
    if (selectedQuickAction || qrMode || qrType) {
      hasInteractedRef.current = true;
    }
  }, [selectedQuickAction, qrMode, qrType]);

  useEffect(() => {
    if (!isMobile) return;
    setMobileCustomizeStep(false);
  }, [qrMode, qrType, selectedQuickAction, isMobile]);

  // Issue #1: Clear file cache when QR type changes to something other than 'file'
  useEffect(() => {
    if (qrType !== 'file' && (fileDataUrl || fileBlob || fileUrl)) {
      // Revoke blob URL if it's a blob URL (for PDF previews)
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
      setFileDataUrl('');
      setFileBlob(null);
      setFileUrl('');
      setFileName('');
      setFileSize(0);
      setFileTouched(false);
    }
  }, [qrType, fileDataUrl, fileBlob, fileUrl]);

  // Issue #2: Cleanup file cache on component unmount or when wizard is closed
  useEffect(() => {
    return () => {
      // Cleanup on unmount - clear file cache if user abandons QR creation
      // Note: fileDataUrl is a data URL (data:image/png;base64,...), not a blob URL, so no need to revoke
      // fileBlob will be garbage collected when state is cleared
      // But fileUrl might be a blob URL (for PDF previews), so we need to revoke it
      if (fileDataUrl || fileBlob || fileUrl) {
        if (fileUrl && fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fileUrl);
        }
        setFileDataUrl('');
        setFileBlob(null);
        setFileUrl('');
        setFileName('');
        setFileSize(0);
      }
    };
  }, [fileDataUrl, fileBlob, fileUrl]);

  useEffect(() => {
    if (!showCreateSection || hasSelectedMode) return;
    if (!hasInteractedRef.current) return;
    scrollToRef(modeSectionRef, 'start');
  }, [showCreateSection, hasSelectedMode, scrollToRef]);

  useEffect(() => {
    if (!hasSelectedMode) return;
    if (!hasInteractedRef.current) return;
    scrollToRef(detailsSectionRef);
  }, [hasSelectedMode, hasSelectedType, scrollToRef]);

  useEffect(() => {
    if (!showMobileCustomize || !hasSelectedMode || !hasSelectedType) return;
    if (!hasInteractedRef.current) return;
    if (isMobile) {
      scrollToRef(customizePreviewRef, 'start');
      return;
    }
    scrollToRef(customizeSectionRef, 'start');
  }, [showMobileCustomize, hasSelectedMode, hasSelectedType, scrollToRef, isMobile]);

  useEffect(() => {
    if (!showGenerateSuccess) return;
    const timer = window.setTimeout(() => {
      setShowGenerateSuccess(false);
      setActiveTab('codes');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [showGenerateSuccess]);

  const intelMapPanel = (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Intel</p>
          <h3 className="text-lg font-semibold">Command Map</h3>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Live</span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Radar</p>
        <div className="relative h-56 rounded-2xl border border-amber-300/30 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.12),rgba(17,24,39,0.9))] overflow-hidden">
          <img
            src="/map.svg"
            alt="World map outline"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            loading="lazy"
          />
          {scanAreas.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-md border border-amber-300/40 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-[0.5em] text-amber-200 font-semibold">
                {radarLabel}
              </div>
            </div>
          ) : null}
          <MapDots areas={scanAreas} />
          <div className="absolute inset-6 rounded-full border border-amber-200/30" />
          <div className="absolute inset-12 rounded-full border border-amber-200/20" />
          <div className="absolute inset-20 rounded-full border border-amber-200/10" />
          <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/10" />
          <div className="absolute inset-0 radar-sweep" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('codes')}
          className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4 text-center transition hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Active Nodes</p>
          <p className="text-lg sm:text-2xl font-semibold mt-2">{arsenalStats.total.toLocaleString()}</p>
        </button>
        <div
          ref={signalsCardRef}
          onClick={() => setIsSignalsMenuOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsSignalsMenuOpen((prev) => !prev);
            }
          }}
          className="relative rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4 text-center transition hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-center justify-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Signals</p>
          </div>
          <p className="text-lg sm:text-2xl font-semibold mt-2">
            {intelLoading ? '...' : intelSummary.rangeTotal.toLocaleString()}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {intelRangeLabels[intelRange]}
          </p>
          {isSignalsMenuOpen && (
            <div className="absolute left-1/2 top-full z-20 mt-2 w-40 -translate-x-1/2 rounded-xl border border-border/80 bg-card/95 p-2 text-left shadow-lg">
              {(['today', '7d', '30d', 'all'] as const).map((range) => (
                <div
                  key={range}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setIntelRange(range);
                    setIsSignalsMenuOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setIntelRange(range);
                      setIsSignalsMenuOpen(false);
                    }
                  }}
                  className="w-full rounded-lg px-2 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
                >
                  {intelRangeLabels[range]}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4 text-center flex flex-col items-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Response Time</p>
          <p className="text-lg sm:text-2xl font-semibold mt-2">
            {intelLoading
              ? '...'
              : Number.isFinite(intelSummary.avgResponseMs) && intelSummary.avgResponseMs !== null
                ? `${(intelSummary.avgResponseMs / 1000).toFixed(2)}s`
                : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 sm:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Signal Trends</p>
          <div className="mt-4 h-24 sm:h-32 overflow-x-auto">
            <div className="h-full flex items-end gap-1 sm:gap-2 min-w-full">
              {trendPoints.map((point, index, arr) => {
                const max = Math.max(1, ...arr.map((item) => item.count ?? 0));
                const height = Math.max(12, Math.round(((point.count ?? 0) / max) * 100));
                // For 30 days, show every 3rd label to avoid crowding
                const showLabel = intelRange === '30d' || intelRange === 'all' 
                  ? index % 3 === 0 || index === arr.length - 1
                  : true;
                return (
                  <div key={`${point.label}-${index}`} className="flex h-full flex-1 flex-col items-center min-w-0">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-amber-300/20 to-amber-300/80"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    {showLabel && (
                      <span className="mt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                        {point.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const intelSnapshotPanel = (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mission Snapshot</p>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Signal Strength</span>
            <span className="text-primary">92%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Scan Velocity</span>
            <span className="text-primary">+18%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Adaptive Nodes</span>
            <span className="text-primary">4</span>
          </div>
        </div>
      </div>
      <div className="glass-panel rounded-2xl p-6 hidden lg:block">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Top Regions</p>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Frankfurt</span>
            <span className="text-primary">38%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Singapore</span>
            <span className="text-primary">24%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Dallas</span>
            <span className="text-primary">18%</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    // Desktop: Allow natural height and scrolling. Mobile V2: Height handled by mobile-ui-v2.css
    <div className="bg-background sm:min-h-screen lg:min-h-0" data-build={BUILD_STAMP}>
      <style>{`
        @keyframes radarSweep {
          0% { transform: rotate(0deg); opacity: 0.15; }
          50% { opacity: 0.35; }
          100% { transform: rotate(360deg); opacity: 0.15; }
        }
        .radar-sweep {
          background: conic-gradient(from 0deg, rgba(251,191,36,0) 0deg, rgba(251,191,36,0.45) 25deg, rgba(251,191,36,0) 60deg);
          animation: radarSweep 3.5s linear infinite;
          mix-blend-mode: screen;
        }
      `}</style>
      {showIntroAd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.6em] text-muted-foreground">Introducing</p>
            <div className="space-y-1 text-2xl sm:text-3xl font-semibold tracking-[0.2em] text-foreground">
              <div className={`transition-all duration-500 ${introStep >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                THE LAST
              </div>
              <div className={`transition-all duration-500 ${introStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                QR CODE
              </div>
              <div className={`transition-all duration-500 ${introStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                YOU&apos;LL EVER
              </div>
            </div>
            <div className={`text-4xl sm:text-5xl font-semibold tracking-[0.2em] ${introStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-500`}>
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">PRINT!</span>
                <span className="absolute inset-0 logo-fill">PRINT!</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {showStudioBoot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <span className="relative inline-block">
              <span className="text-muted-foreground/70">QR Code Studio</span>
              <span className="absolute inset-0 logo-fill">QR Code Studio</span>
            </span>
          </div>
        </div>
      )}

      {!isBooting && showGuestWelcome && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 backdrop-blur-md px-4 pointer-events-auto">
          <div className="text-center space-y-4">
            <div className="space-y-1 text-2xl sm:text-3xl font-semibold tracking-[0.2em] text-foreground">
              <div className={`transition-all duration-500 ${guestIntroStep >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                THE LAST
              </div>
              <div className={`transition-all duration-500 ${guestIntroStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                QR CODE
              </div>
              <div className={`transition-all duration-500 ${guestIntroStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                YOU&apos;LL EVER
              </div>
            </div>
            <div className={`text-4xl sm:text-5xl font-semibold tracking-[0.2em] ${guestIntroStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-500`}>
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">PRINT!</span>
                <span className="absolute inset-0 logo-fill">PRINT!</span>
              </span>
            </div>
            <div className="pt-4 space-y-4">
              <div className="space-y-2">
                <Button
                  className={`w-full sm:w-64 mx-auto bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs transition-all duration-500 ${
                    guestCtaStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                  onClick={() => {
                    setShowGuestWelcome(false);
                    navigate('/login?mode=signup');
                  }}
                >
                  Sign Up For Free
                </Button>
                <p className={`text-center text-xs text-muted-foreground/70 transition-all duration-500 ${
                  guestCtaStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}>
                  NO CREDIT CARD REQUIRED
                </p>
              </div>
              <button
                type="button"
                className={`w-full sm:w-64 mx-auto text-xs uppercase tracking-[0.3em] text-foreground transition-all duration-500 ${
                  guestCtaStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                onClick={() => {
                  setShowGuestWelcome(false);
                  navigate('/login');
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`w-full sm:w-64 mx-auto mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition-all duration-500 ${
                  guestCtaStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                onClick={() => setShowGuestWelcome(false)}
              >
                Continue without account
              </button>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">QR Code Studio</span>
                <span className="absolute inset-0 logo-fill">QR Code Studio</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Generating your QR</p>
          </div>
        </div>
      )}

      {showNameOverlay && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md px-4"
          onClick={() => setShowNameOverlay(false)}
        >
          <div
            className="glass-panel rounded-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Name Your QR Code</p>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition"
                onClick={() => setShowNameOverlay(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                  QR Code Name
                </label>
                <Input
                  value={qrName}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 25);
                    setQrName(value);
                  }}
                  placeholder="QRC Untitled 1"
                  className="bg-secondary/40 border-border"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && qrName.trim() && canGenerate) {
                      handleGenerate(qrName.trim() || null);
                    }
                  }}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {qrName.length}/25 characters
                </p>
              </div>
              <Button
                size="lg"
                className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                disabled={!canGenerate || isGenerating || !qrName.trim()}
                onClick={() => handleGenerate(qrName.trim() || null)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showGenerateSuccess && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="text-3xl sm:text-4xl font-semibold tracking-[0.35em]">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">SUCCESS</span>
                <span className="absolute inset-0 logo-fill">SUCCESS</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Sending to Arsenal</p>
          </div>
        </div>
      )}

      {stageOverlayOpen && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Production Stages</p>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.3em] text-primary"
                onClick={() => setStageOverlayOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                {productionStages.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStageId(stage.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-xs uppercase tracking-[0.2em] transition ${
                      activeStageId === stage.id
                        ? 'border-amber-300/80 bg-amber-300/15 text-amber-200'
                        : 'border-border/60 text-muted-foreground hover:border-amber-300/60 hover:text-foreground'
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                {activeStage.id === 'stage1' ? (
                  <>
                    {/* Desktop: Standard view */}
                    <div className="hidden sm:block">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {activeStage.title}
                      </p>
                      <p className="mt-3 text-sm text-foreground/90 whitespace-pre-line">
                        {activeStage.description}
                      </p>
                    </div>
                    {/* Mobile V2: Handwritten letter */}
                    <div className="sm:hidden qrc-letter-card">
                      <div className="qrc-letter-content">
                        <h3 className="qrc-letter-title">Friends & Family</h3>
                        <div className="qrc-letter-body">
                          {activeStage.description}
                        </div>
                      </div>
                      <div className="qrc-letter-footer">
                        <p className="qrc-letter-signature">José & Erwin</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {activeStage.title}
                    </p>
                    <p className="mt-3 text-sm text-foreground/90 whitespace-pre-line">
                      {activeStage.description}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalyticsIntro && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">Intel</span>
                <span className="absolute inset-0 logo-fill">Intel</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Loading insights</p>
          </div>
        </div>
      )}

      {showWelcomeIntro && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight whitespace-pre-line">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">{welcomeHeadline}</span>
                <span className="absolute inset-0 logo-fill">{welcomeHeadline}</span>
              </span>
            </div>
            {welcomeSubline ? (
              <div className="text-base sm:text-lg font-semibold tracking-tight whitespace-pre-line">
              <span className="relative inline-block">
                <span className="text-muted-foreground/70">{welcomeSubline}</span>
                <span className="absolute inset-0 logo-fill">{welcomeSubline}</span>
              </span>
            </div>
            ) : null}
          </div>
        </div>
      )}


      {showGoodbyeIntro && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className={`flex flex-col items-center gap-6 ${isMobileV2 ? 'px-4 max-w-[85vw]' : ''}`}>
            <div className={`grid grid-cols-7 gap-1 ${isMobileV2 ? 'scale-90' : ''}`}>
              {Array.from({ length: 49 }).map((_, index) => {
                const row = Math.floor(index / 7);
                const col = index % 7;
                const eye = row === 2 && (col === 2 || col === 4);
                const mouth = row === 4 && col >= 2 && col <= 4;
                const chin = row === 5 && (col === 1 || col === 5);
                const isPixel = eye || mouth || chin;
                return (
                  <span
                    key={`pixel-${index}`}
                    className={`h-3 w-3 rounded-[3px] ${isPixel ? 'bg-primary/70' : 'bg-primary/10'}`}
                  />
                );
              })}
            </div>
            <div className={`text-center space-y-3 ${isMobileV2 ? 'w-full' : ''}`}>
              <div className={`font-semibold tracking-tight whitespace-pre-line ${isMobileV2 ? 'text-xl' : 'text-2xl'}`}>
                <span className="relative inline-block">
                  <span className="text-muted-foreground/70">{goodbyeHeadline}</span>
                  <span className="absolute inset-0 logo-fill">{goodbyeHeadline}</span>
                </span>
              </div>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase whitespace-pre-line">
                <span className="relative inline-block">
                  <span className="text-muted-foreground/70">{goodbyeSubline}</span>
                  <span className="absolute inset-0 logo-fill">{goodbyeSubline}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEasterEggBanner ? (
        <div className="fixed top-0 left-0 right-0 z-[70] flex justify-center px-4 pt-4">
          <div className="rounded-full border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-amber-200 shadow-lg">
            Le Machine carried the frontend + backend 😮‍💨
          </div>
        </div>
      ) : null}

      {showAccountModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setShowAccountModal(false)}
        >
          <div
            className="glass-panel rounded-3xl p-8 w-full max-w-lg space-y-5 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground"
              onClick={() => setShowAccountModal(false)}
            >
              X
            </button>
            {isLoggedIn ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Welcome</p>
                  <h2 className="text-2xl font-semibold">{user?.email ?? 'Account'}</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage preferences, security, and sign out.
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  <button
                    type="button"
                    className="w-full text-left text-primary hover:text-primary/80 transition"
                    onClick={() => {
                      setActiveTab('settings');
                      setShowAccountModal(false);
                    }}
                  >
                    Preferences
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-muted-foreground hover:text-foreground transition"
                    onClick={async () => {
                      await handleSignOut();
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">My Account</p>
                  <h2 className="text-2xl font-semibold">Create your account</h2>
                  <p className="text-sm text-muted-foreground">
                    Save your QR codes, track analytics, and sync across devices.
                  </p>
                </div>
                <div className="space-y-3">
                  <Input
                    value={accountForm.username}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Username"
                    maxLength={18}
                    className="bg-secondary/40 border-border"
                  />
                  <Input
                    value={accountForm.fullName}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Full Name"
                    className="bg-secondary/40 border-border"
                  />
                  <Input
                    value={accountForm.email}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email Address"
                    type="email"
                    className="bg-secondary/40 border-border"
                  />
                  <Input
                    value={accountForm.password}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Password"
                    type="password"
                    className="bg-secondary/40 border-border"
                  />
                </div>
                <label className="flex items-start gap-3 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    I agree to the Terms & Conditions and subscribe for free updates.
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                    disabled={
                      accountLoading ||
                      !acceptedTerms ||
                      !accountForm.fullName.trim() ||
                      !accountForm.username.trim() ||
                      !accountForm.email.trim() ||
                      !accountForm.password
                    }
                    onClick={handleAccountCreate}
                  >
                    {accountLoading ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
                <button
                  type="button"
                  className="w-full text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
                  onClick={() => {
                    setShowAccountModal(false);
                    navigate('/login');
                  }}
                >
                  Already have an account? <span className="text-primary">Sign In</span>
                </button>
                <div className="text-center">
                  <a
                    href="/terms"
                    className="text-[11px] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-primary"
                  >
                    View Terms & Conditions
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showVcardCustomizer && (
        <div
          className="fixed inset-0 z-[70] overflow-hidden bg-background/70 backdrop-blur-md px-4 py-6"
          onClick={() => setShowVcardCustomizer(false)}
        >
          <div
            className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-6xl mx-auto my-auto space-y-6 relative max-h-[90dvh] overflow-y-auto overscroll-contain"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground"
              onClick={() => setShowVcardCustomizer(false)}
            >
              X
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">VCard</p>
                <h2 className="text-2xl font-semibold">Customize your card</h2>
                <p className="text-sm text-muted-foreground">
                  Tap the preview to flip between front and back.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  className="relative"
                  style={{
                    width: `${vcardPreviewScaled.width}px`,
                    height: `${vcardPreviewScaled.height}px`,
                  }}
                  onClick={() => {
                    if (isMobile) {
                      setShowVcardPreview(true);
                      return;
                    }
                    setVcardPreviewSide((prev) => (prev === 'front' ? 'back' : 'front'));
                  }}
                  aria-label={isMobile ? 'Open vcard preview' : 'Flip vcard preview'}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      width: `${vcardPreviewBase.width}px`,
                      height: `${vcardPreviewBase.height}px`,
                      transform: `scale(${vcardPreviewScale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <div
                      className="absolute inset-0 transition-transform duration-500"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: vcardPreviewSide === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      }}
                    >
                    <div
                      className="absolute inset-0 flex flex-col justify-between p-6 text-left text-white shadow-xl"
                      style={{ ...vcardFrontStyle, backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: vcardStyle.frontFontColor, opacity: 0.7 }}>VCard</p>
                          <h3 className="text-2xl font-semibold" style={{ color: vcardStyle.frontFontColor }}>
                            {vcard.name || 'Your Name'}
                          </h3>
                          <p className="text-sm" style={{ color: vcardStyle.frontFontColor, opacity: 0.85 }}>
                            {vcard.company || 'Your Company'}
                          </p>
                        </div>
                        <div
                          className="h-16 w-16 rounded-full border border-white/30 bg-white/10"
                          style={{
                            backgroundImage: vcardStyle.profilePhotoDataUrl
                              ? `url(${vcardStyle.profilePhotoDataUrl})`
                              : undefined,
                            backgroundSize: `${vcardStyle.photoZoom}%`,
                            backgroundPosition: `${vcardStyle.photoX}% ${vcardStyle.photoY}%`,
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      </div>
                      <div className="space-y-2 text-sm" style={{ color: vcardStyle.frontFontColor, opacity: 0.9 }}>
                        <p>{vcard.phone || '+1 (555) 123-4567'}</p>
                        <p>{vcard.email || 'you@example.com'}</p>
                        <p>{vcard.website || 'qrcodestudio.app'}</p>
                      </div>
                      {vcardStyle.frontLogoDataUrl && (
                        <div className="flex justify-end">
                          <img
                            src={vcardStyle.frontLogoDataUrl}
                            alt="Front logo"
                            className="h-10 w-10 rounded-lg object-cover border border-white/20"
                          />
                        </div>
                      )}
                      <p className="text-[11px] uppercase tracking-[0.4em]" style={{ color: vcardStyle.frontFontColor, opacity: 0.7 }}>
                        Tap to flip
                      </p>
                    </div>

                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-white shadow-xl"
                      style={{
                        ...vcardBackStyle,
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      {vcardStyle.backLogoDataUrl ? (
                        <img
                          src={vcardStyle.backLogoDataUrl}
                          alt="VCard logo"
                          className="h-20 w-20 rounded-xl object-cover border border-white/20"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-xl border border-white/20 flex items-center justify-center text-xs text-white/70">
                          Logo
                        </div>
                      )}
                      <p className="text-xs uppercase tracking-[0.4em]" style={{ color: vcardStyle.backFontColor, opacity: 0.7 }}>
                        Tap to flip
                      </p>
                    </div>
                    </div>
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">
                  {isMobile ? 'Tap to expand preview.' : 'Tap to flip preview.'}
                </p>
              </div>

                <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Contact Photo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use a professional selfie for services/freelancers or your business logo for a company card.
                  </p>
                  {vcardPhotoUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Uploading photo...</span>
                        <span className="font-semibold text-foreground">{Math.round(vcardPhotoUploadProgress)}%</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/30">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-amber-300 transition-all duration-300 ease-out relative overflow-hidden"
                          style={{ width: `${vcardPhotoUploadProgress}%` }}
                        >
                          {vcardPhotoUploadProgress > 0 && vcardPhotoUploadProgress < 100 && (
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
                  ) : vcardPhotoUploadError ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm text-destructive font-semibold">Upload Failed</p>
                        <p className="text-xs text-destructive/80 mt-1">{vcardPhotoUploadError}</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVcardPhotoChange}
                        className="text-xs text-muted-foreground"
                      />
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleVcardPhotoChange}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                  <div className="flex items-center gap-4">
                    <div
                      ref={photoDragRef}
                      className="relative h-40 w-40 rounded-2xl border border-border bg-secondary/40 cursor-grab active:cursor-grabbing overflow-hidden"
                      onPointerDown={handlePhotoPointerDown}
                      onPointerMove={handlePhotoPointerMove}
                      onPointerUp={handlePhotoPointerUp}
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    >
                      <div
                        className="absolute inset-4 rounded-full border-2 border-primary/60 shadow-[0_0_16px_rgba(99,102,241,0.35)]"
                        style={{
                          backgroundImage: vcardStyle.profilePhotoDataUrl
                            ? `url(${vcardStyle.profilePhotoDataUrl})`
                            : undefined,
                          backgroundSize: `${vcardStyle.photoZoom}%`,
                          backgroundPosition: `${vcardStyle.photoX}% ${vcardStyle.photoY}%`,
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                          Zoom
                        </p>
                        <input
                          type="range"
                          min={80}
                          max={180}
                          value={vcardStyle.photoZoom}
                          onChange={(event) =>
                            setVcardStyle((prev) => ({
                              ...prev,
                              photoZoom: Number(event.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Typography
                  </p>
                  <select
                    className="w-full h-11 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                    value={vcardStyle.fontFamily}
                    onChange={(event) =>
                      setVcardStyle((prev) => ({ ...prev, fontFamily: event.target.value }))
                    }
                  >
                    {vcardFontOptions.map((font) => (
                      <option key={font.label} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Texture
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {vcardTextureOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setVcardStyle((prev) => ({ ...prev, texture: option.id }))}
                        className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.3em] transition ${
                          vcardStyle.texture === option.id
                            ? 'border-primary bg-secondary/50 text-foreground'
                            : 'border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/60'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Corner Radius
                  </p>
                  <input
                    type="range"
                    min={8}
                    max={32}
                    value={vcardStyle.radius}
                    onChange={(event) =>
                      setVcardStyle((prev) => ({
                        ...prev,
                        radius: Number(event.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Front Style
                    </p>
                    <ColorPicker
                      label="Front Background"
                      value={vcardStyle.frontColor}
                      onChange={(value) => setVcardStyle((prev) => ({ ...prev, frontColor: value }))}
                      presets={bgColorPresets}
                    />
                    <ColorPicker
                      label="Front Font Color"
                      value={vcardStyle.frontFontColor}
                      onChange={(value) => setVcardStyle((prev) => ({ ...prev, frontFontColor: value }))}
                      presets={fgColorPresets}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="front-gradient"
                        type="checkbox"
                        checked={vcardStyle.frontUseGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            frontUseGradient: event.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="front-gradient" className="text-xs text-muted-foreground">
                        Use gradient
                      </label>
                    </div>
                    {vcardStyle.frontUseGradient && (
                      <ColorPicker
                        label="Front Gradient"
                        value={vcardStyle.frontGradient}
                        onChange={(value) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            frontGradient: value,
                          }))
                        }
                        presets={fgColorPresets}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Back Style
                    </p>
                    <ColorPicker
                      label="Back Background"
                      value={vcardStyle.backColor}
                      onChange={(value) => setVcardStyle((prev) => ({ ...prev, backColor: value }))}
                      presets={bgColorPresets}
                    />
                    <ColorPicker
                      label="Back Font Color"
                      value={vcardStyle.backFontColor}
                      onChange={(value) => setVcardStyle((prev) => ({ ...prev, backFontColor: value }))}
                      presets={fgColorPresets}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="back-gradient"
                        type="checkbox"
                        checked={vcardStyle.backUseGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            backUseGradient: event.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="back-gradient" className="text-xs text-muted-foreground">
                        Use gradient
                      </label>
                    </div>
                    {vcardStyle.backUseGradient && (
                      <ColorPicker
                        label="Back Gradient"
                        value={vcardStyle.backGradient}
                        onChange={(value) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            backGradient: value,
                          }))
                        }
                        presets={fgColorPresets}
                      />
                    )}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Front Logo
                    </p>
                    <LogoUpload
                      logo={vcardStyle.frontLogoDataUrl || undefined}
                      maxLogoSize={180}
                      onLogoChange={(value) =>
                        setVcardStyle((prev) => ({ ...prev, frontLogoDataUrl: value }))
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Back Logo
                    </p>
                    <LogoUpload
                      logo={vcardStyle.backLogoDataUrl || undefined}
                      maxLogoSize={220}
                      onLogoChange={(value) =>
                        setVcardStyle((prev) => ({ ...prev, backLogoDataUrl: value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                    onClick={() => setShowVcardCustomizer(false)}
                  >
                    Save Customization
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border uppercase tracking-[0.2em] text-xs"
                    onClick={() => {
                      setVcardPreviewSide('front');
                      setShowVcardCustomizer(false);
                      // If we came from vCard contents overlay, open QR customizer
                      if (vcardFromContents) {
                        setVcardFromContents(false);
                        setShowQrCustomizer(true);
                      }
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVcardPreview && isMobile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-md px-4">
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button
              type="button"
              className="absolute -right-8 -top-8 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-primary/90 text-xs uppercase tracking-[0.3em] text-primary-foreground shadow-lg transition hover:bg-primary"
              onClick={() => setShowVcardPreview(false)}
              aria-label="Close preview"
            >
              X
            </button>
            <button
              type="button"
              onClick={() => setVcardPreviewSide((prev) => (prev === 'front' ? 'back' : 'front'))}
              className="relative h-[420px] w-[260px] sm:h-[460px] sm:w-[280px]"
              aria-label="Flip vcard preview"
            >
              <div
                className="absolute inset-0 transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: vcardPreviewSide === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className="absolute inset-0 flex flex-col justify-between p-6 text-left text-white shadow-xl"
                  style={{ ...vcardFrontStyle, backfaceVisibility: 'hidden' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">VCard</p>
                      <h3 className="text-2xl font-semibold">
                        {vcard.name || 'Your Name'}
                      </h3>
                      <p className="text-sm text-white/80">
                        {vcard.company || 'Your Company'}
                      </p>
                    </div>
                    <div
                      className="h-16 w-16 rounded-full border border-white/30 bg-white/10"
                      style={{
                        backgroundImage: vcardStyle.profilePhotoDataUrl
                          ? `url(${vcardStyle.profilePhotoDataUrl})`
                          : undefined,
                        backgroundSize: `${vcardStyle.photoZoom}%`,
                        backgroundPosition: `${vcardStyle.photoX}% ${vcardStyle.photoY}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: vcardStyle.frontFontColor, opacity: 0.9 }}>
                    <p>{vcard.phone || '+1 (555) 123-4567'}</p>
                    <p>{vcard.email || 'you@example.com'}</p>
                    <p>{vcard.website || 'qrcodestudio.app'}</p>
                  </div>
                  {vcardStyle.frontLogoDataUrl && (
                    <div className="flex justify-end">
                      <img
                        src={vcardStyle.frontLogoDataUrl}
                        alt="Front logo"
                        className="h-10 w-10 rounded-lg object-cover border border-white/20"
                      />
                    </div>
                  )}
                  <p className="text-[11px] uppercase tracking-[0.4em]" style={{ color: vcardStyle.frontFontColor, opacity: 0.7 }}>
                    Tap to flip
                  </p>
                </div>

                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-white shadow-xl"
                  style={{
                    ...vcardBackStyle,
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {vcardStyle.backLogoDataUrl ? (
                    <img
                      src={vcardStyle.backLogoDataUrl}
                      alt="VCard logo"
                      className="h-20 w-20 rounded-xl object-cover border border-white/20"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl border border-white/20 flex items-center justify-center text-xs text-white/70">
                      Logo
                    </div>
                  )}
                  <div className="space-y-2 text-sm text-center" style={{ color: vcardStyle.backFontColor, opacity: 0.9 }}>
                    <p>{vcard.about || 'A short brand statement goes here.'}</p>
                  </div>
                </div>
              </div>
            </button>
          </motion.div>
        </div>
      )}

      {showMenuBuilder && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-2 sm:px-4 py-4"
          onClick={(e) => {
            // Only close if clicking the backdrop itself, not child elements
            // Don't close if we're uploading or have files uploaded
            if (e.target === e.currentTarget && !menuUploading && menuFiles.length === 0) {
              setShowMenuBuilder(false);
              setMenuBuilderStep('menu'); // Reset step when closing
            }
          }}
        >
          <div
            className="glass-panel rounded-3xl p-4 sm:p-6 w-full max-w-4xl space-y-4 relative max-h-[90dvh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground z-10"
              onClick={() => setShowMenuBuilder(false)}
            >
              X
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Menu</p>
                <h2 className="text-2xl font-semibold">Dynamic Menu Builder</h2>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Preview Section */}
              <div className="flex flex-col items-center gap-5 w-full lg:w-auto flex-shrink-0">
                <div className="w-full rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground text-center">Preview</p>
                  <div className="flex items-center justify-center">
                    <div className="relative h-[280px] w-[180px] sm:h-[320px] sm:w-[200px] lg:h-[380px] lg:w-[240px] rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-xl">
                      {menuLogoDataUrl && menuBuilderStep !== 'menu' ? (
                        <div className="absolute left-4 top-4 h-12 w-12 rounded-full border border-white/30 bg-white/10 shadow-lg z-10">
                          <div
                            className="h-full w-full rounded-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${menuLogoDataUrl})` }}
                          />
                        </div>
                      ) : null}

                      {menuHasPdf ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                          <File className="h-10 w-10 text-primary" />
                          <p className="text-sm font-semibold text-foreground">PDF Menu</p>
                          <p className="text-xs">Tap to open the PDF on scan.</p>
                        </div>
                      ) : menuHasFlip ? (
                        <button
                          type="button"
                          className="relative h-full w-full"
                          onClick={() => setMenuFlip((prev) => !prev)}
                          aria-label="Flip menu preview"
                        >
                          <div
                            className="absolute inset-0 transition-transform duration-500"
                            style={{
                              transformStyle: 'preserve-3d',
                              transform: menuFlip ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            }}
                          >
                            <div
                              className="absolute inset-0"
                              style={{ backfaceVisibility: 'hidden' }}
                            >
                              <img
                                src={menuFiles[0]?.url}
                                alt="Menu front"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div
                              className="absolute inset-0"
                              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            >
                              <img
                                src={menuFiles[1]?.url}
                                alt="Menu back"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/80">
                            Tap to flip
                          </div>
                        </button>
                      ) : menuHasCarousel ? (
                        <div
                          className="relative h-full w-full touch-pan-y"
                          onPointerDown={handleMenuSwipeStart}
                          onPointerMove={handleMenuSwipeMove}
                          onPointerUp={handleMenuSwipeEnd}
                          onPointerLeave={handleMenuSwipeEnd}
                        >
                          {menuFiles.map((file, index) => (
                            <img
                              key={`${file.url}-${index}`}
                              src={file.url}
                              alt={`Menu page ${index + 1}`}
                              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${index === menuCarouselIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
                            />
                          ))}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/80">
                            Swipe to continue
                          </div>
                        </div>
                      ) : menuHasFiles ? (
                        <button
                          type="button"
                          className="relative h-full w-full"
                          onClick={() => {
                            if (menuBuilderStep === 'menu') {
                              menuFileInputRef.current?.click();
                            }
                          }}
                        >
                          <img
                            src={menuFiles[0]?.url}
                            alt="Menu preview"
                            className="h-full w-full object-cover"
                          />
                          {menuBuilderStep === 'menu' && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    menuFileInputRef.current?.click();
                                  }}
                                  className="text-xs"
                                >
                                  Replace
                                </Button>
                                {menuFiles.length > 1 && menuFiles.every((f) => f.type === 'image') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowMenuOrganize(true);
                                    }}
                                    className="text-xs"
                                  >
                                    Organize
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          onClick={() => menuFileInputRef.current?.click()}
                        >
                          <Utensils className="h-12 w-12 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Upload your restaurant or services menu</p>
                          <p className="text-xs">Click to upload up to 15 pages</p>
                        </button>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-white/80">
                        Luminar Apps watermark · Free Forever
                      </div>
                    </div>
                  </div>
                  {/* Social Icons Preview */}
                  {(menuBuilderStep === 'socials' || menuBuilderStep === 'logo') && (
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      {menuSocials.instagram && (
                        <div className="flex items-center gap-1 text-primary">
                          <Instagram className="h-4 w-4" />
                        </div>
                      )}
                      {menuSocials.facebook && (
                        <div className="flex items-center gap-1 text-primary">
                          <Facebook className="h-4 w-4" />
                        </div>
                      )}
                      {menuSocials.tiktok && (
                        <div className="flex items-center gap-1 text-primary">
                          <Music2 className="h-4 w-4" />
                        </div>
                      )}
                      {menuSocials.website && (
                        <div className="flex items-center gap-1 text-primary">
                          <Globe className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Section */}
              <div className="space-y-4 flex-1 min-w-0">
                <input
                  ref={menuFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleMenuFilesChange}
                  className="hidden"
                />

                {/* Step 1: Menu Upload */}
                {menuBuilderStep === 'menu' && (
                  <div className="glass-panel rounded-2xl p-4 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu Pages</p>
                    {menuUploading ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Uploading...</span>
                            <span className="font-semibold text-foreground">{Math.round(menuUploadProgress)}%</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/30">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-amber-300 transition-all duration-300 ease-out relative overflow-hidden"
                              style={{
                                width: `${menuUploadProgress}%`,
                              }}
                            >
                              {menuUploadProgress > 0 && menuUploadProgress < 100 && (
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
                        <p className="text-xs text-muted-foreground">
                          Please wait while your files are being uploaded...
                        </p>
                      </div>
                    ) : menuUploadError ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                          <p className="text-sm text-destructive font-semibold">Upload Failed</p>
                          <p className="text-xs text-destructive/80 mt-1">{menuUploadError}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            setMenuUploadError(null);
                            menuFileInputRef.current?.click();
                          }}
                          className="w-full"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : !menuHasFiles ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Upload up to 15 JPG/PNG pages or a single PDF file (max 10MB for PDFs).
                        </p>
                        <Button
                          type="button"
                          onClick={() => menuFileInputRef.current?.click()}
                          className="w-full"
                        >
                          Upload Menu
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {menuFiles.length} file{menuFiles.length === 1 ? '' : 's'} uploaded
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => menuFileInputRef.current?.click()}
                            className="flex-1"
                          >
                            Replace
                          </Button>
                          {menuFiles.length > 1 && menuFiles.every((f) => f.type === 'image') && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowMenuOrganize(true)}
                              className="flex-1"
                            >
                              Organize
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Logo Upload */}
                {menuBuilderStep === 'logo' && (
                  <div className="glass-panel rounded-2xl p-4 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Branding</p>
                    {menuLogoUploading ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Uploading logo...</span>
                            <span className="font-semibold text-foreground">{Math.round(menuLogoUploadProgress)}%</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/30">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-amber-300 transition-all duration-300 ease-out relative overflow-hidden"
                              style={{ width: `${menuLogoUploadProgress}%` }}
                            >
                              {menuLogoUploadProgress > 0 && menuLogoUploadProgress < 100 && (
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
                        <p className="text-xs text-muted-foreground">
                          Please wait while your logo is being uploaded...
                        </p>
                      </div>
                    ) : menuLogoUploadError ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                          <p className="text-sm text-destructive font-semibold">Upload Failed</p>
                          <p className="text-xs text-destructive/80 mt-1">{menuLogoUploadError}</p>
                        </div>
                        <input
                          ref={menuLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleMenuLogoChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => menuLogoInputRef.current?.click()}
                          className="w-full"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : !menuLogoDataUrl ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Upload your logo (optional)</p>
                        <input
                          ref={menuLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleMenuLogoChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => menuLogoInputRef.current?.click()}
                          className="w-full"
                        >
                          Upload Logo
                        </Button>
                        <Button
                          type="button"
                          onClick={handleMenuContinue}
                          className="w-full"
                        >
                          Continue
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Logo uploaded</p>
                        <div className="flex gap-2">
                          <input
                            ref={menuLogoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleMenuLogoChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => menuLogoInputRef.current?.click()}
                            className="flex-1"
                          >
                            Replace
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleMenuContinue}
                            className="flex-1"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback: If step is invalid, show menu step */}
                {!['menu', 'logo', 'socials'].includes(menuBuilderStep) && (
                  <div className="glass-panel rounded-2xl p-4 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu Builder</p>
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                )}

                {/* Step 3: Social Links */}
                {menuBuilderStep === 'socials' && (
                  <div className="glass-panel rounded-2xl p-4 space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Social Links (Optional)</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3">
                        <Instagram className="h-4 w-4 text-primary" />
                        <Input
                          value={menuSocials.instagram}
                          onChange={(e) => setMenuSocials((prev) => ({ ...prev, instagram: e.target.value }))}
                          placeholder="Instagram URL"
                          className="border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3">
                        <Facebook className="h-4 w-4 text-primary" />
                        <Input
                          value={menuSocials.facebook}
                          onChange={(e) => setMenuSocials((prev) => ({ ...prev, facebook: e.target.value }))}
                          placeholder="Facebook URL"
                          className="border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3">
                        <Music2 className="h-4 w-4 text-primary" />
                        <Input
                          value={menuSocials.tiktok}
                          onChange={(e) => setMenuSocials((prev) => ({ ...prev, tiktok: e.target.value }))}
                          placeholder="TikTok URL"
                          className="border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3">
                        <Globe className="h-4 w-4 text-primary" />
                        <Input
                          value={menuSocials.website}
                          onChange={(e) => setMenuSocials((prev) => ({ ...prev, website: e.target.value }))}
                          placeholder="Website URL"
                          className="border-0 bg-transparent"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleMenuContinue}
                        className="w-full"
                      >
                        Continue to Customization
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organize Menu Pages Overlay */}
      {showMenuOrganize && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-md px-4 py-4"
          onClick={() => setShowMenuOrganize(false)}
        >
          <div
            className="glass-panel rounded-3xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Organize Pages</p>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
                onClick={() => setShowMenuOrganize(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {menuFiles.map((file, index) => (
                <div key={`${file.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <span className="text-sm font-semibold min-w-[60px]">Page {index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <img src={file.url} alt={`Page ${index + 1}`} className="h-12 w-12 object-cover rounded" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveMenuFile(index, -1)}
                      disabled={index === 0}
                      className="rounded border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMenuFile(index, 1)}
                      disabled={index === menuFiles.length - 1}
                      className="rounded border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => setShowMenuOrganize(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* VCard Contents Overlay - Step 3 */}
      {showVcardContents && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-2 sm:px-4 py-4"
          onClick={() => setShowVcardContents(false)}
        >
          <div
            className="glass-panel rounded-3xl p-4 sm:p-6 w-full max-w-4xl space-y-4 relative max-h-[90dvh] overflow-y-auto overscroll-contain"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground z-10"
              onClick={() => setShowVcardContents(false)}
            >
              X
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">VCard</p>
                <h2 className="text-2xl font-semibold">Enter your contact information</h2>
                <p className="text-sm text-muted-foreground">
                  Fill in your details to create your virtual business card.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  value={vcard.name}
                  onChange={(e) => setVcard((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full Name"
                  className="bg-secondary/50 border-border"
                />
                <Input
                  value={vcard.company}
                  onChange={(e) => setVcard((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder="Company"
                  className="bg-secondary/50 border-border"
                />
                <Input
                  value={vcard.phone}
                  onChange={(e) => setVcard((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                  className="bg-secondary/50 border-border"
                />
                <Input
                  value={vcard.email}
                  onChange={(e) => setVcard((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  className="bg-secondary/50 border-border"
                />
                <Input
                  value={vcard.website}
                  onChange={(e) => setVcard((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="Website"
                  className="bg-secondary/50 border-border"
                />
                <Input
                  value={vcard.slug}
                  onChange={(e) => setVcard((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="Profile Slug (optional)"
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Textarea
                  value={vcard.about}
                  onChange={(e) => setVcard((prev) => ({ ...prev, about: e.target.value }))}
                  placeholder="About Me (max 250 characters)"
                  maxLength={250}
                  className="bg-secondary/50 border-border"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Virtual card hosted at QR Code Studio</span>
                  <span>{vcard.about.length}/250</span>
                </div>
                <Input
                  value={vcardUrl || 'https://qrcode.luminarapps.com/your-handle'}
                  readOnly
                  className="bg-secondary/40 border-border text-xs text-muted-foreground"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border border-amber-400/80 bg-amber-200/60 text-amber-900 shadow-[0_0_18px_rgba(251,191,36,0.15)] hover:border-amber-400 hover:bg-amber-200/70 uppercase tracking-[0.2em] text-xs dark:border-amber-300/70 dark:bg-amber-300/15 dark:text-amber-200 dark:hover:border-amber-300 dark:hover:bg-amber-300/25"
                  onClick={() => {
                    setShowVcardContents(false);
                    setVcardFromContents(true);
                    setShowVcardCustomizer(true);
                    setVcardPreviewSide('front');
                  }}
                >
                  Customize VCard
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-1 gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                  disabled={!vcard.name}
                  onClick={() => {
                    setShowVcardContents(false);
                    setShowQrCustomizer(true);
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Customization Overlay - Mobile V2 and Desktop */}
      {showQrCustomizer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-2 sm:px-4 py-4"
          onClick={() => setShowQrCustomizer(false)}
        >
          <div
            className="glass-panel rounded-3xl p-4 sm:p-6 w-full max-w-4xl space-y-4 relative max-h-[90dvh] overflow-y-auto overscroll-contain"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground z-10"
              onClick={() => setShowQrCustomizer(false)}
            >
              X
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">QR Code</p>
                <h2 className="text-2xl font-semibold">Customize your QR</h2>
                <p className="text-sm text-muted-foreground">
                  Adjust colors, style, and logo to match your brand.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* QR Preview */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">QR Preview</p>
                <div className="flex justify-center">
                  <QRPreview
                    ref={qrRef}
                    options={previewOptions}
                    isGenerating={isGenerating}
                    contentOverride={previewContent}
                    showCaption={hasGenerated}
                  />
                </div>
              </div>

              <Accordion type="multiple" defaultValue={['colors', 'style', 'logo']} className="space-y-2">
                <AccordionItem value="colors" className="border-none">
                  <AccordionTrigger
                    className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline"
                    onClick={() => {
                      window.setTimeout(() => scrollToRef(colorsSectionRef, 'start'), 30);
                    }}
                  >
                    <span className="text-sm font-medium">Colors</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div ref={colorsSectionRef} className="space-y-5">
                      <ColorPicker
                        label="Foreground Color"
                        value={options.fgColor}
                        onChange={(v) => updateOption('fgColor', v)}
                        presets={fgColorPresets}
                      />
                      <ColorPicker
                        label="Background Color"
                        value={options.bgColor}
                        onChange={(v) => updateOption('bgColor', v)}
                        presets={bgColorPresets}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="style" className="border-none">
                  <AccordionTrigger
                    className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline"
                    onClick={() => {
                      window.setTimeout(() => scrollToRef(styleSectionRef, 'start'), 30);
                    }}
                  >
                    <span className="text-sm font-medium">Style</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div ref={styleSectionRef} className="space-y-5">
                      <CornerStylePicker
                        value={options.cornerStyle}
                        onChange={(v) => updateOption('cornerStyle', v)}
                      />
                      <ErrorCorrectionSelector
                        value={options.errorCorrectionLevel}
                        onChange={(v) => updateOption('errorCorrectionLevel', v)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="logo" className="border-none">
                  <AccordionTrigger
                    className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline"
                    onClick={() => {
                      window.setTimeout(() => scrollToRef(logoSectionRef, 'start'), 30);
                    }}
                  >
                    <span className="text-sm font-medium">Logo</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div ref={logoSectionRef} className="space-y-4">
                      <LogoUpload
                        logo={options.logo}
                        maxLogoSize={Math.round((options.size - 32) * 0.22)}
                        onLogoChange={(v, meta) => {
                          updateOption('logo', v);
                          updateOption('logoAspect', meta?.aspect);
                          updateOption('logoWidth', meta?.width);
                          updateOption('logoHeight', meta?.height);
                        }}
                      />
                      {options.logo && (
                        <div>
                          <SizeSlider
                            value={options.logoSize || 50}
                            onChange={(v) => updateOption('logoSize', v)}
                            min={20}
                            max={100}
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="px-4 pb-4 pt-2 space-y-3">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                  disabled={!canGenerate}
                  onClick={() => {
                    setShowQrCustomizer(false);
                    // Reset name to default if needed
                    const defaultName = qrType === 'file' ? fileName || 'File QR' : 'QRC Untitled 1';
                    setQrName(defaultName);
                    setShowNameOverlay(true);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-8 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.28),transparent_60%)] blur-3xl float-slow" />
        <div className="absolute top-4 right-6 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22),transparent_60%)] blur-3xl float-medium" />
        <div className="absolute inset-x-0 top-1/4 h-72 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-30 glass-panel border-b border-border/50 transition ${
          showGuestWelcome || isBooting ? 'blur-md pointer-events-none select-none' : ''
        } ${showEasterEggBanner ? 'qrc-header-with-banner' : ''}`}
      >
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between overflow-visible">
          <button
            type="button"
            className="flex items-center gap-3 text-left"
            onClick={() => setActiveTab('studio')}
            aria-label="Go to Studio"
          >
            <div className="h-10 w-10 rounded-xl overflow-hidden">
              <img
                src="/assets/QRC App Icon.png"
                alt="QRC App Icon"
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text tracking-wide">QR Code Studio</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.25em] sm:text-xs sm:tracking-[0.3em]">
              The last QR you&apos;ll ever need
            </p>
            </div>
          </button>
          <div className="relative hidden lg:flex flex-col items-center">
          <nav className="hidden lg:flex items-end gap-6 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isAdaptive = item.id === 'adaptive';
              const iconConfig = item.id === 'studio'
                ? { Icon: Paintbrush, color: 'text-muted-foreground' }
                : item.id === 'codes'
                  ? { Icon: QrCode, color: 'text-muted-foreground' }
                : item.id === 'analytics'
                    ? { Icon: BarChart3, color: 'text-muted-foreground' }
                    : item.id === 'settings'
                      ? { Icon: Settings, color: 'text-muted-foreground' }
                      : item.id === 'adaptive'
                        ? { Icon: QrCode, color: 'text-amber-300' }
                        : { Icon: Star, color: 'text-amber-300' };
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as typeof activeTab);
                  }}
                  onMouseLeave={() => setNavHint('')}
                  className={`group relative flex items-center justify-center min-w-[92px] px-1 pb-2 text-center transition-all before:absolute before:-top-2 before:left-0 before:h-[2px] before:w-full before:rounded-full before:bg-gradient-to-r before:from-primary before:to-amber-200 before:opacity-0 before:transition ${
                    isActive
                      ? 'text-foreground before:opacity-100'
                      : 'text-muted-foreground hover:text-foreground hover:before:opacity-80'
                  } ${isAdaptive ? 'font-semibold' : ''}`}
                >
                  <span className="relative inline-flex h-7 w-full items-center justify-center overflow-hidden">
                    <span className={`transform transition-all duration-200 ${isAdaptive ? adaptiveGradientText : ''} group-hover:-translate-y-4 group-hover:opacity-0`}>
                      {item.label}
                    </span>
                    <span className={`absolute inset-0 flex items-center justify-center translate-y-4 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 ${iconConfig.color}`}>
                      <iconConfig.Icon className={`h-6 w-6 ${item.id === 'upgrade' ? 'fill-current' : ''}`} />
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
          {navHint ? (
            <div className="absolute top-full mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {navHint}
            </div>
          ) : null}
          </div>
          <div className="flex items-center gap-3 overflow-visible">
            <div data-tour-id="dark-mode" className="flex items-center">
              <ThemeToggle storageKey={isLoggedIn && user?.id ? `theme:${user.id}` : 'theme:guest'} />
            </div>
            <div className="relative group overflow-visible">
              <UserMenu
                onSignOut={handleSignOut}
                trigger={
                  <button
                    type="button"
                    className="relative h-10 w-10 rounded-lg border border-border/60 bg-secondary/50 flex items-center justify-center transition hover:border-primary/50 overflow-visible"
                    data-tour-id="profile-icon"
                    aria-label="My Account"
                  >
                    {hasSavedAvatar && headerAvatarColor ? (
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-md ${headerAvatarColor.bg} ${headerAvatarColor.text}`}
                      >
                        {headerAvatarType === 'letter' ? (
                          <span className="text-xs font-semibold">{avatarLetter}</span>
                        ) : headerAvatarType === 'cap' ? (
                          <GraduationCap className="h-4 w-4" />
                        ) : headerAvatarType === 'bun' ? (
                          <UserRound className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </span>
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                    )}
                  </button>
                }
              />
              <div className="pointer-events-none absolute right-0 top-full mt-2 w-40 opacity-0 transition group-hover:opacity-100">
                <div className="rounded-xl border border-border/60 bg-card/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
                  <p className="font-semibold">My Account</p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Free Plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {isMobile && (
        <>
          <button
            type="button"
            className={`fixed bottom-6 ${isLeftie ? 'left-6' : 'right-6'} flex items-center justify-center rounded-full border border-amber-300/50 bg-card/80 p-2 shadow-lg shadow-[0_0_14px_rgba(251,191,36,0.2)] transition hover:border-amber-300/70 hover:bg-card ${
              isDialOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            } ${tourActive && isTourDialStep ? 'z-[95]' : 'z-[70]'}`}
            data-tour-id="dial-open"
            aria-label="Open navigation dial"
            onClick={() => setIsDialOpen(true)}
          >
            <img
              src="/assets/QRC Studio Logo Button.png"
              alt="Open QR Code Studio navigation"
              className="h-14 w-14"
              loading="lazy"
            />
          </button>

          {isDialOpen && (
            <div
              className="fixed inset-0 z-[90] bg-background/90 backdrop-blur-md"
              onClick={() => setIsDialOpen(false)}
            >
              <div className="absolute inset-0">
                <div
                  className={`absolute ${isLeftie ? 'right-6 text-right' : 'left-6 text-left'} top-1/2 z-10 w-[45%] -translate-y-1/2 space-y-2`}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Navigation</p>
                  <button
                    type="button"
                    className={`w-full ${isLeftie ? 'text-right' : 'text-left'}`}
                    onClick={() => {
                      playDialSelect();
                      setActiveTab(dialActive.id as typeof activeTab);
                      setIsDialOpen(false);
                    }}
                  >
                    <span
                      className={`block text-2xl font-semibold tracking-tight ${dialActive?.id === 'adaptive' ? adaptiveGradientText : 'text-foreground'}`}
                    >
                      {dialActive?.label}
                    </span>
                  <span className="block text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      {dialDescriptions[dialActive?.id ?? 'studio']}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  className={`absolute ${isLeftie ? 'left-6' : 'right-6'} top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground transition hover:border-primary/60 hover:text-primary`}
                  onClick={() => setIsDialOpen(false)}
                  aria-label="Close navigation dial"
                  data-tour-id="dial-close"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-center text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  <div className={`${dialHintStage >= 1 && dialHintStage < 3 ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                    <DecodeText text="Drag to rotate" active={dialHintStage === 1} />
                  </div>
                  <div className={`${dialHintStage >= 2 && dialHintStage < 3 ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                    <DecodeText text="Tap to select" active={dialHintStage === 2} />
                  </div>
                </div>

                <div
                  className="absolute top-1/2 z-20 flex-none overflow-visible"
                  style={{
                    ...(isLeftie ? { left: 0 } : { right: 0 }),
                    width: dialSize,
                    height: dialSize,
                    minWidth: dialSize,
                    minHeight: dialSize,
                    transform: isLeftie ? 'translate(-50%, -50%)' : 'translate(50%, -50%)',
                    touchAction: 'none',
                  }}
                  data-tour-id="dial-panel"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement | null;
                    dialDragThresholdRef.current = false;
                    if (dialAnimationRef.current !== null) {
                      window.cancelAnimationFrame(dialAnimationRef.current);
                      dialAnimationRef.current = null;
                    }
                    if (dialMomentumRef.current !== null) {
                      window.cancelAnimationFrame(dialMomentumRef.current);
                      dialMomentumRef.current = null;
                    }
                    dialStartRef.current = { y: event.clientY, angle: dialAngle };
                    dialMomentumLastAngleRef.current = dialAngle;
                    dialMomentumLastTimeRef.current = window.performance.now();
                    dialMomentumVelocityRef.current = 0;
                    setDialDragging(true);
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!dialDragging) return;
                    const deltaY = event.clientY - dialStartRef.current.y;
                    const direction = isLeftie ? 1 : -1;
                    const nextAngle = dialStartRef.current.angle + deltaY * dialDragSensitivity * direction;
                    const now = window.performance.now();
                    const dt = now - dialMomentumLastTimeRef.current;
                    if (dt > 0) {
                      dialMomentumVelocityRef.current =
                        (nextAngle - dialMomentumLastAngleRef.current) / dt;
                      dialMomentumLastAngleRef.current = nextAngle;
                      dialMomentumLastTimeRef.current = now;
                    }
                    if (!dialDragThresholdRef.current && Math.abs(deltaY) > 4) {
                      dialDragThresholdRef.current = true;
                    }
                    setDialAngle(nextAngle);
                  }}
                  onPointerUp={(event) => {
                    setDialDragging(false);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    const velocity = dialMomentumVelocityRef.current;
                    if (Math.abs(velocity) > dialMomentumThreshold) {
                      startDialMomentum(velocity);
                    }
                  }}
                  onPointerCancel={() => {
                    setDialDragging(false);
                  }}
                >
                  {/* SVG Dial - Rotating Parts */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      transform: `rotate(${dialAngle}deg)`,
                      transformOrigin: 'center',
                      width: '100%',
                      height: '100%',
                      willChange: 'transform', // GPU acceleration hint for smoother rotation
                    }}
                  >
                    <svg
                      viewBox="0 0 400 400"
                      className="absolute"
                      style={{
                        width: `${dialSize * 1.2}px`, // Make SVG 20% larger than dial container
                        height: `${dialSize * 1.2}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <style>{`
                          .dial-st0 { fill: #191a1e; }
                          .dial-st1 { fill: url(#linear-gradient2); }
                          .dial-st2 { fill: url(#linear-gradient1); }
                          .dial-st3 { fill: url(#linear-gradient9); }
                          .dial-st4 { fill: url(#linear-gradient3); }
                          .dial-st5 { fill: url(#linear-gradient6); }
                          .dial-st6 { fill: url(#linear-gradient8); }
                          .dial-st7 { fill: url(#linear-gradient7); }
                          .dial-st8 { fill: url(#linear-gradient5); }
                          .dial-st9 { fill: url(#linear-gradient4); }
                          .dial-st10 { fill: url(#linear-gradient31); }
                          .dial-st11 { fill: url(#linear-gradient30); }
                          .dial-st12 { fill: url(#linear-gradient38); }
                          .dial-st13 { fill: url(#linear-gradient32); }
                          .dial-st14 { fill: url(#linear-gradient61); }
                          .dial-st15 { fill: url(#linear-gradient60); }
                          .dial-st16 { fill: url(#linear-gradient62); }
                          .dial-st17 { fill: url(#linear-gradient69); }
                          .dial-st18 { fill: url(#linear-gradient65); }
                          .dial-st19 { fill: url(#linear-gradient68); }
                          .dial-st20 { fill: url(#linear-gradient67); }
                          .dial-st21 { fill: url(#linear-gradient64); }
                          .dial-st22 { fill: url(#linear-gradient63); }
                          .dial-st23 { fill: url(#linear-gradient66); }
                          .dial-st24 { fill: url(#linear-gradient71); }
                          .dial-st25 { fill: url(#linear-gradient70); }
                          .dial-st26 { fill: url(#linear-gradient39); }
                          .dial-st27 { fill: url(#linear-gradient34); }
                          .dial-st28 { fill: url(#linear-gradient37); }
                          .dial-st29 { fill: url(#linear-gradient35); }
                          .dial-st30 { fill: url(#linear-gradient33); }
                          .dial-st31 { fill: url(#linear-gradient36); }
                          .dial-st32 { fill: url(#linear-gradient80); }
                          .dial-st33 { fill: url(#linear-gradient81); }
                          .dial-st34 { fill: url(#linear-gradient40); }
                          .dial-st35 { fill: url(#linear-gradient41); }
                          .dial-st36 { fill: url(#linear-gradient42); }
                          .dial-st37 { fill: url(#linear-gradient46); }
                          .dial-st38 { fill: url(#linear-gradient48); }
                          .dial-st39 { fill: url(#linear-gradient43); }
                          .dial-st40 { fill: url(#linear-gradient44); }
                          .dial-st41 { fill: url(#linear-gradient47); }
                          .dial-st42 { fill: url(#linear-gradient45); }
                          .dial-st43 { fill: url(#linear-gradient49); }
                          .dial-st44 { fill: url(#linear-gradient89); }
                          .dial-st45 { fill: url(#linear-gradient88); }
                          .dial-st46 { fill: url(#linear-gradient83); }
                          .dial-st47 { fill: url(#linear-gradient85); }
                          .dial-st48 { fill: url(#linear-gradient79); }
                          .dial-st49 { fill: url(#linear-gradient87); }
                          .dial-st50 { fill: url(#linear-gradient78); }
                          .dial-st51 { fill: url(#linear-gradient77); }
                          .dial-st52 { fill: url(#linear-gradient76); }
                          .dial-st53 { fill: url(#linear-gradient84); }
                          .dial-st54 { fill: url(#linear-gradient82); }
                          .dial-st55 { fill: url(#linear-gradient86); }
                          .dial-st56 { fill: url(#linear-gradient75); }
                          .dial-st57 { fill: url(#linear-gradient73); }
                          .dial-st58 { fill: url(#linear-gradient74); }
                          .dial-st59 { fill: url(#linear-gradient72); }
                          .dial-st60 { fill: url(#linear-gradient50); }
                          .dial-st61 { fill: url(#linear-gradient51); }
                          .dial-st62 { fill: url(#linear-gradient52); }
                          .dial-st63 { fill: url(#linear-gradient59); }
                          .dial-st64 { fill: url(#linear-gradient53); }
                          .dial-st65 { fill: url(#linear-gradient56); }
                          .dial-st66 { fill: url(#linear-gradient54); }
                          .dial-st67 { fill: url(#linear-gradient57); }
                          .dial-st68 { fill: url(#linear-gradient55); }
                          .dial-st69 { fill: url(#linear-gradient58); }
                          .dial-st70 { fill: url(#linear-gradient28); }
                          .dial-st71 { fill: url(#linear-gradient29); }
                          .dial-st72 { fill: url(#linear-gradient18); }
                          .dial-st73 { fill: url(#linear-gradient13); }
                          .dial-st74 { fill: url(#linear-gradient12); }
                          .dial-st75 { fill: url(#linear-gradient15); }
                          .dial-st76 { fill: url(#linear-gradient16); }
                          .dial-st77 { fill: url(#linear-gradient11); }
                          .dial-st78 { fill: url(#linear-gradient10); }
                          .dial-st79 { fill: url(#linear-gradient17); }
                          .dial-st80 { fill: url(#linear-gradient14); }
                          .dial-st81 { fill: url(#linear-gradient19); }
                          .dial-st82 { fill: url(#linear-gradient23); }
                          .dial-st83 { fill: url(#linear-gradient22); }
                          .dial-st84 { fill: url(#linear-gradient24); }
                          .dial-st85 { fill: url(#linear-gradient25); }
                          .dial-st86 { fill: url(#linear-gradient21); }
                          .dial-st87 { fill: url(#linear-gradient20); }
                          .dial-st88 { fill: url(#linear-gradient27); }
                          .dial-st89 { fill: url(#linear-gradient26); }
                          .dial-st90 { fill: url(#linear-gradient); }
                        `}</style>
                        <linearGradient id="linear-gradient" x1="-37.01" y1="239.4" x2="-31.77" y2="239.4" gradientTransform="translate(446.04 45.95) rotate(90)" gradientUnits="userSpaceOnUse">
                          <stop offset=".12" stopColor="#e8b327"/>
                          <stop offset=".93" stopColor="#9b8c64"/>
                        </linearGradient>
                        <linearGradient id="linear-gradient1" x1="-36.7" y1="266.02" x2="-30.81" y2="266.02" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient2" x1="-35.49" y1="212.91" x2="-28.9" y2="212.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient3" x1="-33.35" y1="292.25" x2="-26.04" y2="292.25" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient4" x1="-30.3" y1="187.07" x2="-22.26" y2="187.07" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient5" x1="-26.34" y1="317.57" x2="-17.56" y2="317.57" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient6" x1="-21.5" y1="162.39" x2="-11.98" y2="162.39" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient7" x1="-15.78" y1="341.5" x2="-5.54" y2="341.5" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient8" x1="-9.25" y1="139.34" x2="1.73" y2="139.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient9" x1="-1.92" y1="363.54" x2="9.81" y2="363.54" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient10" x1="6.18" y1="118.43" x2="18.63" y2="118.43" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient11" x1="14.99" y1="383.21" x2="28.17" y2="383.21" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient12" x1="24.47" y1="100.1" x2="38.37" y2="100.1" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient13" x1="34.57" y1="400.11" x2="49.19" y2="400.11" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient14" x1="45.25" y1="84.7" x2="60.56" y2="84.7" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient15" x1="56.46" y1="413.91" x2="72.41" y2="413.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient16" x1="68.15" y1="72.56" x2="84.68" y2="72.56" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient17" x1="80.25" y1="424.34" x2="97.27" y2="424.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient18" x1="92.72" y1="63.91" x2="110.13" y2="63.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient19" x1="105.5" y1="431.17" x2="123.2" y2="431.17" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient20" x1="118.52" y1="58.92" x2="136.43" y2="58.92" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient21" x1="131.72" y1="434.3" x2="149.73" y2="434.3" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient22" x1="145.02" y1="57.56" x2="163.07" y2="57.56" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient23" x1="158.37" y1="434.3" x2="176.37" y2="434.3" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient24" x1="171.68" y1="58.92" x2="189.57" y2="58.92" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient25" x1="184.89" y1="431.17" x2="202.59" y2="431.17" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient26" x1="197.97" y1="63.91" x2="215.37" y2="63.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient27" x1="210.83" y1="424.34" x2="227.85" y2="424.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient28" x1="223.42" y1="72.56" x2="239.95" y2="72.56" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient29" x1="235.68" y1="413.92" x2="251.63" y2="413.92" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient30" x1="247.53" y1="84.7" x2="262.84" y2="84.7" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient31" x1="258.92" y1="400.11" x2="273.53" y2="400.11" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient32" x1="269.73" y1="100.1" x2="283.63" y2="100.1" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient33" x1="279.93" y1="383.21" x2="293.1" y2="383.21" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient34" x1="289.47" y1="118.43" x2="301.91" y2="118.43" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient35" x1="298.29" y1="363.53" x2="310.01" y2="363.53" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient36" x1="313.63" y1="341.5" x2="323.88" y2="341.5" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient37" x1="306.36" y1="139.34" x2="317.34" y2="139.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient38" x1="320.08" y1="162.39" x2="329.59" y2="162.39" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient39" x1="325.66" y1="317.57" x2="334.44" y2="317.57" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient40" x1="330.36" y1="187.07" x2="338.4" y2="187.07" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient41" x1="334.14" y1="292.25" x2="341.45" y2="292.25" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient42" x1="337" y1="212.91" x2="343.59" y2="212.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient43" x1="338.91" y1="266.02" x2="344.8" y2="266.02" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient44" x1="339.87" x2="345.11" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient45" x1="145.02" y1="57.56" x2="163.07" y2="57.56" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient46" x1="118.52" y1="58.92" x2="136.43" y2="58.92" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient47" x1="92.72" y1="63.91" x2="110.13" y2="63.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient48" x1="68.15" y1="72.56" x2="84.68" y2="72.56" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient49" x1="45.25" y1="84.7" x2="60.56" y2="84.7" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient50" x1="24.47" y1="100.1" x2="38.37" y2="100.1" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient51" x1="6.18" y1="118.43" x2="18.63" y2="118.43" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient52" x1="-9.25" y1="139.34" x2="1.73" y2="139.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient53" x1="-21.5" y1="162.39" x2="-11.98" y2="162.39" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient54" x1="-30.3" y1="187.07" x2="-22.26" y2="187.07" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient55" x1="-35.49" y1="212.91" x2="-28.9" y2="212.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient56" x1="-36.7" y1="266.02" x2="-30.81" y2="266.02" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient57" x1="-33.35" y1="292.25" x2="-26.04" y2="292.25" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient58" x1="-26.34" y1="317.57" x2="-17.56" y2="317.57" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient59" x1="-15.78" y1="341.5" x2="-5.54" y2="341.5" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient60" x1="-1.92" y1="363.54" x2="9.81" y2="363.54" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient61" x1="14.99" y1="383.21" x2="28.17" y2="383.21" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient62" x1="34.57" y1="400.11" x2="49.19" y2="400.11" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient63" x1="56.46" y1="413.91" x2="72.41" y2="413.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient64" x1="80.25" y1="424.34" x2="97.27" y2="424.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient65" x1="105.5" y1="431.17" x2="123.2" y2="431.17" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient66" x1="131.72" y1="434.3" x2="149.73" y2="434.3" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient67" x1="158.37" y1="434.3" x2="176.37" y2="434.3" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient68" x1="184.89" y1="431.17" x2="202.59" y2="431.17" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient69" x1="210.83" y1="424.34" x2="227.85" y2="424.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient70" x1="235.68" y1="413.92" x2="251.63" y2="413.92" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient71" x1="258.92" y1="400.11" x2="273.53" y2="400.11" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient72" x1="279.93" y1="383.21" x2="293.1" y2="383.21" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient73" x1="298.29" y1="363.53" x2="310.01" y2="363.53" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient74" x1="313.63" y1="341.5" x2="323.88" y2="341.5" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient75" x1="325.66" y1="317.57" x2="334.44" y2="317.57" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient76" x1="334.14" y1="292.25" x2="341.45" y2="292.25" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient77" x1="338.91" y1="266.02" x2="344.8" y2="266.02" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient78" x1="339.87" x2="345.11" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient79" x1="337" y1="212.91" x2="343.59" y2="212.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient80" x1="330.36" y1="187.07" x2="338.4" y2="187.07" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient81" x1="320.08" y1="162.39" x2="329.59" y2="162.39" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient82" x1="306.36" y1="139.34" x2="317.34" y2="139.34" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient83" x1="289.47" y1="118.43" x2="301.91" y2="118.43" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient84" x1="269.73" y1="100.1" x2="283.63" y2="100.1" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient85" x1="247.53" y1="84.7" x2="262.84" y2="84.7" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient86" x1="223.42" y1="72.56" x2="239.95" y2="72.56" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient87" x1="197.97" y1="63.91" x2="215.37" y2="63.91" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient88" x1="171.68" y1="58.92" x2="189.57" y2="58.92" xlinkHref="#linear-gradient"/>
                        <linearGradient id="linear-gradient89" x1="9.04" y1="200" x2="390.96" y2="200" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="#f9f297"/>
                          <stop offset=".3" stopColor="#e0ab3d"/>
                          <stop offset=".73" stopColor="#f9f39a"/>
                          <stop offset="1" stopColor="#b78a43"/>
                        </linearGradient>
                      </defs>
                      {/* Bezel teeth (45 circles) */}
                      <g>
                        <path className="dial-st90" d="M206.47,14.17c-3.78-.13-7.04-2.2-8.85-5.22.79,0,1.57-.01,2.36-.01,5.28,0,10.51.21,15.68.64-2.01,2.89-5.41,4.73-9.19,4.6Z"/>
                        <path className="dial-st2" d="M171.03,11.11c5.9-.9,11.9-1.52,17.96-1.87-1.59,3.14-4.69,5.44-8.46,5.83-3.77.4-7.3-1.21-9.51-3.97Z"/>
                        <path className="dial-st1" d="M232.26,16.89c-3.74-.66-6.68-3.17-8.05-6.43,6.03.76,11.97,1.81,17.81,3.13-2.39,2.6-6.02,3.96-9.76,3.3Z"/>
                        <path className="dial-st4" d="M145,16.96c5.75-1.72,11.61-3.18,17.57-4.36-1.14,3.35-3.89,6.07-7.58,6.99-3.69.92-7.41-.19-9.99-2.62Z"/>
                        <path className="dial-st9" d="M257.43,23.16c-3.61-1.17-6.19-4.09-7.08-7.51,5.86,1.6,11.6,3.47,17.22,5.59-2.74,2.25-6.53,3.09-10.14,1.92Z"/>
                        <path className="dial-st8" d="M120.07,26.4c5.46-2.52,11.06-4.79,16.79-6.79-.66,3.48-3.01,6.57-6.54,7.99-3.53,1.43-7.36.85-10.25-1.2Z"/>
                        <path className="dial-st5" d="M281.48,32.88c-3.42-1.67-5.56-4.91-5.97-8.43,5.56,2.4,10.99,5.05,16.26,7.95-3.02,1.84-6.88,2.14-10.29.48Z"/>
                        <path className="dial-st7" d="M96.72,39.22c5.05-3.26,10.28-6.28,15.64-9.05-.16,3.53-2.06,6.91-5.36,8.81-3.28,1.89-7.15,1.86-10.29.25Z"/>
                        <path className="dial-st6" d="M303.95,45.85c-3.15-2.12-4.81-5.61-4.73-9.15,5.15,3.14,10.14,6.52,14.96,10.11-3.24,1.39-7.09,1.15-10.23-.97Z"/>
                        <path className="dial-st3" d="M75.37,55.17c4.56-3.93,9.3-7.64,14.22-11.13.32,3.51-1.1,7.11-4.09,9.44-2.98,2.33-6.81,2.84-10.14,1.69Z"/>
                        <path className="dial-st78" d="M324.39,61.82c-2.81-2.54-3.97-6.21-3.41-9.69,4.66,3.82,9.13,7.84,13.4,12.08-3.39.91-7.17.14-9.99-2.39Z"/>
                        <path className="dial-st77" d="M56.42,73.91c3.97-4.52,8.16-8.85,12.53-12.97.79,3.43-.11,7.17-2.74,9.89-2.62,2.72-6.34,3.76-9.8,3.08Z"/>
                        <path className="dial-st74" d="M342.41,80.48c-2.43-2.9-3.07-6.7-2.04-10.06,4.09,4.42,7.96,9.03,11.61,13.82-3.49.44-7.13-.86-9.57-3.76Z"/>
                        <path className="dial-st73" d="M40.25,95.12c3.31-5.04,6.86-9.91,10.62-14.6,1.27,3.28.9,7.12-1.32,10.19-2.23,3.07-5.78,4.61-9.3,4.41Z"/>
                        <path className="dial-st80" d="M366.64,106.51c-3.53-.04-6.96-1.83-8.98-5.05-2.01-3.21-2.11-7.07-.61-10.26,3.43,4.94,6.63,10.05,9.59,15.31Z"/>
                        <path className="dial-st75" d="M27.19,118.37c2.58-5.46,5.42-10.79,8.5-15.95,1.73,3.08,1.9,6.94.12,10.29-1.78,3.35-5.09,5.37-8.62,5.66Z"/>
                        <path className="dial-st76" d="M378.05,130.63c-3.5-.54-6.66-2.79-8.21-6.26-1.54-3.46-1.1-7.32.84-10.27,2.71,5.37,5.17,10.89,7.37,16.53Z"/>
                        <path className="dial-st79" d="M17.5,143.22c1.8-5.8,3.87-11.47,6.19-17.02,2.14,2.81,2.86,6.63,1.56,10.21-1.3,3.58-4.3,6.04-7.75,6.81Z"/>
                        <path className="dial-st72" d="M385.96,156.08c-3.39-1.02-6.2-3.68-7.25-7.33-1.05-3.66-.08-7.42,2.26-10.07,1.93,5.68,3.6,11.49,4.98,17.4Z"/>
                        <path className="dial-st81" d="M11.39,169.16c.97-6,2.23-11.9,3.75-17.7,2.51,2.49,3.75,6.17,2.96,9.88-.79,3.72-3.41,6.57-6.71,7.82Z"/>
                        <path className="dial-st87" d="M390.24,182.38c-3.2-1.48-5.6-4.51-6.13-8.26-.53-3.76.96-7.34,3.63-9.65,1.11,5.88,1.94,11.85,2.5,17.91Z"/>
                        <path className="dial-st86" d="M8.96,195.69c.13-6.07.55-12.09,1.24-18.01,2.83,2.11,4.55,5.58,4.28,9.35-.26,3.77-2.45,6.95-5.53,8.65Z"/>
                        <path className="dial-st83" d="M390.83,209.03c-2.96-1.91-4.91-5.24-4.91-9.03s1.96-7.12,4.91-9.03c.14,2.99.21,6,.21,9.03s-.07,6.04-.21,9.03Z"/>
                        <path className="dial-st82" d="M10.21,222.32c-.69-5.92-1.11-11.93-1.24-18,3.08,1.7,5.26,4.88,5.53,8.65.26,3.78-1.46,7.24-4.28,9.35Z"/>
                        <path className="dial-st84" d="M387.74,235.53c-2.67-2.31-4.16-5.89-3.63-9.64.53-3.75,2.93-6.77,6.12-8.25-.55,6.06-1.39,12.02-2.49,17.9Z"/>
                        <path className="dial-st85" d="M15.14,248.54c-1.52-5.8-2.78-11.7-3.75-17.7,3.3,1.25,5.92,4.11,6.71,7.82.79,3.72-.45,7.4-2.96,9.88Z"/>
                        <path className="dial-st89" d="M380.98,261.32c-2.35-2.66-3.32-6.41-2.27-10.07,1.05-3.65,3.86-6.31,7.25-7.33-1.39,5.91-3.05,11.71-4.98,17.4Z"/>
                        <path className="dial-st88" d="M23.69,273.8c-2.33-5.54-4.4-11.22-6.19-17.02,3.45.78,6.45,3.24,7.75,6.81,1.3,3.58.59,7.39-1.56,10.21Z"/>
                        <path className="dial-st70" d="M370.67,285.91c-1.94-2.96-2.38-6.81-.84-10.28,1.55-3.48,4.71-5.72,8.21-6.26-2.2,5.65-4.66,11.16-7.37,16.53Z"/>
                        <path className="dial-st71" d="M35.68,297.59c-3.08-5.17-5.92-10.49-8.5-15.96,3.53.29,6.84,2.31,8.62,5.66,1.78,3.35,1.61,7.22-.12,10.29Z"/>
                        <path className="dial-st11" d="M357.05,308.8c-1.5-3.19-1.39-7.05.61-10.26,2.01-3.22,5.44-5,8.98-5.05-2.96,5.26-6.16,10.37-9.59,15.31Z"/>
                        <path className="dial-st10" d="M50.88,319.48c-3.77-4.69-7.31-9.56-10.63-14.6,3.52-.2,7.07,1.34,9.3,4.41,2.22,3.06,2.6,6.9,1.33,10.19Z"/>
                        <path className="dial-st13" d="M340.37,329.59c-1.03-3.37-.39-7.17,2.04-10.07,2.43-2.9,6.07-4.19,9.57-3.76-3.65,4.79-7.53,9.4-11.61,13.83Z"/>
                        <path className="dial-st30" d="M68.96,339.05c-4.38-4.12-8.56-8.45-12.53-12.97,3.46-.68,7.17.36,9.8,3.08,2.62,2.72,3.53,6.47,2.74,9.89Z"/>
                        <path className="dial-st27" d="M320.97,347.87c-.56-3.48.61-7.16,3.42-9.69,2.81-2.53,6.59-3.3,9.99-2.39-4.27,4.24-8.74,8.27-13.4,12.08Z"/>
                        <path className="dial-st29" d="M89.59,355.97c-4.91-3.48-9.66-7.2-14.22-11.13,3.32-1.15,7.15-.64,10.13,1.68,2.98,2.33,4.4,5.92,4.09,9.44Z"/>
                        <path className="dial-st31" d="M112.36,369.83c-5.37-2.77-10.59-5.79-15.64-9.05,3.14-1.61,7-1.65,10.29.25,3.29,1.89,5.19,5.27,5.36,8.8Z"/>
                        <path className="dial-st28" d="M299.22,363.29c-.08-3.53,1.59-7.02,4.73-9.15,3.14-2.11,7-2.35,10.23-.97-4.82,3.6-9.81,6.97-14.96,10.11Z"/>
                        <path className="dial-st12" d="M275.52,375.54c.41-3.51,2.55-6.76,5.97-8.42,3.41-1.67,7.27-1.36,10.29.47-5.27,2.9-10.7,5.55-16.26,7.95Z"/>
                        <path className="dial-st26" d="M136.86,380.39c-5.73-2-11.32-4.27-16.78-6.79,2.89-2.04,6.72-2.62,10.24-1.2,3.53,1.43,5.89,4.5,6.54,7.99Z"/>
                        <path className="dial-st34" d="M250.35,384.35c.89-3.43,3.46-6.34,7.08-7.51,3.61-1.17,7.41-.33,10.14,1.92-5.62,2.13-11.36,4-17.22,5.59Z"/>
                        <path className="dial-st35" d="M162.57,387.4c-5.96-1.19-11.81-2.64-17.56-4.36,2.57-2.43,6.3-3.54,9.99-2.62,3.68.91,6.45,3.64,7.58,6.99Z"/>
                        <path className="dial-st36" d="M224.22,389.54c1.37-3.25,4.31-5.77,8.05-6.43,3.74-.66,7.37.7,9.76,3.3-5.84,1.32-11.78,2.37-17.81,3.13Z"/>
                        <path className="dial-st39" d="M189,390.75c-6.07-.35-12.06-.97-17.96-1.87,2.21-2.76,5.73-4.36,9.51-3.97,3.77.4,6.87,2.69,8.46,5.83Z"/>
                        <path className="dial-st40" d="M199.97,391.06c-.79,0-1.57,0-2.36-.01,1.81-3.02,5.07-5.09,8.85-5.22s7.18,1.71,9.19,4.6c-5.17.42-10.4.64-15.68.64Z"/>
                        <path className="dial-st42" d="M390.83,209.03c-2.96-1.91-4.91-5.24-4.91-9.03s1.96-7.12,4.91-9.03c.14,2.99.21,6,.21,9.03s-.07,6.04-.21,9.03Z"/>
                        <path className="dial-st37" d="M390.24,182.38c-3.2-1.48-5.6-4.51-6.13-8.26-.53-3.76.96-7.34,3.63-9.65,1.11,5.88,1.94,11.85,2.5,17.91Z"/>
                        <path className="dial-st41" d="M385.96,156.08c-3.39-1.02-6.2-3.68-7.25-7.33-1.05-3.66-.08-7.42,2.26-10.07,1.93,5.68,3.6,11.49,4.98,17.4Z"/>
                        <path className="dial-st38" d="M378.05,130.63c-3.5-.54-6.66-2.79-8.21-6.26-1.54-3.46-1.1-7.32.84-10.27,2.71,5.37,5.17,10.89,7.37,16.53Z"/>
                        <path className="dial-st43" d="M366.64,106.51c-3.53-.04-6.96-1.83-8.98-5.05-2.01-3.21-2.11-7.07-.61-10.26,3.43,4.94,6.63,10.05,9.59,15.31Z"/>
                        <path className="dial-st60" d="M342.41,80.48c-2.43-2.9-3.07-6.7-2.04-10.06,4.09,4.42,7.96,9.03,11.61,13.82-3.49.44-7.13-.86-9.57-3.76Z"/>
                        <path className="dial-st61" d="M324.39,61.82c-2.81-2.54-3.97-6.21-3.41-9.69,4.66,3.82,9.13,7.84,13.4,12.08-3.39.91-7.17.14-9.99-2.39Z"/>
                        <path className="dial-st62" d="M303.95,45.85c-3.15-2.12-4.81-5.61-4.73-9.15,5.15,3.14,10.14,6.52,14.96,10.11-3.24,1.39-7.09,1.15-10.23-.97Z"/>
                        <path className="dial-st64" d="M281.48,32.88c-3.42-1.67-5.56-4.91-5.97-8.43,5.56,2.4,10.99,5.05,16.26,7.95-3.02,1.84-6.88,2.14-10.29.48Z"/>
                        <path className="dial-st66" d="M257.43,23.16c-3.61-1.17-6.19-4.09-7.08-7.51,5.86,1.6,11.6,3.47,17.22,5.59-2.74,2.25-6.53,3.09-10.14,1.92Z"/>
                        <path className="dial-st68" d="M232.26,16.89c-3.74-.66-6.68-3.17-8.05-6.43,6.03.76,11.97,1.81,17.81,3.13-2.39,2.6-6.02,3.96-9.76,3.3Z"/>
                        <path className="dial-st90" d="M206.47,14.17c-3.78-.13-7.04-2.2-8.85-5.22.79,0,1.57-.01,2.36-.01,5.28,0,10.51.21,15.68.64-2.01,2.89-5.41,4.73-9.19,4.6Z"/>
                        <path className="dial-st65" d="M171.03,11.11c5.9-.9,11.9-1.52,17.96-1.87-1.59,3.14-4.69,5.44-8.46,5.83-3.77.4-7.3-1.21-9.51-3.97Z"/>
                        <path className="dial-st67" d="M145,16.96c5.75-1.72,11.61-3.18,17.57-4.36-1.14,3.35-3.89,6.07-7.58,6.99-3.69.92-7.41-.19-9.99-2.62Z"/>
                        <path className="dial-st69" d="M120.07,26.4c5.46-2.52,11.06-4.79,16.79-6.79-.66,3.48-3.01,6.57-6.54,7.99-3.53,1.43-7.36.85-10.25-1.2Z"/>
                        <path className="dial-st63" d="M96.72,39.22c5.05-3.26,10.28-6.28,15.64-9.05-.16,3.53-2.06,6.91-5.36,8.81-3.28,1.89-7.15,1.86-10.29.25Z"/>
                        <path className="dial-st15" d="M75.37,55.17c4.56-3.93,9.3-7.64,14.22-11.13.32,3.51-1.1,7.11-4.09,9.44-2.98,2.33-6.81,2.84-10.14,1.69Z"/>
                        <path className="dial-st14" d="M56.42,73.91c3.97-4.52,8.16-8.85,12.53-12.97.79,3.43-.11,7.17-2.74,9.89-2.62,2.72-6.34,3.76-9.8,3.08Z"/>
                        <path className="dial-st16" d="M40.25,95.12c3.31-5.04,6.86-9.91,10.62-14.6,1.27,3.28.9,7.12-1.32,10.19-2.23,3.07-5.78,4.61-9.3,4.41Z"/>
                        <path className="dial-st22" d="M27.19,118.37c2.58-5.46,5.42-10.79,8.5-15.95,1.73,3.08,1.9,6.94.12,10.29-1.78,3.35-5.09,5.37-8.62,5.66Z"/>
                        <path className="dial-st21" d="M17.5,143.22c1.8-5.8,3.87-11.47,6.19-17.02,2.14,2.81,2.86,6.63,1.56,10.21-1.3,3.58-4.3,6.04-7.75,6.81Z"/>
                        <path className="dial-st18" d="M11.39,169.16c.97-6,2.23-11.9,3.75-17.7,2.51,2.49,3.75,6.17,2.96,9.88-.79,3.72-3.41,6.57-6.71,7.82Z"/>
                        <path className="dial-st23" d="M8.96,195.69c.13-6.07.55-12.09,1.24-18.01,2.83,2.11,4.55,5.58,4.28,9.35-.26,3.77-2.45,6.95-5.53,8.65Z"/>
                        <path className="dial-st20" d="M10.21,222.32c-.69-5.92-1.11-11.93-1.24-18,3.08,1.7,5.26,4.88,5.53,8.65.26,3.78-1.46,7.24-4.28,9.35Z"/>
                        <path className="dial-st19" d="M15.14,248.54c-1.52-5.8-2.78-11.7-3.75-17.7,3.3,1.25,5.92,4.11,6.71,7.82.79,3.72-.45,7.4-2.96,9.88Z"/>
                        <path className="dial-st17" d="M23.69,273.8c-2.33-5.54-4.4-11.22-6.19-17.02,3.45.78,6.45,3.24,7.75,6.81,1.3,3.58.59,7.39-1.56,10.21Z"/>
                        <path className="dial-st25" d="M35.68,297.59c-3.08-5.17-5.92-10.49-8.5-15.96,3.53.29,6.84,2.31,8.62,5.66,1.78,3.35,1.61,7.22-.12,10.29Z"/>
                        <path className="dial-st24" d="M50.88,319.48c-3.77-4.69-7.31-9.56-10.63-14.6,3.52-.2,7.07,1.34,9.3,4.41,2.22,3.06,2.6,6.9,1.33,10.19Z"/>
                        <path className="dial-st59" d="M68.96,339.05c-4.38-4.12-8.56-8.45-12.53-12.97,3.46-.68,7.17.36,9.8,3.08,2.62,2.72,3.53,6.47,2.74,9.89Z"/>
                        <path className="dial-st57" d="M89.59,355.97c-4.91-3.48-9.66-7.2-14.22-11.13,3.32-1.15,7.15-.64,10.13,1.68,2.98,2.33,4.4,5.92,4.09,9.44Z"/>
                        <path className="dial-st58" d="M112.36,369.83c-5.37-2.77-10.59-5.79-15.64-9.05,3.14-1.61,7-1.65,10.29.25,3.29,1.89,5.19,5.27,5.36,8.8Z"/>
                        <path className="dial-st56" d="M136.86,380.39c-5.73-2-11.32-4.27-16.78-6.79,2.89-2.04,6.72-2.62,10.24-1.2,3.53,1.43,5.89,4.5,6.54,7.99Z"/>
                        <path className="dial-st52" d="M162.57,387.4c-5.96-1.19-11.81-2.64-17.56-4.36,2.57-2.43,6.3-3.54,9.99-2.62,3.68.91,6.45,3.64,7.58,6.99Z"/>
                        <path className="dial-st51" d="M189,390.75c-6.07-.35-12.06-.97-17.96-1.87,2.21-2.76,5.73-4.36,9.51-3.97,3.77.4,6.87,2.69,8.46,5.83Z"/>
                        <path className="dial-st50" d="M199.97,391.06c-.79,0-1.57,0-2.36-.01,1.81-3.02,5.07-5.09,8.85-5.22s7.18,1.71,9.19,4.6c-5.17.42-10.4.64-15.68.64Z"/>
                        <path className="dial-st48" d="M224.22,389.54c1.37-3.25,4.31-5.77,8.05-6.43,3.74-.66,7.37.7,9.76,3.3-5.84,1.32-11.78,2.37-17.81,3.13Z"/>
                        <path className="dial-st32" d="M250.35,384.35c.89-3.43,3.46-6.34,7.08-7.51,3.61-1.17,7.41-.33,10.14,1.92-5.62,2.13-11.36,4-17.22,5.59Z"/>
                        <path className="dial-st33" d="M275.52,375.54c.41-3.51,2.55-6.76,5.97-8.42,3.41-1.67,7.27-1.36,10.29.47-5.27,2.9-10.7,5.55-16.26,7.95Z"/>
                        <path className="dial-st54" d="M299.22,363.29c-.08-3.53,1.59-7.02,4.73-9.15,3.14-2.11,7-2.35,10.23-.97-4.82,3.6-9.81,6.97-14.96,10.11Z"/>
                        <path className="dial-st46" d="M320.97,347.87c-.56-3.48.61-7.16,3.42-9.69,2.81-2.53,6.59-3.3,9.99-2.39-4.27,4.24-8.74,8.27-13.4,12.08Z"/>
                        <path className="dial-st53" d="M340.37,329.59c-1.03-3.37-.39-7.17,2.04-10.07,2.43-2.9,6.07-4.19,9.57-3.76-3.65,4.79-7.53,9.4-11.61,13.83Z"/>
                        <path className="dial-st47" d="M357.05,308.8c-1.5-3.19-1.39-7.05.61-10.26,2.01-3.22,5.44-5,8.98-5.05-2.96,5.26-6.16,10.37-9.59,15.31Z"/>
                        <path className="dial-st55" d="M370.67,285.91c-1.94-2.96-2.38-6.81-.84-10.28,1.55-3.48,4.71-5.72,8.21-6.26-2.2,5.65-4.66,11.16-7.37,16.53Z"/>
                        <path className="dial-st49" d="M380.98,261.32c-2.35-2.66-3.32-6.41-2.27-10.07,1.05-3.65,3.86-6.31,7.25-7.33-1.39,5.91-3.05,11.71-4.98,17.4Z"/>
                        <path className="dial-st45" d="M387.74,235.53c-2.67-2.31-4.16-5.89-3.63-9.64.53-3.75,2.93-6.77,6.12-8.25-.55,6.06-1.39,12.02-2.49,17.9Z"/>
                      </g>
                      {/* Bezel ring */}
                      <path className="dial-st44" d="M386.04,200c0-3.78,1.96-7.12,4.91-9.03-.13-2.88-.33-5.75-.59-8.59-3.2-1.48-5.6-4.51-6.13-8.26-.53-3.76.96-7.34,3.63-9.65-.53-2.82-1.12-5.62-1.78-8.4-3.39-1.02-6.2-3.68-7.25-7.33-1.05-3.66-.08-7.42,2.26-10.07-.91-2.71-1.89-5.39-2.93-8.04-3.5-.54-6.66-2.79-8.21-6.26-1.54-3.46-1.1-7.32.84-10.27-1.29-2.56-2.64-5.1-4.04-7.59-3.53-.04-6.96-1.83-8.98-5.05-2.01-3.21-2.11-7.07-.61-10.26-1.63-2.36-3.32-4.68-5.07-6.96-3.49.44-7.13-.86-9.57-3.76-2.43-2.9-3.07-6.7-2.04-10.06-1.95-2.12-3.95-4.19-6-6.21-3.39.91-7.17.14-9.99-2.39-2.81-2.54-3.97-6.21-3.41-9.69-2.22-1.82-4.48-3.6-6.79-5.32-3.24,1.39-7.09,1.15-10.23-.97-3.15-2.12-4.81-5.61-4.73-9.15-2.44-1.49-4.93-2.93-7.44-4.3-3.02,1.84-6.88,2.14-10.29.48-3.42-1.67-5.56-4.91-5.97-8.43-2.62-1.13-5.26-2.2-7.94-3.21h0c-2.74,2.25-6.53,3.09-10.14,1.92-3.61-1.17-6.19-4.09-7.08-7.51-2.75-.75-5.53-1.44-8.33-2.06-2.39,2.6-6.02,3.96-9.76,3.3-3.74-.66-6.68-3.17-8.05-6.43-2.83-.35-5.69-.65-8.56-.88-2.01,2.89-5.41,4.73-9.19,4.6-3.78-.13-7.04-2.2-8.85-5.22-2.89.04-5.76.13-8.62.3-1.59,3.14-4.69,5.44-8.46,5.83-3.77.4-7.3-1.21-9.51-3.97-2.84.44-5.66.93-8.46,1.48-1.14,3.35-3.89,6.07-7.58,6.99-3.69.92-7.41-.19-9.99-2.62-2.74.83-5.46,1.7-8.14,2.65-.66,3.48-3.01,6.57-6.54,7.99-3.53,1.43-7.36.85-10.25-1.2-2.61,1.2-5.17,2.45-7.71,3.77-.16,3.53-2.06,6.91-5.36,8.81-3.28,1.89-7.15,1.86-10.29.25-2.42,1.55-4.79,3.15-7.13,4.81.32,3.51-1.1,7.11-4.09,9.44s-6.81,2.84-10.14,1.69c-2.18,1.87-4.31,3.8-6.41,5.78.79,3.43-.11,7.17-2.74,9.89-2.62,2.72-6.34,3.76-9.8,3.08-1.9,2.16-3.75,4.36-5.55,6.61,1.27,3.28.9,7.12-1.32,10.19-2.23,3.07-5.78,4.61-9.3,4.41-1.58,2.39-3.1,4.83-4.57,7.29,1.73,3.08,1.9,6.94.12,10.29-1.78,3.35-5.09,5.37-8.62,5.66-1.22,2.58-2.39,5.19-3.49,7.83,2.14,2.81,2.86,6.63,1.56,10.21-1.3,3.58-4.3,6.04-7.75,6.81-.85,2.72-1.64,5.47-2.36,8.24,2.51,2.49,3.75,6.17,2.96,9.88-.79,3.72-3.41,6.57-6.71,7.82-.46,2.82-.86,5.66-1.19,8.52,2.83,2.11,4.55,5.58,4.28,9.35-.26,3.77-2.45,6.95-5.53,8.65-.03,1.43-.05,2.87-.05,4.31s.02,2.88.05,4.32c3.08,1.7,5.26,4.88,5.53,8.65.26,3.78-1.46,7.24-4.28,9.35.33,2.86.73,5.7,1.19,8.52,3.3,1.25,5.92,4.11,6.71,7.82.79,3.72-.45,7.4-2.96,9.88.72,2.77,1.51,5.52,2.36,8.24,3.45.78,6.45,3.24,7.75,6.81,1.3,3.58.59,7.39-1.56,10.21,1.1,2.64,2.26,5.25,3.49,7.83,3.53.29,6.84,2.31,8.62,5.66,1.78,3.35,1.61,7.22-.12,10.29,1.47,2.47,2.99,4.9,4.57,7.3,3.52-.2,7.07,1.34,9.3,4.41,2.22,3.06,2.6,6.9,1.33,10.19,1.8,2.25,3.65,4.45,5.54,6.6,3.46-.68,7.17.36,9.8,3.08,2.62,2.72,3.53,6.47,2.74,9.89,2.09,1.98,4.23,3.9,6.41,5.78h0c3.32-1.15,7.15-.64,10.13,1.68,2.98,2.33,4.4,5.92,4.09,9.44,2.34,1.66,4.71,3.27,7.13,4.81,3.13-1.61,7-1.65,10.29.25,3.29,1.89,5.19,5.27,5.36,8.8,2.54,1.32,5.11,2.57,7.71,3.77,2.89-2.04,6.72-2.62,10.24-1.2,3.53,1.43,5.89,4.5,6.54,7.99,2.69.95,5.41,1.83,8.15,2.65,2.57-2.43,6.3-3.54,9.99-2.62,3.68.91,6.45,3.64,7.58,6.99h0c2.8.56,5.61,1.05,8.46,1.48,2.21-2.76,5.73-4.36,9.51-3.97,3.77.4,6.87,2.69,8.46,5.83,2.86.16,5.73.26,8.62.3,1.81-3.02,5.07-5.09,8.85-5.22,3.78-.13,7.18,1.71,9.19,4.6,2.87-.23,5.73-.53,8.56-.88,1.37-3.25,4.31-5.77,8.05-6.43,3.74-.66,7.37.7,9.76,3.3,2.8-.62,5.58-1.31,8.33-2.06.89-3.43,3.46-6.34,7.08-7.51,3.61-1.17,7.41-.33,10.14,1.92h0c2.67-1.01,5.32-2.08,7.94-3.21.41-3.51,2.55-6.76,5.97-8.42,3.41-1.67,7.27-1.36,10.29.47,2.52-1.38,5-2.81,7.44-4.3-.08-3.53,1.59-7.02,4.73-9.15,3.14-2.11,7-2.35,10.23-.97,2.3-1.72,4.57-3.49,6.79-5.32-.56-3.48.61-7.16,3.42-9.69,2.81-2.53,6.59-3.3,9.99-2.39,2.04-2.01,4.04-4.08,6-6.2-1.03-3.37-.39-7.17,2.04-10.07,2.43-2.9,6.07-4.19,9.57-3.76,1.75-2.28,3.44-4.6,5.07-6.96-1.5-3.19-1.39-7.05.61-10.26,2.01-3.22,5.44-5,8.98-5.05,1.4-2.49,2.75-5.02,4.04-7.58-1.94-2.96-2.38-6.81-.84-10.28,1.55-3.48,4.71-5.72,8.21-6.26,1.03-2.66,2.01-5.34,2.93-8.05-2.35-2.66-3.32-6.41-2.27-10.07,1.05-3.65,3.86-6.31,7.25-7.33.66-2.78,1.25-5.58,1.78-8.4-2.67-2.31-4.16-5.89-3.63-9.64.53-3.75,2.93-6.77,6.12-8.25h0c.26-2.85.47-5.72.6-8.6-2.96-1.91-4.91-5.24-4.91-9.03ZM40.08,200c0-88.32,71.6-159.92,159.92-159.92s159.92,71.6,159.92,159.92-71.6,159.92-159.92,159.92S40.08,288.32,40.08,200Z"/>
                      {/* Inner circle and radial lines */}
                      <g>
                        <circle className="dial-st0" cx="200" cy="200" r="159.92"/>
                        <g>
                          <rect className="dial-st0" x="369.87" y="190.48" width="5.29" height="19.04" transform="translate(572.52 -172.52) rotate(90)"/>
                          <rect className="dial-st0" x="283.61" y="41.07" width="5.29" height="19.04" transform="translate(63.65 -136.35) rotate(30)"/>
                          <rect className="dial-st0" x="111.09" y="41.07" width="5.29" height="19.04" transform="translate(-10.06 63.65) rotate(-30)"/>
                          <rect className="dial-st0" x="24.83" y="190.48" width="5.29" height="19.04" transform="translate(-172.52 227.48) rotate(-90)"/>
                          <rect className="dial-st0" x="111.09" y="339.89" width="5.29" height="19.04" transform="translate(37.54 708.87) rotate(-150)"/>
                          <rect className="dial-st0" x="283.61" y="339.89" width="5.29" height="19.04" transform="translate(708.87 508.87) rotate(150)"/>
                        </g>
                      </g>
                      {/* Triangle from SVG - rotates with dial, always points to Studio */}
                      <polygon 
                        className="dial-st0" 
                        points="200 36.84 210.39 18.85 189.61 18.85 200 36.84"
                      />
                    </svg>
                  </div>
                  <div className="absolute inset-0">
                    {dialItems.map((item, index) => {
                      const iconAngle = index * dialStep - 90 + dialAngle;
                      const angleRad = (iconAngle * Math.PI) / 180;
                      const offsetX = dialRadius * Math.cos(angleRad);
                      const offsetY = dialRadius * Math.sin(angleRad);
                      const isActive = dialIndex === index;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-dial-item="true"
                          className={`absolute flex items-center justify-center rounded-full border transition touch-manipulation ${
                            isActive
                              ? item.id === 'adaptive'
                                ? 'border-amber-300/70 bg-amber-300/15 text-amber-300'
                                : 'border-primary/60 bg-primary/10 text-primary'
                              : 'border-border/60 bg-secondary/30 text-muted-foreground'
                          } ${!isActive ? item.color : ''} ${isActive ? 'z-20' : 'z-10'}`}
                          style={{
                            left: `calc(50% + ${offsetX}px)`,
                            top: `calc(50% + ${offsetY}px)`,
                            transform: 'translate(-50%, -50%)',
                            width: dialIconSize,
                            height: dialIconSize,
                          }}
                        onClick={() => {
                          if (dialDragThresholdRef.current) {
                            dialDragThresholdRef.current = false;
                            return;
                          }
                          if (tourActive && isTourDialStep) {
                            return;
                          }
                          if (!isActive) {
                            rotateDialToIndex(index);
                            return;
                          }
                          playDialSelect();
                          setActiveTab(item.id as typeof activeTab);
                          setIsDialOpen(false);
                        }}
                        >
                          <item.Icon style={{ width: Math.round(dialIconSize * 0.42), height: Math.round(dialIconSize * 0.42) }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tourActive && currentTourStep && (
        <div className="fixed inset-0 z-[85] pointer-events-auto">
          <div
            className="absolute inset-0"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement | null;
              if (!target) return;
              if (target.closest('[data-tour-allow="true"]')) return;
              if (isTourDialStep) {
                if (target.closest('[data-tour-id="dial-open"], [data-tour-id="dial-panel"], [data-tour-id="dial-close"]')) {
                  return;
                }
              }
              if (isTourCtaStep) {
                if (target.closest('[data-tour-quick-action="true"]')) {
                  return;
                }
              }
              event.preventDefault();
              event.stopPropagation();
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
          {tourRect && (
            <div
              className="pointer-events-none absolute rounded-2xl border border-primary/60"
              style={{
                top: tourRect.top - 8,
                left: tourRect.left - 8,
                width: tourRect.width + 16,
                height: tourRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            />
          )}
          <div
            data-tour-allow="true"
            className="pointer-events-auto absolute w-[320px] max-w-[90vw] space-y-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-xl backdrop-blur"
            style={{
              top: tourTooltip?.top ?? '50%',
              left: tourTooltip?.left ?? '50%',
              transform: tourTooltip ? 'none' : 'translate(-50%, -50%)',
            }}
          >
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {currentTourStep.title}
              </p>
              <p className="text-sm text-foreground">{currentTourStep.description}</p>
              {isTourDialStep && !tourCanProceed && (
                <p className="text-xs text-muted-foreground">
                  Open the dial, rotate it a bit, then close with the X.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {tourStepIndex + 1} / {tourSteps.length}
              </span>
              <button
                type="button"
                data-tour-allow="true"
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em] transition ${
                  tourCanProceed
                    ? 'border-primary/60 text-primary hover:border-primary'
                    : 'border-border/60 text-muted-foreground opacity-50'
                }`}
                onClick={advanceTour}
                disabled={!tourCanProceed}
              >
                {isTourCtaStep ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTourComplete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="text-center text-2xl sm:text-3xl font-semibold tracking-[0.35em]">
            <span className="relative inline-block">
              <span className="text-muted-foreground/70">YOU ARE NOW READY TO START CREATING!</span>
              <span className="absolute inset-0 logo-fill">YOU ARE NOW READY TO START CREATING!</span>
            </span>
          </div>
        </div>
      )}

      {pullRefreshState.visible && (
        <div className="fixed top-2 left-1/2 z-[92] -translate-x-1/2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground shadow-lg backdrop-blur pointer-events-none">
          <span className="flex items-center gap-2">
            <RefreshCcw
              className={`h-3.5 w-3.5 ${pullRefreshState.ready ? 'animate-spin text-primary' : ''}`}
              style={{ transform: `rotate(${Math.round(pullRefreshState.progress * 180)}deg)` }}
            />
            {pullRefreshState.ready ? 'Release to refresh' : 'Keep pulling'}
          </span>
        </div>
      )}

      {uiErrorBadge && (
        <div className="fixed top-3 right-3 z-[95] max-w-[92vw] rounded-2xl border border-amber-300/60 bg-black/80 px-4 py-3 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.4em] text-amber-200/90">
                Error {uiErrorBadge.code}
              </p>
              <p className="text-xs leading-snug text-amber-50/90">{uiErrorBadge.message}</p>
            </div>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.3em] text-amber-200/80 hover:text-amber-100"
              onClick={() => setUiErrorBadge(null)}
              aria-label="Dismiss error badge"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`container mx-auto px-4 py-3 sm:py-6 lg:py-8 transition ${
          showGuestWelcome || isBooting ? 'blur-md pointer-events-none select-none' : ''
        } ${isMobile ? 'flex flex-col gap-3' : ''} ${isMobileV2 ? 'qrc-v2-main' : ''}`}
      >
        {activeTab === 'studio' && (
          <>
        {/* Desktop Wizard - Only show on desktop when Quick Action is selected */}
        {!isMobile && selectedQuickAction && (
          <DesktopStudioWizard
            qrMode={qrMode}
            qrType={qrType}
            options={options}
            websiteUrl={websiteUrl}
            emailAddress={emailAddress}
            phoneNumber={phoneNumber}
            fileUrl={fileUrl}
            fileName={fileName}
            vcardName={vcard.name}
            vcardSlug={vcardSlug}
            vcardPhone={vcard.phone}
            vcardEmail={vcard.email}
            vcardWebsite={vcard.website}
            vcardCompany={vcard.company}
            vcardAbout={vcard.about}
            menuFilesCount={menuFiles.length}
            websiteTouched={websiteTouched}
            emailTouched={emailTouched}
            phoneTouched={phoneTouched}
            fileTouched={fileTouched}
            selectedQuickAction={selectedQuickAction}
            previewContent={previewContent}
            user={user}
            onModeChange={setQrMode}
            onTypeChange={setQrType}
            onQuickActionSelect={setSelectedQuickAction}
            onWebsiteUrlChange={setWebsiteUrl}
            onEmailChange={setEmailAddress}
            onPhoneChange={setPhoneNumber}
            onFileChange={(url, name) => {
              setFileUrl(url);
              setFileName(name);
            }}
            onVcardChange={(name, slug, phone, email, website, company, about) => {
              setVcard((prev) => ({
                ...prev,
                name: name || prev.name,
                slug: slug || prev.slug,
                phone: phone !== undefined ? phone : prev.phone,
                email: email !== undefined ? email : prev.email,
                website: website !== undefined ? website : prev.website,
                company: company !== undefined ? company : prev.company,
                about: about !== undefined ? about : prev.about,
              }));
            }}
            onOptionChange={(key, value) => {
              setOptions((prev) => ({ ...prev, [key]: value }));
            }}
            onDone={() => {
              const defaultName = qrType === 'file' ? fileName || 'File QR' : 'QRC Untitled 1';
              setQrName(defaultName);
              setShowNameOverlay(true);
            }}
            onWebsiteTouched={setWebsiteTouched}
            onEmailTouched={setEmailTouched}
            onPhoneTouched={setPhoneTouched}
            onFileTouched={setFileTouched}
            fileUploading={fileUploading}
            fileUploadProgress={fileUploadProgress}
            fileUploadError={fileUploadError}
            navigate={navigate}
            toast={toast}
            onShowVcardCustomizer={() => setShowVcardCustomizer(true)}
            onShowMenuBuilder={() => setShowMenuBuilder(true)}
            onShowFileUpload={() => fileInputRef.current?.click()}
          />
        )}
        
        {/* Hidden file input for desktop wizard */}
        {!isMobile && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        )}
        
        {/* Desktop Studio Dashboard - Show when no Quick Action is selected */}
        {!isMobile && !selectedQuickAction && (
          <section id="studio" className="space-y-6">
            {/* PROD STAGE Banner */}
            <button
              type="button"
              onClick={() => setStageOverlayOpen(true)}
              className="group w-full rounded-2xl border border-amber-300/50 bg-black/90 px-4 py-2 text-left transition hover:border-amber-300"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white">
                Prod Stage: <span className={adaptiveGradientText}>FRIENDS &amp; FAMILY</span>
              </p>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Studio</p>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Creative Workspace</h2>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              {/* Overview Dashboard Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('codes')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveTab('analytics');
                  }
                }}
                className="glass-panel rounded-2xl p-6 space-y-5 text-left transition hover:border-primary/60 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
                    <h3 className="text-lg font-semibold">Your QR Arsenal</h3>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Codes', value: `${arsenalStats.total}`, tab: 'codes' },
                    { label: 'Total Scans', value: `${scanStats.total}`, tab: 'analytics' },
                    { label: 'Dynamic Live', value: `${arsenalStats.dynamic}`, tab: 'codes' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveTab(item.tab as typeof activeTab);
                      }}
                      className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-left transition hover:border-primary/60 hover:bg-secondary/50"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-semibold mt-1.5">{item.value}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Quick Actions</p>
                  <h3 className="text-lg font-semibold">Jump into a new QR</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'website', label: 'Website', Icon: LinkIcon, onClick: handleStartStatic },
                    { id: 'phone', label: 'Phone', Icon: Phone, onClick: handleStartPhone },
                    { id: 'email', label: 'Email', Icon: Mail, onClick: handleStartEmail },
                    { id: 'vcard', label: 'VCard', Icon: User, onClick: handleStartVcard },
                    { id: 'file', label: 'File', Icon: File, onClick: handleStartFile },
                    { id: 'menu', label: 'Menu', Icon: Utensils, onClick: handleStartMenu },
                  ].map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/60 bg-secondary/30 hover:border-primary/60 hover:bg-secondary/50 transition"
                    >
                      <action.Icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Studio Guide */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Studio Guide</p>
              <h3 className="text-lg font-semibold">Your QR flow</h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>1. Choose a quick action.</p>
                <p>2. Fill the details.</p>
                <p>3. Customize, generate, and export.</p>
              </div>
            </div>
          </section>
        )}
        
        {/* Mobile V2 and legacy desktop - keep intact for mobile only */}
        {showStudioIntro && isMobile && !isMobileV2 && (
        <section className={`space-y-3 sm:space-y-4 ${isMobileV2 ? 'qrc-v2-section' : ''}`} data-tour-id="quick-actions">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              {isMobileV2 ? 'Step 1 · Quick Actions' : 'Quick Actions'}
            </p>
            <h3 className="text-lg font-semibold">Jump into a new QR</h3>
          </div>
          <div className="flex w-full flex-nowrap items-center justify-between gap-2 sm:gap-6 sm:justify-center sm:flex-wrap">
            {[
              {
                id: 'website',
                label: 'Website',
                hint: 'Website',
                Icon: LinkIcon,
                onClick: handleStartStatic,
              },
              {
                id: 'phone',
                label: 'Phone',
                hint: 'Phone',
                Icon: Phone,
                onClick: handleStartPhone,
              },
              {
                id: 'email',
                label: 'Email',
                hint: 'Email',
                Icon: Mail,
                onClick: handleStartEmail,
              },
              {
                id: 'vcard',
                label: 'VCard',
                hint: 'VCard',
                Icon: User,
                onClick: handleStartVcard,
              },
              {
                id: 'file',
                label: 'File',
                hint: 'File',
                Icon: File,
                onClick: handleStartFile,
              },
              {
                id: 'menu',
                label: 'Menu',
                hint: 'Menu',
                Icon: Utensils,
                onClick: handleStartMenu,
              },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  action.onClick();
                  handleTourQuickAction();
                }}
                onMouseEnter={() => setQuickActionHover(action.id)}
                onMouseLeave={() => setQuickActionHover(null)}
                aria-pressed={selectedQuickAction === action.id}
                data-tour-quick-action="true"
                className={`group relative flex flex-col items-center justify-center rounded-full border h-9 w-9 sm:h-14 sm:w-14 transition hover:border-primary/60 hover:bg-secondary/40 ${
                  selectedQuickAction === action.id
                    ? 'border-primary/70 bg-secondary/50 ring-1 ring-primary/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                    : 'border-border/60 bg-secondary/30'
                }`}
              >
                <action.Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <AnimatePresence mode="wait">
                  {quickActionHover === action.id ? (
                    <motion.span
                      key={action.hint}
                      initial={{ opacity: 0, filter: 'blur(8px)', y: 6 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(10px)', y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute -bottom-7 whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                    >
                      <DecodeText text={action.hint} active />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Old desktop Studio section - hidden when wizard is active (desktop) */}
        {showStudioIntro && isMobile && (
        <section id="studio" className={`mt-4 space-y-4 sm:space-y-5 lg:mt-0 lg:pt-0 lg:space-y-8 ${isMobileV2 ? 'qrc-v2-section' : ''}`}>
          <button
            type="button"
            onClick={() => setStageOverlayOpen(true)}
            className="group w-full rounded-2xl border border-amber-300/50 bg-black/90 px-4 py-2 text-left transition hover:border-amber-300"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white">
              Prod Stage: <span className={adaptiveGradientText}>FRIENDS &amp; FAMILY</span>
            </p>
          </button>
          <div className="flex items-center justify-between gap-4 sm:gap-5 lg:gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Studio</p>
              <h2 
                className="text-2xl sm:text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => setShowNavOverlay(true)}
              >
                Creative Workspace
              </h2>
            </div>
            {isMobileV2 && (
              <button
                type="button"
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
                onClick={handleClearStudioCache}
                aria-label="Refresh"
              >
                <RefreshCcw className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 sm:gap-5 lg:gap-6">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('codes')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveTab('analytics');
                }
              }}
              className={`glass-panel rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-5 text-left transition hover:border-primary/60 hover:shadow-lg hover:-translate-y-1 select-none touch-manipulation ${
                isMobileV2 ? 'qrc-v2-card' : ''
              }`}
              data-tour-id="overview"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
                  <h3 className="text-base sm:text-lg font-semibold">Your QR Arsenal</h3>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { label: 'Total Codes', value: `${arsenalStats.total}`, tab: 'codes' },
                  { label: 'Total Scans', value: `${scanStats.total}`, tab: 'analytics' },
                  { label: 'Dynamic Live', value: `${arsenalStats.dynamic}`, tab: 'codes' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTab(item.tab as typeof activeTab);
                    }}
                    className="rounded-xl border border-border/60 bg-secondary/40 p-2.5 sm:p-4 text-left transition hover:border-primary/60 hover:bg-secondary/50 select-none touch-manipulation"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                    <p className="text-lg sm:text-2xl font-semibold mt-1.5">{item.value}</p>
                  </button>
                ))}
              </div>
            </div>

            {isMobileV2 && (
              <div
                ref={quickActionsRef}
                className={`glass-panel rounded-2xl p-3 sm:p-6 space-y-3 sm:space-y-4 ${isMobileV2 ? 'qrc-v2-card' : ''}`}
                data-tour-id="quick-actions"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Step 1 · Quick Actions</p>
                  <h3 className="text-base sm:text-lg font-semibold">Jump into a new QR</h3>
                </div>
                <div className="flex w-full flex-nowrap items-center justify-between gap-2 sm:gap-6 sm:justify-center sm:flex-wrap">
                  {[
                    {
                      id: 'website',
                      label: 'Website',
                      hint: 'Website',
                      Icon: LinkIcon,
                      onClick: handleStartStatic,
                    },
                    {
                      id: 'phone',
                      label: 'Phone',
                      hint: 'Phone',
                      Icon: Phone,
                      onClick: handleStartPhone,
                    },
                    {
                      id: 'email',
                      label: 'Email',
                      hint: 'Email',
                      Icon: Mail,
                      onClick: handleStartEmail,
                    },
                    {
                      id: 'vcard',
                      label: 'VCard',
                      hint: 'VCard',
                      Icon: User,
                      onClick: handleStartVcard,
                    },
                    {
                      id: 'file',
                      label: 'File',
                      hint: 'File',
                      Icon: File,
                      onClick: handleStartFile,
                    },
                    {
                      id: 'menu',
                      label: 'Menu',
                      hint: 'Menu',
                      Icon: Utensils,
                      onClick: handleStartMenu,
                    },
                  ].map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        action.onClick();
                        handleTourQuickAction();
                      }}
                      aria-pressed={selectedQuickAction === action.id}
                      data-tour-quick-action="true"
                      className={`group relative flex flex-col items-center justify-center rounded-full border h-12 w-12 transition hover:border-primary/60 hover:bg-secondary/40 ${
                        selectedQuickAction === action.id
                          ? 'border-primary/70 bg-secondary/50 ring-1 ring-primary/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                          : 'border-border/60 bg-secondary/30'
                      }`}
                    >
                      <action.Icon className="h-6 w-6 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className={`glass-panel rounded-2xl p-3 sm:p-6 space-y-2 sm:space-y-4 ${
                isMobileV2 ? 'qrc-v2-card' : ''
              }`}
              data-tour-id="studio-guide"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Studio Guide</p>
              <h3 className="text-base sm:text-lg font-semibold">Your QR flow</h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                {isMobileV2 ? (
                  <>
                    <p>1. Quick action.</p>
                    <p>2. Dynamic or static.</p>
                    <p>3. Enter contents.</p>
                    <p>4. Customize & generate.</p>
                  </>
                ) : (
                  <>
                    <p>1. Choose a quick action.</p>
                    <p>2. Fill the details.</p>
                    <p>3. Customize, generate, and export.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Old desktop Studio guide - hidden when wizard is active */}
        {false && showStudioIntro && !isMobile && (
        <section className="mt-6 lg:mt-10 space-y-4" data-tour-id="quick-actions">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Quick Actions</p>
            <h3 className="text-lg font-semibold">Jump into a new QR</h3>
          </div>
          <div className="flex w-full flex-nowrap items-center justify-between gap-2 sm:gap-6 sm:justify-center sm:flex-wrap">
            {[
              {
                id: 'website',
                label: 'Website',
                hint: 'Website',
                Icon: LinkIcon,
                onClick: handleStartStatic,
              },
              {
                id: 'phone',
                label: 'Phone',
                hint: 'Phone',
                Icon: Phone,
                onClick: handleStartPhone,
              },
              {
                id: 'email',
                label: 'Email',
                hint: 'Email',
                Icon: Mail,
                onClick: handleStartEmail,
              },
              {
                id: 'vcard',
                label: 'VCard',
                hint: 'VCard',
                Icon: User,
                onClick: handleStartVcard,
              },
              {
                id: 'file',
                label: 'File',
                hint: 'File',
                Icon: File,
                onClick: handleStartFile,
              },
              {
                id: 'menu',
                label: 'Menu',
                hint: 'Menu',
                Icon: Utensils,
                onClick: handleStartMenu,
              },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  action.onClick();
                  handleTourQuickAction();
                }}
                onMouseEnter={() => setQuickActionHover(action.id)}
                onMouseLeave={() => setQuickActionHover(null)}
                aria-pressed={selectedQuickAction === action.id}
                data-tour-quick-action="true"
                className={`group relative flex flex-col items-center justify-center rounded-full border h-10 w-10 sm:h-14 sm:w-14 transition hover:border-primary/60 hover:bg-secondary/40 ${
                  selectedQuickAction === action.id
                    ? 'border-primary/70 bg-secondary/50 ring-1 ring-primary/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                    : 'border-border/60 bg-secondary/30'
                }`}
              >
                <action.Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <AnimatePresence mode="wait">
                  {quickActionHover === action.id ? (
                    <motion.span
                      key={action.hint}
                      initial={{ opacity: 0, filter: 'blur(8px)', y: 6 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(10px)', y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute -bottom-7 whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
                    >
                      <DecodeText text={action.hint} active />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Mobile V2 create section - only show on mobile */}
        {showCreateSection && isMobile && (
        <section
          ref={createSectionRef}
          id="create"
          className={`mt-8 lg:mt-14 ${isMobileV2 ? 'qrc-v2-section' : ''}`}
          data-mobile-step-current={isMobileV2 ? effectiveMobileStudioStep : undefined}
        >
          {isMobile && showMobileCreateFlow && (
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
              onClick={() => {
                setSelectedQuickAction(null);
                setQrType(null);
                setPendingCreateScroll(false);
                if (isMobileV2) {
                  setMobileStudioStep(1);
                }
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Studio
            </button>
          )}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Create</p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Build Your QR</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Step-by-step</span>
          </div>
          {isMobileV2 && (
            <div className="mb-4 grid grid-cols-4 gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  type="button"
                  disabled={step === 1 && Boolean(selectedQuickAction)}
                  onClick={() => {
                    if (step === 1) {
                      if (selectedQuickAction) return;
                      setSelectedQuickAction(null);
                      setQrType(null);
                    }
                    setMobileStudioStep(step as 1 | 2 | 3 | 4);
                  }}
                  className={`rounded-xl border px-2 py-2 ${
                    effectiveMobileStudioStep === step
                      ? 'border-primary/60 text-primary'
                      : 'border-border/60'
                  } ${step === 1 && selectedQuickAction ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.2em]">
                    <span className="font-semibold">{step}</span>
                    {(() => {
                      const Icon = getStepIcon(step as 1 | 2 | 3 | 4);
                      return <Icon className="h-3.5 w-3.5" />;
                    })()}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            {/* Left Panel - Input & Preview */}
            <div className="space-y-6">
              {isMobileV2 && effectiveMobileStudioStep === 1 && (
                <div data-mobile-step="1" className="glass-panel rounded-2xl p-6 space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Step 1 · Quick Actions</p>
                  <p className="text-sm text-muted-foreground">
                    Pick the QR type you want to create.
                  </p>
                  <div className="flex w-full flex-nowrap items-center justify-between gap-2 sm:gap-6 sm:justify-center sm:flex-wrap">
                    {[
                      {
                        id: 'website',
                        label: 'Website',
                        hint: 'Website',
                        Icon: LinkIcon,
                        onClick: handleStartStatic,
                      },
                      {
                        id: 'phone',
                        label: 'Phone',
                        hint: 'Phone',
                        Icon: Phone,
                        onClick: handleStartPhone,
                      },
                      {
                        id: 'email',
                        label: 'Email',
                        hint: 'Email',
                        Icon: Mail,
                        onClick: handleStartEmail,
                      },
                      {
                        id: 'vcard',
                        label: 'VCard',
                        hint: 'VCard',
                        Icon: User,
                        onClick: handleStartVcard,
                      },
                      {
                        id: 'file',
                        label: 'File',
                        hint: 'File',
                        Icon: File,
                        onClick: handleStartFile,
                      },
                      {
                        id: 'menu',
                        label: 'Menu',
                        hint: 'Menu',
                        Icon: Utensils,
                        onClick: handleStartMenu,
                      },
                    ].map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          action.onClick();
                          handleTourQuickAction();
                        }}
                        aria-pressed={selectedQuickAction === action.id}
                        data-tour-quick-action="true"
                        className={`group relative flex flex-col items-center justify-center rounded-full border h-12 w-12 transition hover:border-primary/60 hover:bg-secondary/40 ${
                          selectedQuickAction === action.id
                            ? 'border-primary/70 bg-secondary/50 ring-1 ring-primary/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                            : 'border-border/60 bg-secondary/30'
                        }`}
                      >
                        <action.Icon className="h-6 w-6 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <motion.div
                ref={modeSectionRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                data-mobile-step={isMobileV2 ? '2' : '1'}
                className={`glass-panel rounded-2xl p-6 space-y-6 ${
                  qrMode === 'dynamic'
                    ? 'border-cyan-400/40 bg-cyan-500/5 shadow-[0_0_25px_rgba(34,211,238,0.12)]'
                    : ''
                } ${isMobileV2 ? 'qrc-v2-card' : ''}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold">
                        {isMobileV2 ? 'Step 2 · Dynamic or Static' : 'Step 1 · QR Mode'}
                      </h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Select</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className={qrMode === 'static'
                        ? 'bg-card/80 text-foreground border border-primary/50 rounded-xl uppercase tracking-[0.2em] text-xs shadow-[0_0_14px_rgba(99,102,241,0.18)]'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => {
                        setQrMode('static');
                        if (!selectedQuickAction) {
                          setQrType(null);
                        }
                        setWebsiteTouched(false);
                        setEmailTouched(false);
                        setPhoneTouched(false);
                        if (isMobileV2) {
                          setMobileStudioStep(3);
                        }
                      }}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Static
                    </Button>
                    <Button
                      size="sm"
                      className={qrMode === 'dynamic'
                        ? 'bg-card/80 text-foreground border border-primary/50 rounded-xl uppercase tracking-[0.2em] text-xs shadow-[0_0_14px_rgba(99,102,241,0.18)]'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => {
                        if (!user) {
                          toast.info('Create a free account to access these features no credit card required!');
                          navigate('/login?mode=signup');
                          return;
                        }
                        setQrMode('dynamic');
                        if (!selectedQuickAction) {
                          setQrType(null);
                        }
                        setWebsiteTouched(false);
                        setEmailTouched(false);
                        setPhoneTouched(false);
                        if (isMobileV2) {
                          setMobileStudioStep(3);
                        }
                      }}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Dynamic
                    </Button>
                  </div>
                </div>
              </motion.div>

                <div ref={detailsSectionRef} className="space-y-6">
                  {hasSelectedMode && !selectedQuickAction ? (
                    <div className="space-y-4" data-mobile-step={isMobileV2 ? '1' : '2'}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {isMobileV2 ? 'Choose QR Type' : 'Step 2 · QR Type'}
                        </h3>
                        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Choose</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setQrType('website');
                            setWebsiteTouched(false);
                            setEmailTouched(false);
                            setPhoneTouched(false);
                            setSelectedQuickAction(null);
                            if (isMobileV2) {
                              setMobileStudioStep(3);
                            }
                          }}
                          className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                            qrType === 'website'
                              ? 'border-border/70 bg-card/80'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">URL QR</p>
                          <p className="mt-2 font-semibold">Open a URL</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrType('vcard');
                            setSelectedQuickAction(null);
                            if (isMobileV2) {
                              setMobileStudioStep(3);
                            }
                          }}
                          className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                            qrType === 'vcard'
                              ? 'border-border/70 bg-card/80'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Virtual Card</p>
                          <p className="mt-2 font-semibold">Share your profile</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrType('email');
                            setEmailTouched(false);
                            setSelectedQuickAction(null);
                            if (isMobileV2) {
                              setMobileStudioStep(3);
                            }
                          }}
                          className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                            qrType === 'email'
                              ? 'border-border/70 bg-card/80'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Email</p>
                          <p className="mt-2 font-semibold">Send an email</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrType('phone');
                            setPhoneTouched(false);
                            setFileTouched(false);
                            setSelectedQuickAction(null);
                            if (isMobileV2) {
                              setMobileStudioStep(3);
                            }
                          }}
                          className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                            qrType === 'phone'
                              ? 'border-border/70 bg-card/80'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Phone</p>
                          <p className="mt-2 font-semibold">Call a number</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrType('file');
                            setFileTouched(false);
                            setSelectedQuickAction(null);
                            if (isMobileV2) {
                              setMobileStudioStep(3);
                            }
                          }}
                          className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                            qrType === 'file'
                              ? 'border-border/70 bg-card/80'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">File</p>
                          <p className="mt-2 font-semibold">Share a file</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrType('menu');
                            setSelectedQuickAction(null);
                            if (isMobileV2) {
                              setMobileStudioStep(3);
                            }
                          }}
                          className={`rounded-t-2xl border px-4 py-3 text-left transition-all ${
                            qrType === 'menu'
                              ? 'border-border/70 bg-card/80'
                              : 'border-border/60 bg-secondary/30 hover:border-primary/60'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu</p>
                          <p className="mt-2 font-semibold">Dynamic QR menu</p>
                        </button>
                      </div>
                    </div>
                  ) : isMobileV2 ? null : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                      Choose Static or Dynamic to continue.
                    </div>
                  )}

                <div data-mobile-step="3" className="space-y-6">
                {hasSelectedMode && hasSelectedType ? (
                  qrType === 'website' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · URL Contents</h3>
                      </div>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value.toLowerCase())}
                        onBlur={() => setWebsiteTouched(true)}
                        placeholder="example.com or https://example.com"
                        className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                        inputMode="url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a valid website ending in a real domain (.com, .org, .net, etc).
                      </p>
                      {websiteTouched && websiteUrl && !isWebsiteValid && (
                        <p className="text-xs text-destructive">
                          Please enter a valid website URL.
                        </p>
                      )}
                      {isWebsiteValid && (
                        <Button
                          type="button"
                          size="lg"
                          className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                          onClick={() => setShowQrCustomizer(true)}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  ) : qrType === 'email' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Email Contents</h3>
                      </div>
                      <Input
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        placeholder="you@example.com"
                        className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                        inputMode="email"
                      />
                      <p className="text-xs text-muted-foreground">
                        QR will open a new email to this address.
                      </p>
                      {emailTouched && emailAddress && !isEmailValid && (
                        <p className="text-xs text-destructive">
                          Please enter a valid email address.
                        </p>
                      )}
                      {isEmailValid && (
                        <Button
                          type="button"
                          size="lg"
                          className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                          onClick={() => setShowQrCustomizer(true)}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  ) : qrType === 'phone' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Phone Contents</h3>
                      </div>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="+1 (555) 123-4567"
                        className="h-14 text-lg pl-4 pr-12 border-border bg-secondary/50 focus:border-primary input-glow"
                        inputMode="tel"
                      />
                      <p className="text-xs text-muted-foreground">
                        QR will start a call to this number.
                      </p>
                      {phoneTouched && phoneNumber && !isPhoneValid && (
                        <p className="text-xs text-destructive">
                          Please enter a valid phone number.
                        </p>
                      )}
                      {isPhoneValid && (
                        <Button
                          type="button"
                          size="lg"
                          className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                          onClick={() => setShowQrCustomizer(true)}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  ) : qrType === 'file' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <File className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · File Contents</h3>
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
                          <Input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileUpload}
                            onBlur={() => setFileTouched(true)}
                            className="h-14 text-lg border-border bg-secondary/50 focus:border-primary input-glow"
                          />
                        </div>
                      ) : (
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileUpload}
                          onBlur={() => setFileTouched(true)}
                          className="h-14 text-lg border-border bg-secondary/50 focus:border-primary input-glow"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Upload a file to embed directly into your QR code.
                      </p>
                      {fileTouched && !fileUrl && !fileUploading && (
                        <p className="text-xs text-destructive">
                          Please upload a file to continue.
                        </p>
                      )}
                      {fileName && !fileUploading ? (
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Selected: {fileName}
                        </p>
                      ) : null}
                    </div>
                  ) : qrType === 'menu' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Utensils className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Menu Contents</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Upload your menu pages, add a logo, and preview the swipe/flip experience.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-border uppercase tracking-[0.2em] text-xs"
                          onClick={openMenuBuilder}
                        >
                          Open Menu Builder
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {menuFiles.length > 0
                            ? `${menuFiles.length} page${menuFiles.length === 1 ? '' : 's'} uploaded`
                            : 'No menu pages uploaded yet'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · VCard Contents</h3>
                      </div>
                      <Button
                        type="button"
                        size="lg"
                        className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                        onClick={() => setShowVcardContents(true)}
                      >
                        Continue
                      </Button>
                    </div>
                  )
                ) : null}

                {!isMobileV2 && isMobile && hasSelectedMode && hasSelectedType && !mobileCustomizeStep && (
                  <div className="glass-panel rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Step 4 · Optional</p>
                        <h3 className="text-lg font-semibold">Customize your QR</h3>
                      </div>
                      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Preview</span>
                    </div>
                    <div className="flex justify-center">
                      <QRPreview
                        options={{ ...options, size: 160 }}
                        contentOverride={previewContent}
                        showCaption={false}
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Button
                        type="button"
                        className="min-w-[170px] gap-2 border border-amber-400/80 bg-amber-200/60 text-amber-900 shadow-[0_0_18px_rgba(251,191,36,0.15)] hover:border-amber-400 hover:bg-amber-200/70 uppercase tracking-[0.2em] text-xs dark:border-amber-300/70 dark:bg-amber-300/15 dark:text-amber-200 dark:hover:border-amber-300 dark:hover:bg-amber-300/25"
                        onClick={() => setMobileCustomizeStep(true)}
                        disabled={!canGenerate}
                      >
                        Customize
                      </Button>
                      <Button
                        type="button"
                        className="min-w-[170px] gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                        onClick={() => {
                          setMobileCustomizeStep(true);
                          const defaultName = qrType === 'file' ? fileName || 'File QR' : 'QRC Untitled 1';
                          setQrName(defaultName);
                          setShowNameOverlay(true);
                        }}
                        disabled={!canGenerate}
                      >
                        Skip & Done
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Your QR will use the default studio style unless you customize it. Click Done to name and generate.
                    </p>
                  </div>
                )}

                {!isMobile ? (
                  hasSelectedType && showMobileCustomize ? (
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="lg"
                            className="gap-2 bg-secondary/60 border border-border hover:border-primary hover:bg-primary/10"
                            disabled={!hasGenerated}
                          >
                            <Download className="h-4 w-4" />
                            Download
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="glass-panel">
                          <DropdownMenuItem onClick={() => handleDownload('png')}>
                            Download PNG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload('svg')}>
                            Download SVG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload('jpeg')}>
                            Download JPEG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-2 border-border hover:border-primary hover:bg-primary/10"
                        onClick={handleCopy}
                        disabled={!hasGenerated}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                      Complete the details to unlock generate and export actions.
                    </div>
                  )
                ) : null}
                </div>
              </div>
            </div>
              {showMobileCustomize && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center"
                  data-mobile-step={isMobileV2 ? '4' : undefined}
                >
                  {isMobileV2 && (
                    <div className="mb-4 w-full max-w-md text-left">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Step 4 · Customization</p>
                      <h3 className="text-lg font-semibold">Customize your QR</h3>
                    </div>
                  )}
                  {qrType === 'menu' && (
                    <div className="mb-4 w-full max-w-md rounded-2xl border border-border/60 bg-secondary/20 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu Preview</p>
                      <div className="mt-3 rounded-xl border border-border/60 bg-card/80 overflow-hidden">
                        {menuHasPdf ? (
                          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                            <File className="h-8 w-8 text-primary" />
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">PDF Menu</p>
                          </div>
                        ) : menuHasFiles ? (
                          <img
                            src={menuFiles[0]?.url}
                            alt="Menu preview"
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Utensils className="h-8 w-8 text-primary" />
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                              Upload menu pages to preview
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {hasSelectedMode && hasSelectedType ? (
                    <div ref={customizePreviewRef}>
                      <QRPreview
                        ref={qrRef}
                        options={previewOptions}
                        isGenerating={isGenerating}
                        contentOverride={previewContent}
                        showCaption={hasGenerated}
                      />
                    </div>
                  ) : (
                    <div className="glass-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
                      Select a mode and type to preview your QR design.
                    </div>
                  )}
                </motion.div>
              )}

              {hasGenerated && showMobileCustomize && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-panel rounded-2xl p-6 space-y-4"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Result</p>
                    <h3 className="text-lg font-semibold">Your QR is ready</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Input
                      value={generatedContent}
                      readOnly
                      className="bg-secondary/40 border-border text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-border hover:border-primary hover:bg-primary/10"
                      onClick={handleCopyUrl}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="gap-2 bg-secondary/60 border border-border hover:border-primary hover:bg-primary/10"
                        >
                          <Download className="h-4 w-4" />
                          Download
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="glass-panel">
                        <DropdownMenuItem onClick={() => handleDownload('png')}>
                          Download PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('svg')}>
                          Download SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('jpeg')}>
                          Download JPEG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {canShowPreview && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary hover:text-primary/80 transition"
                      >
                        <Monitor className="h-4 w-4" />
                        Live Preview
                      </a>
                    )}
                  </div>

                  {canShowPreview && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-xl border border-border/60 bg-secondary/30"
                    >
                      <img
                        src={`https://image.thum.io/get/width/1200/${previewUrl}`}
                        alt="Live preview"
                        className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </a>
                  )}
                </motion.div>
              )}
              
            {/* Right Panel - Customization */}
            <motion.div
              ref={customizeSectionRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              {hasSelectedMode && hasSelectedType && (!isMobileV2 && (!isMobile || mobileCustomizeStep)) ? (
                <div className="glass-panel rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground px-4 pt-2">
                    Step 4 · Customize
                  </p>
                  <Accordion type="multiple" defaultValue={['colors', 'style', 'logo']} className="space-y-2">
                    <AccordionItem value="colors" className="border-none">
                      <AccordionTrigger
                        className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline"
                        onClick={() => {
                          window.setTimeout(() => scrollToRef(colorsSectionRef, 'start'), 30);
                        }}
                      >
                        <span className="text-sm font-medium">Colors</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <div ref={colorsSectionRef} className="space-y-5">
                          <ColorPicker
                            label="Foreground Color"
                            value={options.fgColor}
                            onChange={(v) => updateOption('fgColor', v)}
                            presets={fgColorPresets}
                          />
                          <ColorPicker
                            label="Background Color"
                            value={options.bgColor}
                            onChange={(v) => updateOption('bgColor', v)}
                            presets={bgColorPresets}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="style" className="border-none">
                      <AccordionTrigger
                        className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline"
                        onClick={() => {
                          window.setTimeout(() => scrollToRef(styleSectionRef, 'start'), 30);
                        }}
                      >
                        <span className="text-sm font-medium">Style</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <div ref={styleSectionRef} className="space-y-5">
                          <CornerStylePicker
                            value={options.cornerStyle}
                            onChange={(v) => updateOption('cornerStyle', v)}
                          />
                          <ErrorCorrectionSelector
                            value={options.errorCorrectionLevel}
                            onChange={(v) => updateOption('errorCorrectionLevel', v)}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="logo" className="border-none">
                      <AccordionTrigger
                        className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline"
                        onClick={() => {
                          window.setTimeout(() => scrollToRef(logoSectionRef, 'start'), 30);
                        }}
                      >
                        <span className="text-sm font-medium">Logo</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <div ref={logoSectionRef} className="space-y-4">
                          <LogoUpload
                            logo={options.logo}
                            maxLogoSize={Math.round((options.size - 32) * 0.22)}
                            onLogoChange={(v, meta) => {
                              updateOption('logo', v);
                              updateOption('logoAspect', meta?.aspect);
                              updateOption('logoWidth', meta?.width);
                              updateOption('logoHeight', meta?.height);
                            }}
                          />
                          {options.logo && (
                            <div>
                              <SizeSlider
                                value={options.logoSize || 50}
                                onChange={(v) => updateOption('logoSize', v)}
                                min={20}
                                max={100}
                              />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="px-4 pb-4 pt-2 space-y-3">
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
                      disabled={!canGenerate}
                      onClick={() => {
                        // Reset name to default if needed
                        const defaultName = qrType === 'file' ? fileName || 'File QR' : 'QRC Untitled 1';
                        setQrName(defaultName);
                        setShowNameOverlay(true);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground">
                  {isMobileV2 ? (
                    canGenerate ? null : 'Complete steps 2–3 to unlock customization.'
                  ) : isMobileV2 ? null : isMobile ? (
                    'Choose Customize to edit colors, style, and logo.'
                  ) : (
                    'Customize colors, style, and logo once you pick a mode and QR type.'
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </section>
        )}
          </>
        )}

        {activeTab === 'codes' && (
          <section id="arsenal" className={`space-y-6 ${isMobileV2 ? 'qrc-v2-section' : ''}`}>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Arsenal</p>
              <h2 
                className="text-2xl sm:text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => setShowNavOverlay(true)}
              >
                Your QR Codes
              </h2>
            </div>
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
        )}

        {activeTab === 'analytics' && (
          <section id="intel" className={`space-y-6 ${isMobileV2 ? 'qrc-v2-section' : ''}`}>
            <div className="relative">
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap sm:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Intel</p>
                    <h2 
                      className="text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                      onClick={() => setShowNavOverlay(true)}
                    >
                      Live Intelligence
                    </h2>
                  </div>
                  <div className="relative ml-auto">
                    <select
                      defaultValue=""
                      onChange={(event) => {
                        const value = event.target.value as 'day' | 'week' | 'month' | '';
                        if (!value) return;
                        handleExportCsv(value);
                        event.target.value = '';
                      }}
                      className="appearance-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs uppercase tracking-[0.3em] text-foreground pr-7 hover:bg-secondary/40"
                    >
                      <option value="" disabled>Export CSV</option>
                      <option value="day">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {isMobileV2 ? (
                  <Tabs defaultValue="map">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="map">Map</TabsTrigger>
                      <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                    </TabsList>
                    <TabsContent value="map">{intelMapPanel}</TabsContent>
                    <TabsContent value="snapshot">{intelSnapshotPanel}</TabsContent>
                  </Tabs>
                ) : (
                  <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                    {intelMapPanel}
                    {intelSnapshotPanel}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section id="config" className={`space-y-6 ${isMobileV2 ? 'qrc-v2-section qrc-config-section' : ''}`}>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Config</p>
              <h2 
                className="text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => setShowNavOverlay(true)}
              >
                Preferences
              </h2>
            </div>
            {!isLoggedIn ? (
              <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-4">
                <p>From here you can customize your experience and preferences.</p>
                <p>Please log in or create an account to unlock settings, exports, and team features.</p>
                <div className="flex flex-col sm:flex-row gap-2 text-sm">
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 transition"
                    onClick={() => navigate('/login')}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 transition"
                    onClick={() => navigate('/login')}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            ) : (
              <div className={`glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-6 ${isMobileV2 ? 'qrc-config-panel' : ''}`}>
                <div className={`space-y-4 ${isMobileV2 ? 'qrc-config-content' : ''}`} style={isMobileV2 ? { backgroundColor: 'transparent' } : undefined}>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Theme</p>
                    <ThemeToggle storageKey={`theme:${user?.id ?? 'default'}`} />
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t('Profile', 'Perfil')}
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAvatarEditor(true)}
                        className={`flex h-20 w-20 items-center justify-center rounded-full border border-border/60 ${selectedAvatarColor.bg} ${selectedAvatarColor.text}`}
                        aria-label="Edit avatar"
                      >
                        {profileForm.avatarType === 'letter' ? (
                          <span className="text-2xl font-semibold">{avatarLetter}</span>
                        ) : profileForm.avatarType === 'cap' ? (
                          <GraduationCap className="h-8 w-8" />
                        ) : profileForm.avatarType === 'bun' ? (
                          <UserRound className="h-8 w-8" />
                        ) : (
                          <User className="h-8 w-8" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition"
                        onClick={() => setShowAvatarEditor(true)}
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Choose an avatar style and color that fits your brand.
                    </div>
                  </div>
                  <Input
                    value={profileForm.fullName}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    placeholder={t('Full Name', 'Nombre completo')}
                    className="bg-secondary/40 border-border"
                  />
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={profileForm.username}
                        onChange={(event) => {
                          setProfileForm((prev) => ({
                            ...prev,
                            username: event.target.value.slice(0, 18),
                          }));
                          setUsernameStatus('idle');
                          setUsernameError('');
                        }}
                        onBlur={handleUsernameCheck}
                        placeholder={t('Username (max 18 characters)', 'Nombre de usuario (max 18 caracteres)')}
                        disabled={isUsernameCooldown}
                        className={`bg-secondary/40 border-border ${usernameError ? 'border-destructive animate-shake' : ''} ${isUsernameCooldown ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-border uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
                        onClick={handleUsernameCheck}
                        disabled={isUsernameCooldown || !profileForm.username.trim() || usernameStatus === 'checking'}
                      >
                        {usernameStatus === 'checking' ? t('Checking...', 'Verificando...') : t('Check', 'Verificar')}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isUsernameCooldown && t('Username changes are on cooldown.', 'El cambio de usuario esta en espera.')}
                      {usernameStatus === 'checking' && t('Checking availability...', 'Verificando disponibilidad...')}
                      {usernameStatus === 'available' && t('Username is available.', 'Nombre de usuario disponible.')}
                      {usernameStatus === 'taken' && (usernameError || t('Username is already taken.', 'Nombre de usuario ya esta en uso.'))}
                      {usernameStatus === 'invalid' && (usernameError || t('Please keep it family friendly.', 'Mantengamoslo apto para todos.'))}
                      {!isUsernameCooldown && usernameStatus === 'idle' && t('Usernames can be changed once every 30 days.', 'Los nombres de usuario se pueden cambiar cada 30 dias.')}
                    </div>
                    {userProfile?.usernameChangedAt && (
                      <div className="text-[11px] text-muted-foreground">
                        {t('Next change available:', 'Proximo cambio disponible:')}{' '}
                        {new Date(new Date(userProfile.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {showAvatarEditor && (
                    <div
                      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
                      onClick={() => setShowAvatarEditor(false)}
                    >
                      <div
                        className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Avatar</p>
                          <button
                            type="button"
                            className="text-xs uppercase tracking-[0.3em] text-primary"
                            onClick={() => setShowAvatarEditor(false)}
                          >
                            Done
                          </button>
                        </div>
                        <div className="flex items-center justify-center">
                          <div
                            className={`flex h-24 w-24 items-center justify-center rounded-full border border-border/60 ${selectedAvatarColor.bg} ${selectedAvatarColor.text}`}
                          >
                            {profileForm.avatarType === 'letter' ? (
                              <span className="text-3xl font-semibold">{avatarLetter}</span>
                            ) : profileForm.avatarType === 'cap' ? (
                              <GraduationCap className="h-10 w-10" />
                            ) : profileForm.avatarType === 'bun' ? (
                              <UserRound className="h-10 w-10" />
                            ) : (
                              <User className="h-10 w-10" />
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {avatarOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.3em] transition ${
                                profileForm.avatarType === option.id
                                  ? 'border-primary bg-secondary/50 text-foreground'
                                  : 'border-border/60 bg-secondary/20 text-muted-foreground hover:border-primary/60'
                              }`}
                              onClick={() => {
                                setProfileForm((prev) => ({ ...prev, avatarType: option.id }))
                                setAvatarDirty(true)
                              }}
                            >
                              {option.id === 'letter' ? (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-sm font-semibold">
                                  {avatarLetter}
                                </span>
                              ) : option.Icon ? (
                                <option.Icon className="h-5 w-5" />
                              ) : null}
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Color</p>
                          <div className="grid grid-cols-4 gap-2">
                            {avatarColors.map((color) => (
                              <button
                                key={color.id}
                                type="button"
                                className={`h-10 w-10 rounded-full border ${color.bg} ${color.text} ${
                                  profileForm.avatarColor === color.id ? 'ring-2 ring-primary' : 'border-border/60'
                                }`}
                                onClick={() => {
                                  setProfileForm((prev) => ({ ...prev, avatarColor: color.id }))
                                  setAvatarDirty(true)
                                }}
                                aria-label={color.label}
                              >
                                {profileForm.avatarColor === color.id ? '✓' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Leftie</p>
                      <p className="text-[11px] text-muted-foreground">Left-sided dial controls</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileForm.leftie}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, leftie: event.target.checked }))
                      }
                      className="accent-primary h-4 w-4"
                      aria-label="Leftie"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {t('Timezone', 'Zona horaria')}
                      <select
                        value={profileForm.timezone}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))
                        }
                        className="mt-2 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">{t('Auto-detect', 'Deteccion automatica')}</option>
                        {timeZoneOptions.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {t('Language', 'Idioma')}
                      <select
                        value={profileForm.language}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, language: event.target.value }))
                        }
                        className="mt-2 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                      </select>
                    </label>
                  </div>
                  <div className="space-y-2 pt-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {t('Change Password', 'Cambiar contrasena')}
                    </p>
                    <Input
                      value={profileForm.currentPassword}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                      placeholder={t('Current Password', 'Contrasena actual')}
                      type="password"
                      className="bg-secondary/40 border-border"
                    />
                    <Input
                      value={profileForm.newPassword}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                      placeholder={t('New Password', 'Nueva contrasena')}
                      type="password"
                      className="bg-secondary/40 border-border"
                    />
                    <Input
                      value={profileForm.confirmPassword}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder={t('Confirm New Password', 'Confirmar nueva contrasena')}
                      type="password"
                      className="bg-secondary/40 border-border"
                    />
                  </div>
                  {/* Spacer for floating save button */}
                  {isMobileV2 && (() => {
                    if (!initialProfileForm) return <div className="h-20" />;
                    const hasChanges =
                      profileForm.fullName !== initialProfileForm.fullName ||
                      profileForm.username !== initialProfileForm.username ||
                      profileForm.timezone !== initialProfileForm.timezone ||
                      profileForm.language !== initialProfileForm.language ||
                      profileForm.leftie !== initialProfileForm.leftie ||
                      profileForm.avatarType !== initialProfileForm.avatarType ||
                      profileForm.avatarColor !== initialProfileForm.avatarColor ||
                      profileForm.currentPassword !== '' ||
                      profileForm.newPassword !== '' ||
                      profileForm.confirmPassword !== '' ||
                      avatarDirty;
                    if (!hasChanges) return <div className="h-4" />;
                    return <div className="h-20" />;
                  })()}
                </div>
                {/* Floating Save Button Overlay */}
                {isMobileV2 && (() => {
                  if (!initialProfileForm) return null;
                  const hasChanges =
                    profileForm.fullName !== initialProfileForm.fullName ||
                    profileForm.username !== initialProfileForm.username ||
                    profileForm.timezone !== initialProfileForm.timezone ||
                    profileForm.language !== initialProfileForm.language ||
                    profileForm.leftie !== initialProfileForm.leftie ||
                    profileForm.avatarType !== initialProfileForm.avatarType ||
                    profileForm.avatarColor !== initialProfileForm.avatarColor ||
                    profileForm.currentPassword !== '' ||
                    profileForm.newPassword !== '' ||
                    profileForm.confirmPassword !== '' ||
                    avatarDirty;
                  if (!hasChanges) return null;
                  return (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                      <Button
                        type="button"
                        className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs shadow-lg pointer-events-auto"
                        onClick={handleProfileSave}
                        disabled={profileSaving}
                      >
                        {profileSaving ? t('Saving...', 'Guardando...') : t('Save Preferences', 'Guardar preferencias')}
                      </Button>
                    </div>
                  );
                })()}
                {/* Desktop Save Button */}
                {!isMobileV2 && (() => {
                  if (!initialProfileForm) return null;
                  const hasChanges =
                    profileForm.fullName !== initialProfileForm.fullName ||
                    profileForm.username !== initialProfileForm.username ||
                    profileForm.timezone !== initialProfileForm.timezone ||
                    profileForm.language !== initialProfileForm.language ||
                    profileForm.leftie !== initialProfileForm.leftie ||
                    profileForm.avatarType !== initialProfileForm.avatarType ||
                    profileForm.avatarColor !== initialProfileForm.avatarColor ||
                    profileForm.currentPassword !== '' ||
                    profileForm.newPassword !== '' ||
                    profileForm.confirmPassword !== '' ||
                    avatarDirty;
                  if (!hasChanges) return null;
                  return (
                    <Button
                      type="button"
                      className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                    >
                      {profileSaving ? t('Saving...', 'Guardando...') : t('Save Preferences', 'Guardar preferencias')}
                    </Button>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {activeTab === 'upgrade' && (
          <section id="upgrade" className="space-y-10">
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Upgrade</p>
              <h2 
                className="text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors inline-block"
                onClick={() => setShowNavOverlay(true)}
              >
                QR Code Studio by Luminar Apps
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
            )}
          </section>
        )}

        {activeTab === 'adaptive' && (
          <section id="adaptive" className={`space-y-10 ${isMobileV2 ? 'qrc-v2-section' : ''}`}>
            {isMobileV2 ? (
              <div className="space-y-4">
                {/* Clickable Header - OUTSIDE and ON TOP of container */}
                <div className="mb-0 pb-4 border-b border-border/50">
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-1">Rules Based QRC</p>
                  <h2 
                    className="text-lg font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowNavOverlay(true)}
                  >
                    Adaptive QRC™
                  </h2>
                </div>
                
                <div className="glass-panel rounded-2xl p-4 flex flex-col overflow-hidden">
                  <ScrollArea className="qrc-arsenal-scroll qrc-no-scroll-x max-w-full w-full">
                    <div className="flex flex-col min-h-0">

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
                </ScrollArea>
                </div>
              </div>
            ) : (
              <>
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
                      className="glass-panel rounded-2xl p-8 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20"
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
                    <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-900/10">
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
                      className="glass-panel rounded-2xl p-12 border-2 border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 shadow-xl shadow-amber-500/20 text-center"
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
                    <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-900/10">
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
              </>
            )}
          </section>
        )}

        {/* Adaptive QRC Wizard Overlay */}
        {showAdaptiveWizard && (
          <AdaptiveQRCWizard
            user={user}
            userProfile={userProfile}
            onComplete={handleAdaptiveQRCCreate}
            onCancel={() => setShowAdaptiveWizard(false)}
            existingAdaptiveQRC={existingAdaptiveQRC || undefined}
            isMobile={isMobile}
            isMobileV2={isMobileV2}
          />
        )}

        {/* GENERATING Adaptive QRC™ Loading Overlay */}
        {isGeneratingAdaptive && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gradient-to-br from-[#0b0f14]/95 via-[#1a1a1a]/95 to-[#0b0f14]/95 backdrop-blur-sm">
            <div className="fixed inset-0 bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-amber-900/30 pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative z-10 text-center space-y-6"
            >
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 rounded-full blur-2xl opacity-50 animate-pulse" />
                  <Loader2 className="h-16 w-16 text-amber-400 animate-spin relative z-10" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                  GENERATING Adaptive QRC™
                </h2>
                <p className="text-sm text-muted-foreground">
                  Creating your premium content routing QR code...
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Adaptive QRC Editor Overlay */}
        {showAdaptiveEditor && existingAdaptiveQRC && (
          <AdaptiveQRCEditor
            adaptiveQRC={existingAdaptiveQRC}
            userProfile={userProfile}
            onSave={handleAdaptiveQRCUpdate}
            onClose={() => setShowAdaptiveEditor(false)}
            isMobile={isMobile}
            isMobileV2={isMobileV2}
          />
        )}

        {/* Old Adaptive Tab - Removed but keeping structure for reference */}
        {false && activeTab === 'adaptive' && (
          <section id="adaptive" className="space-y-10">
            <div className="relative">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] blur-sm pointer-events-none select-none">
                <div className="glass-panel rounded-2xl p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Content Slots</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-xs uppercase tracking-[0.2em]"
                        onClick={() => setAdaptiveSlotCount((prev) => Math.min(prev + 1, 3))}
                        disabled={adaptiveSlotCount >= 3}
                      >
                        Add Slot
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs uppercase tracking-[0.2em]"
                        onClick={() => setAdaptiveSlotCount((prev) => Math.max(prev - 1, 1))}
                        disabled={adaptiveSlotCount <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {adaptiveSlotsVisible.map((slot) => (
                      <div key={slot.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Slot {slot.id}
                          </p>
                          <span className={`text-[10px] uppercase tracking-[0.3em] ${adaptiveGradientText}`}>
                            Adaptive QRC™
                          </span>
                        </div>
                        <Input
                          value={slot.name}
                          onChange={(event) =>
                            handleAdaptiveSlotChange(slot.id, 'name', event.target.value)
                          }
                          placeholder="Slot name"
                          className="bg-secondary/40 border-border"
                        />
                        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                          <select
                            className="h-11 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                            value={slot.type}
                            onChange={(event) =>
                              handleAdaptiveSlotChange(slot.id, 'type', event.target.value)
                            }
                          >
                            <option value="url">URL</option>
                          </select>
                          <Input
                            value={slot.url}
                            onChange={(event) =>
                              handleAdaptiveSlotChange(slot.id, 'url', event.target.value)
                            }
                            placeholder="https://"
                            className="bg-secondary/40 border-border"
                          />
                        </div>
                        <Input
                          value={slot.note}
                          onChange={(event) =>
                            handleAdaptiveSlotChange(slot.id, 'note', event.target.value)
                          }
                          placeholder="Optional label or note"
                          className="bg-secondary/40 border-border"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Rules</h3>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Routing logic
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Use Date/Time Rules</p>
                        <p className="text-xs text-muted-foreground">
                          Route by date ranges, days, and time windows.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={adaptiveDateRulesEnabled}
                        onChange={(event) => setAdaptiveDateRulesEnabled(event.target.checked)}
                        className="accent-primary"
                      />
                    </div>
                    {adaptiveDateRulesEnabled && (
                      <div className="space-y-4">
                        {adaptiveDateRules.map((rule) => (
                          <div key={rule.id} className="rounded-xl border border-border/60 bg-background/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                Date Rule
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs uppercase tracking-[0.2em]"
                                onClick={() => handleRemoveAdaptiveRule(rule.id)}
                                disabled={adaptiveDateRules.length === 1}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                  Start Date
                                </label>
                                <Input
                                  type="date"
                                  value={rule.startDate}
                                  onChange={(event) =>
                                    handleAdaptiveRuleChange(rule.id, 'startDate', event.target.value)
                                  }
                                  className="bg-secondary/40 border-border"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                  End Date
                                </label>
                                <Input
                                  type="date"
                                  value={rule.endDate}
                                  onChange={(event) =>
                                    handleAdaptiveRuleChange(rule.id, 'endDate', event.target.value)
                                  }
                                  className="bg-secondary/40 border-border"
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                  Start Time
                                </label>
                                <Input
                                  type="time"
                                  value={rule.startTime}
                                  onChange={(event) =>
                                    handleAdaptiveRuleChange(rule.id, 'startTime', event.target.value)
                                  }
                                  className="bg-secondary/40 border-border"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                  End Time
                                </label>
                                <Input
                                  type="time"
                                  value={rule.endTime}
                                  onChange={(event) =>
                                    handleAdaptiveRuleChange(rule.id, 'endTime', event.target.value)
                                  }
                                  className="bg-secondary/40 border-border"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                Days of Week
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleAdaptiveDayToggle(rule.id, day)}
                                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${
                                      rule.days.includes(day)
                                        ? 'border-amber-300/70 text-amber-200 bg-amber-400/10'
                                        : 'border-border/60 text-muted-foreground'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                Route to Slot
                              </label>
                              <select
                                className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                                value={rule.slot}
                                onChange={(event) =>
                                  handleAdaptiveRuleChange(rule.id, 'slot', event.target.value)
                                }
                              >
                                {adaptiveSlotsVisible.map((slot) => (
                                  <option key={slot.id} value={slot.id}>
                                    Slot {slot.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          className="border-border text-xs uppercase tracking-[0.2em]"
                          onClick={handleAddAdaptiveRule}
                        >
                          Add Date Rule
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">First Scan vs Returning</p>
                        <p className="text-xs text-muted-foreground">
                          We remember returning visitors using a privacy-friendly device token.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={adaptiveFirstReturnEnabled}
                        onChange={(event) => setAdaptiveFirstReturnEnabled(event.target.checked)}
                        className="accent-primary"
                      />
                    </div>
                    {adaptiveFirstReturnEnabled && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                            First Scan
                          </label>
                          <select
                            className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                            value={adaptiveFirstSlot}
                            onChange={(event) => setAdaptiveFirstSlot(event.target.value as 'A' | 'B' | 'C')}
                          >
                            {adaptiveSlotsVisible.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                Slot {slot.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                            Returning
                          </label>
                          <select
                            className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                            value={adaptiveReturnSlot}
                            onChange={(event) => setAdaptiveReturnSlot(event.target.value as 'A' | 'B' | 'C')}
                          >
                            {adaptiveSlotsVisible.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                Slot {slot.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Authorized Admin IPs</p>
                        <p className="text-xs text-muted-foreground">
                          Prioritize admin scans for internal routing.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={adaptiveAdminEnabled}
                        onChange={(event) => setAdaptiveAdminEnabled(event.target.checked)}
                        className="accent-primary"
                      />
                    </div>
                    {adaptiveAdminEnabled && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input
                            value={adaptiveAdminIpInput}
                            onChange={(event) => setAdaptiveAdminIpInput(event.target.value)}
                            placeholder="Add IP address"
                            className="bg-secondary/40 border-border"
                          />
                          <Button
                            variant="outline"
                            className="border-border text-xs uppercase tracking-[0.2em]"
                            onClick={handleAddAdaptiveIp}
                          >
                            Add IP
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {adaptiveAdminIps.map((ip) => (
                            <span
                              key={ip}
                              className="rounded-full border border-border/60 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
                            >
                              {ip}
                            </span>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                            Admin Slot
                          </label>
                          <select
                            className="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                            value={adaptiveAdminSlot}
                            onChange={(event) => setAdaptiveAdminSlot(event.target.value as 'A' | 'B' | 'C')}
                          >
                            {adaptiveSlotsVisible.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                Slot {slot.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                    <p className="text-sm font-semibold">Rule Priority</p>
                    <p className="text-xs text-muted-foreground">How it works</p>
                    <ul className="text-xs text-muted-foreground space-y-2">
                      <li>1. Authorized Admin IPs</li>
                      <li>2. First-time vs Returning</li>
                      <li>3. Date/Time Rules</li>
                      <li>4. Default Slot fallback</li>
                    </ul>
                  </div>
                </div>
              </div>

                <div className="space-y-6">
                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Default Slot</p>
                  <select
                    className="h-12 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm"
                    value={adaptiveDefaultSlot}
                    onChange={(event) => setAdaptiveDefaultSlot(event.target.value as 'A' | 'B' | 'C')}
                  >
                    {adaptiveSlotsVisible.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        Slot {slot.id}
                      </option>
                    ))}
                  </select>
                </div>

                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs uppercase tracking-[0.3em] ${adaptiveGradientText}`}>
                        Adaptive QRC™
                      </p>
                      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        Preview
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>If scanned now: <span className="text-foreground font-semibold">Slot {adaptiveNowSlot}</span></p>
                      <p>If scanned by returning visitor: <span className="text-foreground font-semibold">Slot {adaptiveReturningSlot}</span></p>
                      <p>If scanned from authorized IP: <span className="text-foreground font-semibold">Slot {adaptiveAdminPreviewSlot}</span></p>
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-6 space-y-3">
                    <Button
                      className="group w-full bg-black text-white uppercase tracking-[0.2em] text-xs transition hover:bg-amber-400"
                      onClick={() => toast.success('Adaptive QRC™ saved (mock).')}
                    >
                      Save <span className="text-amber-300 transition group-hover:text-white">Adaptive QRC™</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-border uppercase tracking-[0.2em] text-xs"
                      onClick={() => toast.info('Preview routing loaded (mock).')}
                    >
                      Preview Routing
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Navigation Overlay */}
      {showNavOverlay && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={() => setShowNavOverlay(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Navigation</p>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition"
                onClick={() => setShowNavOverlay(false)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-2">
              {dialItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowNavOverlay(false);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('qrc.activeTab', item.id);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      isActive
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border/60 bg-secondary/20 text-muted-foreground hover:border-primary/40 hover:bg-secondary/40 hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${item.color} flex-shrink-0`} />
                    <div className="flex-1">
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-xs opacity-70">{dialDescriptions[item.id]}</p>
                    </div>
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Index;
