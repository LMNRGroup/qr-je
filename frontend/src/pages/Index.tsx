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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import { QROptions, QRHistoryItem, defaultQROptions } from '@/types/qr';
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
const QR_ASSETS_BUCKET = 'qr-uploads';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MENU_FILE_BYTES = 2.5 * 1024 * 1024;
const MAX_MENU_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_MENU_FILES = 15;
const MAX_VCARD_PHOTO_BYTES = 1.5 * 1024 * 1024;

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
  const [fileName, setFileName] = useState('');
  const [fileTouched, setFileTouched] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showIntroAd, setShowIntroAd] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [showGuestWelcome, setShowGuestWelcome] = useState(false);
  const [guestIntroStep, setGuestIntroStep] = useState(0);
  const [guestCtaStep, setGuestCtaStep] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAnalyticsIntro, setShowAnalyticsIntro] = useState(false);
  const [analyticsSeen, setAnalyticsSeen] = useState(false);
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [welcomeHeadline, setWelcomeHeadline] = useState('');
  const [welcomeSubline, setWelcomeSubline] = useState('');
  const [showGoodbyeIntro, setShowGoodbyeIntro] = useState(false);
  const [goodbyeHeadline, setGoodbyeHeadline] = useState('');
  const [goodbyeSubline, setGoodbyeSubline] = useState('');
  const welcomeShownRef = useRef<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const createOpenLockRef = useRef(false);
  const easterEggEmail = (import.meta.env.VITE_EASTER_EGG_EMAIL ?? '').toLowerCase().trim();
  const easterEggUserId = (import.meta.env.VITE_EASTER_EGG_USER_ID ?? '').trim();
  const showEasterEggBanner = Boolean(
    (easterEggEmail && user?.email && user.email.toLowerCase() === easterEggEmail) ||
    (easterEggUserId && user?.id === easterEggUserId)
  );
  const [actionRingText, setActionRingText] = useState('');
  const [quickActionHover, setQuickActionHover] = useState<string | null>(null);
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);
  const [actionRingOrigin, setActionRingOrigin] = useState({ x: 50, y: 50 });
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
  const [showVcardCustomizer, setShowVcardCustomizer] = useState(false);
  const [showVcardPreview, setShowVcardPreview] = useState(false);
  const [vcardPreviewSide, setVcardPreviewSide] = useState<'front' | 'back'>('front');
  const [showStudioBoot, setShowStudioBoot] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingCreateScroll, setPendingCreateScroll] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
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
    const labelFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: trendTimeZone,
      weekday: 'short',
    });
    const map = new Map<string, number>();
    intelTrends.forEach((point) => {
      if (!point.date) return;
      const key = keyFormatter.format(new Date(point.date));
      map.set(key, point.count ?? 0);
    });
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = keyFormatter.format(date);
      return {
        date,
        count: map.get(key) ?? 0,
        label: labelFormatter.format(date),
      };
    });
  }, [intelTrends, trendTimeZone]);
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

  const actionRingIcons = useMemo(
    () => ({
      static: LinkIcon,
      dynamic: Sparkles,
      vcard: User,
      file: File,
      phone: Phone,
      email: Mail,
      menu: Utensils,
      adaptive: QrCode,
    }),
    []
  );

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
  const photoDragRef = useRef<HTMLDivElement>(null);
  const photoDragState = useRef({ dragging: false, startX: 0, startY: 0, startPhotoX: 50, startPhotoY: 50 });
  const [showMenuBuilder, setShowMenuBuilder] = useState(false);
  const [menuType, setMenuType] = useState<'restaurant' | 'service'>('restaurant');
  const [menuFiles, setMenuFiles] = useState<{ url: string; type: 'image' | 'pdf' }[]>([]);
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
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const menuLogoInputRef = useRef<HTMLInputElement>(null);
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
            ? fileUrl.length > 0
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
    interval = window.setInterval(poll, 15000);
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [activeTab, isLoggedIn, isMobile, pushScanNotification, user?.id]);

  const refreshArsenalStats = useCallback(async () => {
    if (!isSessionReady) {
      setArsenalStats({ total: 0, dynamic: 0 });
      setScanStats({ total: 0 });
      return;
    }
    try {
      const [response, summary] = await Promise.all([getQRHistory(), getScanSummary('all')]);
      if (response.success) {
        const dynamicCount = response.data.filter(
          (item) => parseKind(item.kind ?? null).mode === 'dynamic'
        ).length;
        setArsenalStats({ total: response.data.length, dynamic: dynamicCount });
      }
      if (Number.isFinite(summary.total)) {
        setScanStats({ total: summary.total });
      }
    } catch {
      // ignore stats errors
    }
  }, [isSessionReady, parseKind]);

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
    let cancelled = false;
    let pollTimer: number | undefined;
    const timeZone =
      userProfile?.timezone ||
      profileForm.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fetchSummary = async (showLoading: boolean) => {
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
    pollTimer = window.setInterval(() => fetchSummary(false), 10000);
    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [activeTab, intelRange, isSessionReady, profileForm.timezone, userProfile?.timezone]);

  useEffect(() => {
    if (!isSessionReady) return;
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    const timeZone =
      userProfile?.timezone ||
      profileForm.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    getScanTrends(7, timeZone)
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
  }, [activeTab, isSessionReady, profileForm.timezone, userProfile?.timezone]);

  useEffect(() => {
    if (!isSessionReady) return;
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    let pollTimer: number | undefined;
    const fetchAreas = async (showToast: boolean) => {
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
    pollTimer = window.setInterval(() => fetchAreas(false), 15000);
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
        setProfileForm((prev) => ({
          ...prev,
          fullName: profile.name ?? prev.fullName,
          username: profile.username ?? prev.username,
          timezone: profile.timezone ?? prev.timezone,
          language: profile.language ?? prev.language ?? 'en',
          leftie: profile.leftie ?? prev.leftie,
          avatarType: profile.avatarType ?? prev.avatarType ?? 'letter',
          avatarColor: profile.avatarColor ?? prev.avatarColor ?? 'purple',
        }));
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

  useEffect(() => {
    if (!isCreateOpen) return;
    if (!hoveredAction) {
      setActionRingText('Create New QR Code');
      return;
    }
    const activeText = {
      static: 'Create New URL QR Code',
      dynamic: 'Create Dynamic QR Code',
      vcard: 'Create New VCard QR Code',
      file: 'Upload a File QR Code',
      phone: 'Create New Call QRC',
      email: 'Create New Email QRC',
      menu: 'Create Custom Menu QRC',
      adaptive: 'Create Adaptive QRC™',
    } as const;
    setActionRingText(activeText[hoveredAction as keyof typeof activeText] ?? 'Create New QR Code');
  }, [hoveredAction, isCreateOpen]);

  const lastQrTypeRef = useRef<string | null>(null);
  useEffect(() => {
    const previousType = lastQrTypeRef.current;
    if (previousType && previousType !== qrType) {
      setGeneratedShortUrl('');
      setGeneratedLongUrl('');
    }
    lastQrTypeRef.current = qrType;
  }, [qrType]);

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
    }
  }, [activeTab]);

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
      if (isCreateOpen) {
        setIsCreateOpen(false);
        setActionRingText('');
        return;
      }
      if (showVcardCustomizer) {
        setShowVcardCustomizer(false);
        return;
      }
      if (showMenuBuilder) {
        setShowMenuBuilder(false);
    setMenuBuilderStep('menu'); // Reset step when closing
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
  }, [isCreateOpen, selectedPlanComparison, showAccountModal, showGuestWelcome, showMenuBuilder, showVcardCustomizer]);

  useEffect(() => {
    if (!pendingCreateScroll) return;
    if (activeTab !== 'studio') return;

    const timer = window.setTimeout(() => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingCreateScroll(false);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [activeTab, pendingCreateScroll]);

  const handleGenerate = async () => {
    if (!hasSelectedMode) {
      toast.error('Choose Static or Dynamic to continue');
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
    setIsGenerating(true);
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
            ...optionsSnapshot,
            content: vcardUrl,
          },
        })
        : await generateQR(
          qrType === 'file' || qrType === 'menu'
            ? `${appBaseUrl}/pending/${crypto.randomUUID()}`
            : longFormContent,
          qrType === 'file'
            ? {
              ...optionsSnapshot,
              fileName: fileName || 'File QR',
              fileUrl,
            }
            : qrType === 'menu'
              ? {
                ...optionsSnapshot,
                menuFiles,
                menuType,
                menuLogoDataUrl,
                menuSocials,
              }
              : optionsSnapshot,
          `${qrMode ?? 'static'}:${qrType === 'website' ? 'url' : qrType ?? 'url'}`,
          qrType === 'file' ? fileName || 'File QR' : null
        );
      if (response.success) {
        if ('url' in response && response.url) {
          setGeneratedShortUrl(response.url.shortUrl);
          setGeneratedLongUrl(response.url.targetUrl);
          setLastGeneratedContent(response.url.shortUrl);
        } else if ('data' in response && response.data) {
          let nextItem = response.data;
          if ((qrType === 'file' || qrType === 'menu') && response.data.shortUrl) {
            const match = response.data.shortUrl.match(/\/r\/([^/]+)\/([^/]+)$/);
            if (match) {
              const [, id, random] = match;
              const targetUrl = qrType === 'file'
                ? `${appBaseUrl}/file/${id}/${random}`
                : `${appBaseUrl}/menu/${id}/${random}`;
              const updateResponse = await updateQR(id, {
                targetUrl,
                options: qrType === 'file'
                  ? {
                    ...options,
                    fileName: fileName || 'File QR',
                    fileUrl,
                  }
                  : {
                    ...options,
                    menuFiles,
                    menuType,
                    menuLogoDataUrl,
                    menuSocials,
                  },
                kind: `${qrMode ?? 'static'}:${qrType}`,
              });
              if (updateResponse.success && updateResponse.data) {
                nextItem = updateResponse.data;
              }
            }
          }
          const qrValue = nextItem.shortUrl ?? nextItem.content;
          setGeneratedShortUrl(nextItem.shortUrl ?? '');
          setLastGeneratedContent(qrValue);
        }
        toast.success('QR code generated!');
        setHasGenerated(true);
        setArsenalRefreshKey((prev) => prev + 1);
        setShowGenerateSuccess(true);
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
      setProfileForm((prev) => ({
        ...prev,
        username: updated.username ?? prev.username,
        timezone: updated.timezone ?? prev.timezone,
        language: updated.language ?? prev.language,
        leftie: updated.leftie ?? prev.leftie,
        avatarType: updated.avatarType ?? prev.avatarType,
        avatarColor: updated.avatarColor ?? prev.avatarColor,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
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
  const uploadQrAsset = async (file: File, folder: 'files' | 'menus' | 'logos', dataUrl?: string) => {
    if (!isSupabaseConfigured) {
      toast.error('Storage is not configured yet.');
      return null;
    }
    const extension = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'png');
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const filePath = `qr-assets/${folder}/${fileName}`;
    const payload = dataUrl ? dataUrlToBlob(dataUrl) : file;
    const { error } = await supabase.storage
      .from(QR_ASSETS_BUCKET)
      .upload(filePath, payload, { upsert: true, contentType: file.type });
    if (error) {
      toast.error('Failed to upload file.');
      return null;
    }
    const { data } = supabase.storage.from(QR_ASSETS_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  };
  const handleVcardPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    const maxSizeMb = (MAX_VCARD_PHOTO_BYTES / (1024 * 1024)).toFixed(1);
    let compressedDataUrl = '';
    if (file.size > MAX_VCARD_PHOTO_BYTES) {
      toast.info('Large photo detected. Compressing for your vCard...');
    }
    compressedDataUrl = await compressImageFile(file, { maxDimension: 1200, quality: 0.82 });
    const compressedBlob = dataUrlToBlob(compressedDataUrl);
    if (compressedBlob.size > MAX_VCARD_PHOTO_BYTES) {
      toast.error(`Photo is too large. Please use an image under ${maxSizeMb} MB.`);
      return;
    }
    setVcardStyle((prev) => ({
      ...prev,
      profilePhotoDataUrl: compressedDataUrl,
      photoZoom: 110,
      photoX: 50,
      photoY: 50,
    }));
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
    { maxDimension = 2000, quality = 0.85 }: { maxDimension?: number; quality?: number } = {}
  ) => {
    const dataUrl = await readAsDataUrl(file);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  };

  const handleMenuLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const compressed = file.type.startsWith('image/')
      ? await compressImageFile(file)
      : '';
    const url = await uploadQrAsset(file, 'logos', compressed || undefined);
    if (!url) return;
    setMenuLogoDataUrl(url);
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
    if (files.length > MAX_MENU_FILES) {
      toast.error(`You can upload up to ${MAX_MENU_FILES} files.`);
      return;
    }

    const hasPdf = files.some((file) => file.type === 'application/pdf');
    if (hasPdf && files.length > 1) {
      toast.error('Upload a single PDF or up to 15 images.');
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_MENU_TOTAL_BYTES) {
      toast.error('Menu files are too large. Please reduce file sizes.');
      return;
    }

    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          if (file.type === 'application/pdf') {
            if (file.size > MAX_MENU_FILE_BYTES) {
              throw new Error('PDF menu file is too large.');
            }
            const url = await uploadQrAsset(file, 'menus');
            if (!url) throw new Error('Failed to upload menu PDF.');
            return { url, type: 'pdf' as const };
          }
          if (file.size > MAX_MENU_FILE_BYTES) {
            throw new Error('Menu image file is too large.');
          }
          const compressed = await compressImageFile(file);
          const url = await uploadQrAsset(file, 'menus', compressed);
          if (!url) throw new Error('Failed to upload menu image.');
          return { url, type: 'image' as const };
        })
      );
      setMenuFiles(uploads);
      setMenuFlip(false);
      setMenuCarouselIndex(0);
      setMenuBuilderStep('logo'); // Advance to logo step after menu upload
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process menu files.';
      toast.error(message);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    if (file.size > MAX_FILE_BYTES && isPdf) {
      toast.error('PDF is too large. Please upload a smaller file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES && file.type.startsWith('image/')) {
      toast.info('Large image detected. Compressing for delivery...');
    }
    try {
      const compressed = file.type.startsWith('image/')
        ? await compressImageFile(file)
        : '';
      const url = await uploadQrAsset(file, 'files', compressed || undefined);
      if (!url) return;
      setFileUrl(url);
      setFileName(file.name);
    } catch {
      toast.error('Failed to process file upload.');
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
  const vcardPreviewScale = 0.65;
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

  const closeCreateMenu = useCallback(() => {
    setIsCreateOpen(false);
    setHoveredAction(null);
    setActionRingText('');
  }, []);

  const CreateMenu = ({
    align = 'center',
    label = 'Create New',
  }: {
    align?: 'center' | 'right';
    label?: string;
  }) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const openCreateMenu = () => {
      resetCreateFlow();
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        setActionRingOrigin({ x: originX, y: originY });
      }
      createOpenLockRef.current = true;
      window.setTimeout(() => {
        createOpenLockRef.current = false;
      }, 200);
      setIsCreateOpen(true);
      setHoveredAction(null);
      setActionRingText('Create New QR Code');
    };

    return (
      <div
        className={`relative z-[60] group flex items-center gap-3 ${
          align === 'right' ? 'ml-auto' : ''
        }`}
      >
        {label ? (
          <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/80 transition group-hover:opacity-0">
            {label}
          </span>
        ) : null}

        <div className="relative">
          <button
            type="button"
            aria-label="Create new QR code"
            className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/80 text-primary shadow-sm transition hover:border-amber-300 hover:bg-amber-300/10 hover:text-amber-200 hover:shadow-lg ${isCreateOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onClick={() => {
              openCreateMenu();
            }}
            ref={triggerRef}
          >
            <Plus className="h-5 w-5" />
          </button>

          {!isCreateOpen ? (
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-muted-foreground opacity-0 transition group-hover:opacity-100">
              Create New
            </span>
          ) : null}
        </div>

      </div>
    );
  };

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
              : Number.isFinite(intelSummary.avgResponseMs)
                ? `${(intelSummary.avgResponseMs! / 1000).toFixed(2)}s`
                : '0'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 sm:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Signal Trends</p>
          <div className="mt-4 h-24 flex items-end gap-2">
            {trendPoints.map((point, index, arr) => {
              const max = Math.max(1, ...arr.map((item) => item.count ?? 0));
              const height = Math.max(12, Math.round(((point.count ?? 0) / max) * 100));
              return (
                <div key={`${point.label}-${index}`} className="flex h-full flex-1 flex-col items-center">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-amber-300/20 to-amber-300/80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {point.label}
                  </span>
                </div>
              );
            })}
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
    <div className="bg-background sm:min-h-screen" data-build={BUILD_STAMP}>
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
              <Button
                className={`w-full sm:w-64 mx-auto bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs transition-all duration-500 ${
                  guestCtaStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                onClick={() => {
                  setShowGuestWelcome(false);
                  navigate('/login?mode=signup');
                }}
              >
                Sign Up
              </Button>
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
                Continue for free
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

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-background/95"
          onClick={() => {
            if (createOpenLockRef.current) return;
            closeCreateMenu();
          }}
        >
          <motion.div
            className="relative h-72 w-72 sm:h-80 sm:w-80"
            onClick={(event) => event.stopPropagation()}
            onPointerLeave={() => setHoveredAction(null)}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: `${actionRingOrigin.x}% ${actionRingOrigin.y}%` }}
          >
            <div className="absolute inset-0 rounded-full border border-border/50 bg-card/60 shadow-[0_0_60px_rgba(15,23,42,0.2)] backdrop-blur-sm" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <AnimatePresence mode="wait">
                {hoveredAction ? (
                  <motion.div
                    key={`${hoveredAction}-icon`}
                    initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.8 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                    exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.75 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center justify-center"
                  >
                    {(() => {
                      const Icon = actionRingIcons[hoveredAction as keyof typeof actionRingIcons];
                      const iconClass =
                        hoveredAction === 'adaptive'
                          ? 'h-12 w-12 text-amber-300'
                          : 'h-12 w-12 text-primary';
                      return Icon ? <Icon className={iconClass} /> : null;
                    })()}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {actionRingText ? (
                  <motion.span
                    key={actionRingText}
                    initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    exit={{ opacity: 0, filter: 'blur(10px)', y: -8 }}
                    transition={{ duration: 0.25 }}
                    className={`text-xs uppercase tracking-[0.3em] text-center ${
                      hoveredAction === 'adaptive' ? 'text-amber-300' : 'text-foreground'
                    }`}
                  >
                    <DecodeText text={actionRingText} active />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('static')}
                onClick={() => {
                  handleStartStatic();
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
              >
                <LinkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('dynamic')}
                onClick={() => {
                  setSelectedQuickAction('dynamic');
                  setQrMode('dynamic');
                  setQrType('website');
                  setPendingCreateScroll(true);
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('vcard')}
                onClick={() => {
                  handleStartVcard();
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
              >
                <User className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('file')}
                onClick={() => {
                  handleStartFile();
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
              >
                <File className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute right-6 top-6">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('phone')}
                onClick={() => {
                  handleStartPhone();
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60"
              >
                <Phone className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute right-6 bottom-6">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('email')}
                onClick={() => {
                  handleStartEmail();
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60"
              >
                <Mail className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute left-6 bottom-6">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('menu')}
                onClick={() => {
                  openMenuBuilder();
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60"
              >
                <Utensils className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute left-6 top-6">
              <button
                type="button"
                onPointerEnter={() => setHoveredAction('adaptive')}
                onClick={() => {
                  setActiveTab('adaptive');
                  setPendingCreateScroll(false);
                  closeCreateMenu();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/60 bg-card/90 text-amber-300 shadow-lg transition hover:border-amber-300"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showGoodbyeIntro && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            <div className="grid grid-cols-7 gap-1">
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
            <div className="text-center space-y-3">
              <div className="text-2xl font-semibold tracking-tight whitespace-pre-line">
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVcardPhotoChange}
                    className="text-xs text-muted-foreground"
                  />
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
          onClick={() => setShowMenuBuilder(false)}
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
      {showMenuBuilder && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-2 sm:px-4 py-4"
          onClick={() => setShowMenuBuilder(false)}
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
              <div className="flex flex-col items-center gap-5 w-full lg:w-auto">
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
                    {!menuHasFiles ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Upload up to 15 JPG/PNG pages or a single PDF file.
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
                    {!menuLogoDataUrl ? (
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
            <div className="pb-1">
              <CreateMenu label="" />
            </div>
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
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: '2px solid rgba(251,191,36,0.85)',
                      boxShadow:
                        '0 8px 20px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.45), inset 0 -8px 14px rgba(140,88,0,0.45)',
                      background:
                        'radial-gradient(circle at 30% 25%, rgba(255,248,210,0.75), rgba(251,191,36,0.6) 38%, rgba(214,142,16,0.55) 70%, rgba(102,61,0,0.35) 100%), repeating-conic-gradient(from 0deg, rgba(255,214,102,0.55) 0deg 1deg, rgba(120,72,0,0.18) 1deg 6deg)',
                      WebkitMask: 'radial-gradient(circle at center, transparent 58%, black 66%)',
                      mask: 'radial-gradient(circle at center, transparent 58%, black 66%)',
                      transform: `rotate(${dialAngle}deg) scale(1.12)`,
                      transformOrigin: 'center',
                    }}
                  />
                  <div className="absolute inset-0 rounded-full border border-border/60 bg-card/70 shadow-[0_0_40px_rgba(15,23,42,0.25)]" />
                  <div
                    className={`absolute rounded-full border border-border/40 bg-card/80 overflow-visible ${
                      dialDragging ? '' : 'transition-transform duration-200'
                    }`}
                    style={{
                      inset: innerDialInset,
                      transform: `rotate(${dialAngle}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
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

        {showStudioIntro && (
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

        {showStudioIntro && !isMobile && (
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

        {showCreateSection && (
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
                    </div>
                  ) : qrType === 'file' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <File className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · File Contents</h3>
                      </div>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        onBlur={() => setFileTouched(true)}
                        className="h-14 text-lg border-border bg-secondary/50 focus:border-primary input-glow"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a file to embed directly into your QR code.
                      </p>
                      {fileTouched && !fileUrl && (
                        <p className="text-xs text-destructive">
                          Please upload a file to continue.
                        </p>
                      )}
                      {fileName ? (
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
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 w-full max-w-xs border border-amber-400/80 bg-amber-200/60 text-amber-900 shadow-[0_0_18px_rgba(251,191,36,0.15)] hover:border-amber-400 hover:bg-amber-200/70 uppercase tracking-[0.2em] text-xs dark:border-amber-300/70 dark:bg-amber-300/15 dark:text-amber-200 dark:hover:border-amber-300 dark:hover:bg-amber-300/25 sm:w-auto sm:max-w-none sm:bg-transparent sm:text-foreground sm:shadow-none"
                        onClick={() => {
                          setShowVcardCustomizer(true);
                          setVcardPreviewSide('front');
                        }}
                      >
                        Customize VCard
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
                          handleGenerate();
                        }}
                        disabled={!canGenerate || isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating
                          </>
                        ) : (
                          <>Skip & Generate</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Your QR will use the default studio style unless you customize it.
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
              {hasSelectedMode && hasSelectedType && (!isMobile || mobileCustomizeStep || (isMobileV2 && effectiveMobileStudioStep === 4)) ? (
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
                      disabled={!canGenerate || isGenerating}
                      onClick={handleGenerate}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating
                        </>
                      ) : (
                        <>Generate My QR Code</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground">
                  {isMobileV2 ? (
                    canGenerate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-border text-xs uppercase tracking-[0.3em]"
                        onClick={() => setMobileStudioStep(4)}
                      >
                        Continue to Step 4
                      </Button>
                    ) : (
                      'Complete steps 2–3 to unlock customization.'
                    )
                  ) : isMobile ? (
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
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={handleAdaptiveMockOpen}
                className="group text-left rounded-2xl border border-border/40 bg-black/90 p-4 shadow-none transition hover:border-amber-300"
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
            </div>
            {isLoggedIn ? (
              <ArsenalPanel
                refreshKey={arsenalRefreshKey}
                onStatsChange={setArsenalStats}
                onScansChange={(total) =>
                  setScanStats((prev) => ({
                    total: total > 0 ? Math.max(prev.total, total) : prev.total,
                  }))
                }
                onRefreshRequest={() => setArsenalRefreshKey((prev) => prev + 1)}
                language={(userProfile?.language ?? profileForm.language) as 'en' | 'es'}
                timeZone={userProfile?.timezone || profileForm.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                cacheKey={user?.id ?? 'guest'}
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
          <section id="config" className="space-y-6">
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
              <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-6">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Theme</p>
                  <ThemeToggle storageKey={`theme:${user?.id ?? 'default'}`} />
                </div>
                <div className="space-y-4">
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
                  <Button
                    type="button"
                    className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                  >
                    {profileSaving ? t('Saving...', 'Guardando...') : t('Save Preferences', 'Guardar preferencias')}
                  </Button>
                </div>
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
          <section id="adaptive" className="space-y-10">
            <div className="text-center space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Adaptive QRC™</p>
              <h2 
                className={`text-4xl sm:text-5xl font-semibold tracking-tight ${adaptiveGradientText} cursor-pointer hover:opacity-80 transition-opacity inline-block`}
                onClick={() => setShowNavOverlay(true)}
              >
                Adaptive QRC™
              </h2>
              <p className={`text-xs uppercase tracking-[0.3em] ${adaptiveGradientText}`}>
                Adaptive QRC™ Studio
              </p>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                QR Codes, reimagined. <span className={adaptiveGradientText}>Adaptive QRC™</span> lets you change what a code shows based on time, date,
                and who’s scanning — the future of dynamic QR.
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Add <span className={adaptiveGradientText}>Adaptive QRC™</span> to your ARSENAL (Pro Plan recommended).
              </p>
            </div>

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
