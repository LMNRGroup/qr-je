import { ColorPicker } from '@/components/ColorPicker';
import { CornerStylePicker } from '@/components/CornerStylePicker';
import { ErrorCorrectionSelector } from '@/components/ErrorCorrectionSelector';
import { ArsenalPanel } from '@/components/ArsenalPanel';
import { LogoUpload } from '@/components/LogoUpload';
import { QRPreview, QRPreviewHandle } from '@/components/QRPreview';
import { SizeSlider } from '@/components/SizeSlider';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  getUserProfile,
  updateQR,
  updateUserProfile,
  type UserProfile,
} from '@/lib/api';
import { QROptions, defaultQROptions } from '@/types/qr';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Copy,
  Download,
  File,
  Facebook,
  Globe,
  Instagram,
  Link as LinkIcon,
  Loader2,
  Mail,
  Music2,
  Paintbrush,
  BarChart3,
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
  Users,
} from 'lucide-react';
import { ChangeEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UPSell_INTERVAL_MS = 30 * 60 * 1000;
const UPSell_LAST_SHOWN_KEY = 'qr.upsell.lastShownAt';
const UPSell_SESSION_KEY = 'qr.upsell.sessionShown';
const BUILD_STAMP = '2026-01-18T16:52:00Z';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MENU_FILE_BYTES = 2.5 * 1024 * 1024;
const MAX_MENU_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_MENU_FILES = 15;

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const isLoggedIn = Boolean(user);
  const [options, setOptions] = useState<QROptions>(defaultQROptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [lastGeneratedContent, setLastGeneratedContent] = useState('');
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
  const [qrMode, setQrMode] = useState<'static' | 'dynamic' | null>(null);
  const [qrType, setQrType] = useState<'website' | 'vcard' | 'email' | 'phone' | 'file' | 'menu' | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileTouched, setFileTouched] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showIntroAd, setShowIntroAd] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [showUpsell, setShowUpsell] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateHovering, setIsCreateHovering] = useState(false);
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
  const [arsenalRefreshKey, setArsenalRefreshKey] = useState(0);
  const [navHint, setNavHint] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    username: '',
    timezone: '',
    language: 'en',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [generatedShortUrl, setGeneratedShortUrl] = useState('');
  const [generatedLongUrl, setGeneratedLongUrl] = useState('');
  const [showVcardCustomizer, setShowVcardCustomizer] = useState(false);
  const [vcardPreviewSide, setVcardPreviewSide] = useState<'front' | 'back'>('front');
  const [showStudioBoot, setShowStudioBoot] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingCreateScroll, setPendingCreateScroll] = useState(false);
  const [accountForm, setAccountForm] = useState({
    username: '',
    fullName: '',
    email: '',
  });

  const timeZoneOptions = useMemo(() => {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      // @ts-expect-error Intl.supportedValuesOf may be missing in older TS lib.
      const zones = Intl.supportedValuesOf('timeZone') as string[];
      if (Array.isArray(zones) && zones.length) {
        return zones;
      }
    }
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Puerto_Rico',
      'Europe/London',
      'Europe/Madrid',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Singapore',
    ];
  }, []);
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
    frontColor: '#111827',
    frontGradient: '#2563eb',
    frontUseGradient: true,
    backColor: '#0f172a',
    backGradient: '#4f46e5',
    backUseGradient: true,
    logoDataUrl: '',
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
  const qrRef = useRef<QRPreviewHandle>(null);
  const createSectionRef = useRef<HTMLDivElement>(null);
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
  const vcardBaseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_APP_URL ?? 'https://qrcode.luminarapps.com');
  const vcardUrl = vcardSlug
    ? `${vcardBaseUrl}/v/${vcardSlug}`
    : '';
  const menuPreviewUrl = menuFiles.length
    ? `https://qrcode.luminarapps.com/menu-preview`
    : '';
  const menuHasFiles = menuFiles.length > 0;
  const menuHasPdf = menuFiles.length === 1 && menuFiles[0]?.type === 'pdf';
  const menuHasFlip = menuFiles.length === 2 && menuFiles.every((file) => file.type === 'image');
  const menuHasCarousel = menuFiles.length >= 3 && menuFiles.every((file) => file.type === 'image');
  const generatedContent = qrType === 'website'
    ? (isWebsiteValid ? normalizedWebsiteUrl : '')
    : qrType === 'vcard'
      ? (generatedShortUrl || vcardUrl)
      : qrType === 'email'
        ? (isEmailValid ? `mailto:${emailAddress.trim()}` : '')
        : qrType === 'phone'
          ? (isPhoneValid ? `tel:${normalizedPhone}` : '')
          : qrType === 'file'
            ? fileDataUrl
          : qrType === 'menu'
            ? menuPreviewUrl
            : '';
  const longFormContent = qrType === 'vcard' ? (generatedLongUrl || vcardUrl) : generatedContent;
  const canGenerate = qrType === 'website'
    ? isWebsiteValid
    : qrType === 'vcard'
      ? Boolean(vcardSlug)
      : qrType === 'email'
        ? isEmailValid
        : qrType === 'phone'
          ? isPhoneValid
          : qrType === 'file'
            ? fileDataUrl.length > 0
          : qrType === 'menu'
            ? menuFiles.length > 0
            : false;
  const previewUrl = qrType === 'website'
    ? normalizedWebsiteUrl
    : qrType === 'menu'
      ? menuPreviewUrl
      : vcardUrl;
  const canShowPreview = qrType === 'website' && isWebsiteValid;
  const hasSelectedMode = qrMode !== null;
  const hasSelectedType = qrType !== null;
  const previewContent = hasGenerated
    ? generatedContent
    : hasSelectedType
      ? 'https://preview.qrcodestudio.app'
      : '';
  const requiresAuthTabs = new Set(['codes', 'analytics', 'settings', 'adaptive']);

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

  const refreshArsenalStats = useCallback(async () => {
    if (!isLoggedIn) {
      setArsenalStats({ total: 0, dynamic: 0 });
      return;
    }
    try {
      const response = await getQRHistory();
      if (response.success) {
        const dynamicCount = response.data.filter(
          (item) => parseKind(item.kind ?? null).mode === 'dynamic'
        ).length;
        setArsenalStats({ total: response.data.length, dynamic: dynamicCount });
      }
    } catch {
      // ignore stats errors
    }
  }, [isLoggedIn, parseKind]);

  useEffect(() => {
    refreshArsenalStats();
  }, [refreshArsenalStats, arsenalRefreshKey]);

  const updateOption = useCallback(<K extends keyof QROptions>(key: K, value: QROptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

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
    if (!wasWelcomed && isNewAccount) {
      setWelcomeHeadline(`Yo ${displayName}!`);
      setWelcomeSubline('Not everyone makes great decisions… but today you did.\nWelcome to QRC Studio.');
      localStorage.setItem(firstLoginKey, 'true');
    } else {
      setWelcomeHeadline(`Welcome back, ${displayName}!`);
      setWelcomeSubline('');
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
        }));
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
    await signOut();
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.startsWith('qrc.auth')) {
        localStorage.removeItem(key);
      }
    });
    setShowWelcomeIntro(false);
    window.setTimeout(() => {
      window.location.reload();
    }, 2200);
  }, [signOut, user]);

  useEffect(() => {
    if (!isCreateOpen) return;
    if (!hoveredAction) {
      setActionRingText('Create New QR Code');
      return;
    }
    const lockedText = {
      dynamic: 'Log in to unlock Dynamic QR',
      vcard: 'Log in to unlock VCard',
      file: 'Log in to unlock File QR',
      menu: 'Log in to unlock QR Menus',
      adaptive: 'Log in to unlock Adaptive QRC™',
    } as const;
    const activeText = {
      static: 'Create New URL QR Code',
      dynamic: 'Create Dynamic QR Code',
      vcard: 'Create New VCard QR Code',
      file: 'Upload a File QR Code',
      phone: 'Create New Phone Call QR Code',
      email: 'Create New Email QR Code',
      menu: 'Create a custom QR code for your menu',
      adaptive: 'Create Adaptive QRC™',
    } as const;
    if (!isLoggedIn && hoveredAction in lockedText) {
      setActionRingText(lockedText[hoveredAction as keyof typeof lockedText]);
      return;
    }
    setActionRingText(activeText[hoveredAction as keyof typeof activeText] ?? 'Create New QR Code');
  }, [hoveredAction, isCreateOpen, isLoggedIn]);

  useEffect(() => {
    if (qrType !== 'vcard') {
      if (generatedShortUrl || generatedLongUrl) {
        setGeneratedShortUrl('');
        setGeneratedLongUrl('');
      }
      return;
    }

    if (generatedLongUrl && generatedLongUrl !== vcardUrl) {
      setGeneratedShortUrl('');
      setGeneratedLongUrl('');
    }
  }, [qrType, vcardUrl, generatedLongUrl, generatedShortUrl]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setShowUpsell(false);
      return;
    }

    const sessionShown = sessionStorage.getItem(UPSell_SESSION_KEY);
    if (sessionShown) {
      setShowUpsell(false);
      return;
    }

    const lastShownRaw = localStorage.getItem(UPSell_LAST_SHOWN_KEY);
    const lastShownAt = lastShownRaw ? Number(lastShownRaw) : 0;
    const now = Date.now();

    if (!lastShownAt || now - lastShownAt >= UPSell_INTERVAL_MS) {
      setShowUpsell(true);
      sessionStorage.setItem(UPSell_SESSION_KEY, 'true');
      localStorage.setItem(UPSell_LAST_SHOWN_KEY, String(now));
    } else {
      setShowUpsell(false);
    }
  }, [authLoading, user]);

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
    window.localStorage.setItem('qrc.activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isLoggedIn) return;
    if (requiresAuthTabs.has(activeTab)) {
      setActiveTab('studio');
    }
  }, [activeTab, isLoggedIn, requiresAuthTabs]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setProfileForm({
        fullName: '',
        username: '',
        timezone: '',
        language: 'en',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
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
        return;
      }
      if (showAccountModal) {
        setShowAccountModal(false);
        return;
      }
      if (showUpsell) {
        setShowUpsell(false);
        return;
      }
      if (selectedPlanComparison) {
        setSelectedPlanComparison(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, selectedPlanComparison, showAccountModal, showMenuBuilder, showUpsell, showVcardCustomizer]);

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
            ...options,
            content: vcardUrl,
          },
        })
        : await generateQR(
          qrType === 'file' || qrType === 'menu'
            ? `https://qrcode.luminarapps.com/pending/${crypto.randomUUID()}`
            : longFormContent,
          qrType === 'file'
            ? {
              ...options,
              fileName: fileName || 'File QR',
              fileDataUrl,
            }
            : qrType === 'menu'
              ? {
                ...options,
                menuFiles,
                menuType,
                menuLogoDataUrl,
                menuSocials,
              }
              : options,
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
                ? `https://qrcode.luminarapps.com/file/${id}/${random}`
                : `https://qrcode.luminarapps.com/menu/${id}/${random}`;
              const updateResponse = await updateQR(id, {
                targetUrl,
                options: qrType === 'file'
                  ? {
                    ...options,
                    fileName: fileName || 'File QR',
                    fileDataUrl,
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
          setLastGeneratedContent(nextItem.content);
        }
        toast.success('QR code generated!');
        setHasGenerated(true);
        setArsenalRefreshKey((prev) => prev + 1);
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
    setQrMode('static');
    setQrType('website');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setSelectedQuickAction('website');
    setPendingCreateScroll(true);
  };

  const handleStartVcard = () => {
    setQrMode('static');
    setQrType('vcard');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setSelectedQuickAction('vcard');
    setPendingCreateScroll(true);
  };

  const handleStartEmail = () => {
    setQrMode('static');
    setQrType('email');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setSelectedQuickAction('email');
    setPendingCreateScroll(true);
  };

  const handleStartPhone = () => {
    setQrMode('static');
    setQrType('phone');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setFileTouched(false);
    setSelectedQuickAction('phone');
    setPendingCreateScroll(true);
  };

  const handleStartFile = () => {
    setQrMode('static');
    setQrType('file');
    setActiveTab('studio');
    setWebsiteTouched(false);
    setEmailTouched(false);
    setPhoneTouched(false);
    setFileTouched(false);
    setSelectedQuickAction('file');
    setPendingCreateScroll(true);
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

  const handleProfileSave = async () => {
    if (!isLoggedIn || !user) return;
    if (!isSupabaseConfigured) {
      toast.error('Profile updates require a connected backend.');
      return;
    }
    if (profileForm.newPassword || profileForm.currentPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword || !profileForm.newPassword) {
        toast.error('Enter your current and new password.');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        toast.error('New passwords do not match.');
        return;
      }
      if (!user.email) {
        toast.error('Unable to verify password without an email.');
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: profileForm.currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect.');
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({
        password: profileForm.newPassword,
      });
      if (passwordError) {
        toast.error(passwordError.message);
        return;
      }
    }

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

    try {
      const themeKey = user?.id ? `theme:${user.id}` : 'theme:default';
      const theme = localStorage.getItem(themeKey);
      const updated = await updateUserProfile({
        name: profileForm.fullName.trim() || null,
        username: profileForm.username.trim() || null,
        timezone: profileForm.timezone || null,
        language: profileForm.language || 'en',
        theme: theme || null,
      });
      setUserProfile(updated);
      setProfileForm((prev) => ({
        ...prev,
        username: updated.username ?? prev.username,
        timezone: updated.timezone ?? prev.timezone,
        language: updated.language ?? prev.language,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setUsernameStatus('idle');
      setUsernameError('');
      toast.success('Preferences saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences.';
      toast.error(message);
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

  const vcardColorPresets = [
    '#111827',
    '#0f172a',
    '#1e293b',
    '#0b132a',
    '#1f2937',
    '#2563eb',
    '#4f46e5',
    '#0891b2',
    '#0f766e',
    '#a855f7',
  ];

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

  const makeVcardGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;

  const handleVcardLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setVcardStyle((prev) => ({ ...prev, logoDataUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleVcardPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setVcardStyle((prev) => ({
        ...prev,
        profilePhotoDataUrl: result,
        photoZoom: 110,
        photoX: 50,
        photoY: 50,
      }));
    };
    reader.readAsDataURL(file);
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

  const compressImageFile = async (file: File) => {
    const dataUrl = await readAsDataUrl(file);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });
    const maxDimension = 2000;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleMenuLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setMenuLogoDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleMenuFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
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

    Promise.all(
      files.map(async (file) => {
        if (file.type === 'application/pdf') {
          if (file.size > MAX_MENU_FILE_BYTES) {
            throw new Error('PDF menu file is too large.');
          }
          const url = await readAsDataUrl(file);
          return { url, type: 'pdf' as const };
        }
        if (file.size > MAX_MENU_FILE_BYTES) {
          throw new Error('Menu image file is too large.');
        }
        const url = await compressImageFile(file);
        return { url, type: 'image' as const };
      })
    )
      .then((results) => {
        setMenuFiles(results);
        setMenuFlip(false);
        setMenuCarouselIndex(0);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to process menu files.';
        toast.error(message);
      });
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    if (file.size > MAX_FILE_BYTES && isPdf) {
      toast.error('PDF is too large. Please upload a smaller file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES && file.type.startsWith('image/')) {
      toast.info('Large image detected. Compressing for delivery...');
    }
    const loadFile = async () => {
      if (file.type.startsWith('image/')) {
        return compressImageFile(file);
      }
      return readAsDataUrl(file);
    };
    loadFile()
      .then((result) => {
        setFileDataUrl(result);
        setFileName(file.name);
      })
      .catch(() => {
        toast.error('Failed to process file upload.');
      });
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

  const vcardFrontStyle = {
    fontFamily: vcardStyle.fontFamily,
    borderRadius: `${vcardStyle.radius}px`,
    background: vcardStyle.frontUseGradient
      ? makeVcardGradient(vcardStyle.frontColor, vcardStyle.frontGradient)
      : vcardStyle.frontColor,
  } as const;

  const vcardBackStyle = {
    fontFamily: vcardStyle.fontFamily,
    borderRadius: `${vcardStyle.radius}px`,
    background: vcardStyle.backUseGradient
      ? makeVcardGradient(vcardStyle.backColor, vcardStyle.backGradient)
      : vcardStyle.backColor,
  } as const;

  const adaptiveGradientText = 'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-transparent bg-clip-text';
  const adaptiveGlowText = 'font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]';
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

  const CreateMenu = ({
    align = 'center',
    label = 'Create New',
  }: {
    align?: 'center' | 'right';
    label?: string;
  }) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const openCreateMenu = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        setActionRingOrigin({ x: originX, y: originY });
      }
      setIsCreateOpen(true);
      setIsCreateHovering(false);
      setHoveredAction(null);
      setActionRingText('Create New QR Code');
    };

    const closeCreateMenu = () => {
      setIsCreateOpen(false);
      setIsCreateHovering(false);
      setHoveredAction(null);
      setActionRingText('');
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
            onMouseEnter={() => {
              if (isCreateOpen) return;
              setIsCreateHovering(true);
              setActionRingText('Create New');
            }}
            onMouseLeave={() => {
              if (isCreateOpen) return;
              setIsCreateHovering(false);
              if (!isCreateOpen) setActionRingText('');
            }}
            onClick={() => {
              openCreateMenu();
            }}
            ref={triggerRef}
          >
            <Plus className="h-5 w-5" />
          </button>

          {isCreateHovering && !isCreateOpen && (
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Create New
            </span>
          )}
        </div>

        {typeof document !== 'undefined'
          ? createPortal(
            <AnimatePresence>
              {isCreateOpen ? (
                <motion.div
                  className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-xl"
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    closeCreateMenu();
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="relative h-72 w-72 sm:h-80 sm:w-80"
                    onClick={(event) => event.stopPropagation()}
                    onPointerLeave={() => setHoveredAction(null)}
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.2, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ transformOrigin: `${actionRingOrigin.x}% ${actionRingOrigin.y}%` }}
                  >
                    <div className="absolute inset-0 rounded-full border border-border/50 bg-card/50 shadow-[0_0_60px_rgba(15,23,42,0.2)] backdrop-blur-sm" />
                    <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                      <AnimatePresence mode="wait">
                        {actionRingText ? (
                          <motion.span
                            key={actionRingText}
                            initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                            exit={{ opacity: 0, filter: 'blur(10px)', y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="text-xs uppercase tracking-[0.3em] text-foreground text-center"
                          >
                            <DecodeText text={actionRingText} active />
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        onClick={() => {
                          handleStartStatic();
                          closeCreateMenu();
                        }}
                        onPointerEnter={() => setHoveredAction('static')}
                        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
                      >
                        <LinkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          toast.info('Create an account or log in to start creating Dynamic QR Codes.');
                          return;
                        }
                        setSelectedQuickAction('dynamic');
                        setQrMode('dynamic');
                        setQrType('website');
                        setPendingCreateScroll(true);
                        closeCreateMenu();
                      }}
                      onPointerEnter={() => setHoveredAction('dynamic')}
                      className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition ${
                        isLoggedIn
                          ? 'border-border/70 bg-card/90 text-primary hover:border-primary/60 hover:text-primary'
                          : 'border-border/70 bg-card/80 text-muted-foreground opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="h-5 w-5" />
                    </button>
                    </div>

                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          toast.info('Create an account or log in to start creating VCards.');
                          return;
                        }
                        handleStartVcard();
                        closeCreateMenu();
                      }}
                      onPointerEnter={() => setHoveredAction('vcard')}
                      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60 hover:text-primary"
                    >
                      <User className="h-5 w-5" />
                    </button>
                    </div>

                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          toast.info('Create an account or log in to unlock File QR.');
                          return;
                        }
                        handleStartFile();
                        closeCreateMenu();
                      }}
                      onPointerEnter={() => setHoveredAction('file')}
                      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground shadow-lg transition hover:border-primary/60 hover:text-primary"
                    >
                      <File className="h-5 w-5" />
                    </button>
                    </div>

                    <div className="absolute right-6 top-6">
                      <button
                        type="button"
                        onClick={() => {
                          handleStartPhone();
                          closeCreateMenu();
                        }}
                        onPointerEnter={() => setHoveredAction('phone')}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="absolute right-6 bottom-6">
                      <button
                        type="button"
                        onClick={() => {
                          handleStartEmail();
                          closeCreateMenu();
                        }}
                        onPointerEnter={() => setHoveredAction('email')}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="absolute left-6 bottom-6">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoggedIn) {
                            toast.info('Create an account or log in to start building QR Menus.');
                            return;
                          }
                          openMenuBuilder();
                          closeCreateMenu();
                        }}
                      onPointerEnter={() => setHoveredAction('menu')}
                      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg transition hover:border-primary/60"
                    >
                      <Utensils className="h-4 w-4" />
                    </button>
                    </div>

                    <div className="absolute left-6 top-6">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoggedIn) {
                            toast.info('Create an account or log in to unlock Adaptive QRC™.');
                            return;
                          }
                          setActiveTab('adaptive');
                          setPendingCreateScroll(false);
                          closeCreateMenu();
                        }}
                      onPointerEnter={() => setHoveredAction('adaptive')}
                      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/60 bg-card/90 text-amber-300 shadow-lg transition hover:border-amber-300"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
          : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background" data-build={BUILD_STAMP}>
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

      {!isBooting && showUpsell && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setShowUpsell(false)}
        >
          <div
            className="glass-panel rounded-3xl p-8 w-full max-w-md text-center space-y-4 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground"
              onClick={() => setShowUpsell(false)}
            >
              X
            </button>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Go Pro</p>
            <h2 className="text-2xl font-semibold">Unlimited analytics, insights, and more.</h2>
            <p className="text-sm text-muted-foreground">
              Unlock advanced data, user interactions, and premium exports with QR Code Studio Pro.
            </p>
            <div className="pt-2 space-y-2">
              <Button className="w-full bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs">
                Go Pro
              </Button>
              <button
                type="button"
                className="w-full text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-primary"
                onClick={() => setShowUpsell(false)}
              >
                Continue for Free
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
                    Go to Settings
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
                    maxLength={24}
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
                    disabled={!acceptedTerms}
                  >
                    Create Account
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setShowVcardCustomizer(false)}
        >
          <div
            className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-6xl space-y-6 relative"
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
                  className="relative h-[420px] w-[260px] sm:h-[460px] sm:w-[280px]"
                  onClick={() => setVcardPreviewSide((prev) => (prev === 'front' ? 'back' : 'front'))}
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
                      <div className="space-y-2 text-sm text-white/90">
                        <p>{vcard.phone || '+1 (555) 123-4567'}</p>
                        <p>{vcard.email || 'you@example.com'}</p>
                        <p>{vcard.website || 'qrcodestudio.app'}</p>
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">
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
                      {vcardStyle.logoDataUrl ? (
                        <img
                          src={vcardStyle.logoDataUrl}
                          alt="VCard logo"
                          className="h-20 w-20 rounded-xl object-cover border border-white/20"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-xl border border-white/20 flex items-center justify-center text-xs text-white/70">
                          Logo
                        </div>
                      )}
                      <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                        Tap to flip
                      </p>
                    </div>
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">Preview is interactive.</p>
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
                      className="h-20 w-20 rounded-full border border-border bg-secondary/40 cursor-grab active:cursor-grabbing"
                      onPointerDown={handlePhotoPointerDown}
                      onPointerMove={handlePhotoPointerMove}
                      onPointerUp={handlePhotoPointerUp}
                      style={{
                        backgroundImage: vcardStyle.profilePhotoDataUrl
                          ? `url(${vcardStyle.profilePhotoDataUrl})`
                          : undefined,
                        backgroundSize: `${vcardStyle.photoZoom}%`,
                        backgroundPosition: `${vcardStyle.photoX}% ${vcardStyle.photoY}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
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
                    <div className="flex flex-wrap gap-2">
                      {vcardColorPresets.map((color) => (
                        <button
                          key={`front-${color}`}
                          type="button"
                          aria-label={`Front color ${color}`}
                          className={`h-8 w-8 rounded-full border ${
                            vcardStyle.frontColor === color ? 'border-primary' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setVcardStyle((prev) => ({ ...prev, frontColor: color }))
                          }
                        />
                      ))}
                    </div>
                    <Input
                      value={vcardStyle.frontColor}
                      onChange={(event) =>
                        setVcardStyle((prev) => ({ ...prev, frontColor: event.target.value }))
                      }
                      placeholder="#111827"
                      className="bg-secondary/40 border-border text-xs"
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
                      <Input
                        value={vcardStyle.frontGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            frontGradient: event.target.value,
                          }))
                        }
                        placeholder="#2563eb"
                        className="bg-secondary/40 border-border text-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Back Style
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vcardColorPresets.map((color) => (
                        <button
                          key={`back-${color}`}
                          type="button"
                          aria-label={`Back color ${color}`}
                          className={`h-8 w-8 rounded-full border ${
                            vcardStyle.backColor === color ? 'border-primary' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setVcardStyle((prev) => ({ ...prev, backColor: color }))
                          }
                        />
                      ))}
                    </div>
                    <Input
                      value={vcardStyle.backColor}
                      onChange={(event) =>
                        setVcardStyle((prev) => ({ ...prev, backColor: event.target.value }))
                      }
                      placeholder="#0f172a"
                      className="bg-secondary/40 border-border text-xs"
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
                      <Input
                        value={vcardStyle.backGradient}
                        onChange={(event) =>
                          setVcardStyle((prev) => ({
                            ...prev,
                            backGradient: event.target.value,
                          }))
                        }
                        placeholder="#4f46e5"
                        className="bg-secondary/40 border-border text-xs"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Back Logo
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVcardLogoChange}
                    className="text-xs text-muted-foreground"
                  />
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

      {showMenuBuilder && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
          onClick={() => setShowMenuBuilder(false)}
        >
          <div
            className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-6xl space-y-6 relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground"
              onClick={() => setShowMenuBuilder(false)}
            >
              X
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Menu</p>
                <h2 className="text-2xl font-semibold">Dynamic Menu Builder</h2>
                <p className="text-sm text-muted-foreground">
                  Upload pages, add your logo, and preview swipe or flip motion.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="flex flex-col items-center gap-5">
                <div className="w-full rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Preview</p>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
                      {menuType === 'restaurant' ? 'Restaurant' : 'Services'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative h-[420px] w-[260px] sm:h-[460px] sm:w-[280px] rounded-2xl border border-border/70 bg-card/80 overflow-hidden shadow-xl">
                      {menuLogoDataUrl ? (
                        <div className="absolute left-4 top-4 h-12 w-12 rounded-full border border-white/30 bg-white/10 shadow-lg">
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
                        <img
                          src={menuFiles[0]?.url}
                          alt="Menu preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                          <Utensils className="h-10 w-10 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Upload menu pages</p>
                          <p className="text-xs">Add up to 15 images or a single PDF.</p>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-white/80">
                        Luminar Apps watermark · Free Forever
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <div className={`flex items-center gap-1 ${menuSocials.instagram ? 'text-primary' : 'opacity-40'}`}>
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </div>
                    <div className={`flex items-center gap-1 ${menuSocials.facebook ? 'text-primary' : 'opacity-40'}`}>
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </div>
                    <div className={`flex items-center gap-1 ${menuSocials.tiktok ? 'text-primary' : 'opacity-40'}`}>
                      <Music2 className="h-4 w-4" />
                      TikTok
                    </div>
                    <div className={`flex items-center gap-1 ${menuSocials.website ? 'text-primary' : 'opacity-40'}`}>
                      <Globe className="h-4 w-4" />
                      Website
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu Type</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      size="sm"
                      className={menuType === 'restaurant'
                        ? 'bg-card/80 text-foreground border border-border/70 uppercase tracking-[0.2em] text-xs'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => setMenuType('restaurant')}
                    >
                      Restaurant
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={menuType === 'service'
                        ? 'bg-card/80 text-foreground border border-border/70 uppercase tracking-[0.2em] text-xs'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => setMenuType('service')}
                    >
                      Services
                    </Button>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Branding</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMenuLogoChange}
                        className="text-xs"
                      />
                    </label>
                    {menuLogoDataUrl ? (
                      <span className="text-xs text-muted-foreground">Logo ready</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Logo optional</span>
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu Pages</p>
                  <p className="text-sm text-muted-foreground">
                    Upload up to 15 JPG/PNG pages or a single PDF file.
                  </p>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleMenuFilesChange}
                    className="text-xs"
                  />
                  <div className="text-xs text-muted-foreground">
                    {menuHasFiles
                      ? `Uploaded ${menuFiles.length} file${menuFiles.length === 1 ? '' : 's'}`
                      : 'No menu pages uploaded yet.'}
                  </div>
                  {menuFiles.length > 1 && menuFiles.every((file) => file.type === 'image') ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {menuFiles.map((file, index) => (
                        <div key={`${file.url}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
                          <span className="truncate">Page {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveMenuFile(index, -1)}
                              disabled={index === 0}
                              className="rounded-md border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] disabled:opacity-40"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveMenuFile(index, 1)}
                              disabled={index === menuFiles.length - 1}
                              className="rounded-md border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] disabled:opacity-40"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMenuFile(index)}
                              className="rounded-md border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-destructive"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Social Links</p>
                  <div className="grid sm:grid-cols-2 gap-3">
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
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/20 px-5 py-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <span>Interactive preview enabled</span>
                  <span className="text-primary">Swipe · Flip · Tap</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-8 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.28),transparent_60%)] blur-3xl float-slow" />
        <div className="absolute top-4 right-6 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22),transparent_60%)] blur-3xl float-medium" />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18),transparent_65%)] blur-3xl float-fast" />
        <div className="absolute inset-x-0 top-1/4 h-72 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-30 glass-panel border-b border-border/50 transition ${
          showUpsell || isBooting ? 'blur-md pointer-events-none select-none' : ''
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-3 text-left"
            onClick={() => setActiveTab('studio')}
            aria-label="Go to Studio"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text tracking-wide">QR Code Studio</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">The last QR you&apos;ll ever print</p>
            </div>
          </button>
          <div className="relative hidden lg:flex flex-col items-center">
          <nav className="hidden lg:flex items-end gap-6 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <div className="pb-1">
              <CreateMenu label="" />
            </div>
            {[
              { id: 'studio', label: 'Studio' },
              { id: 'codes', label: 'Arsenal' },
              { id: 'analytics', label: 'Intel' },
              { id: 'adaptive', label: 'Adaptive QRC™' },
              { id: 'upgrade', label: 'Upgrade' },
              { id: 'settings', label: 'Config' },
            ].map((item) => {
              const isActive = activeTab === item.id;
              const isAdaptive = item.id === 'adaptive';
              const isLocked = requiresAuthTabs.has(item.id) && !isLoggedIn;
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
                    if (isLocked) {
                      toast.info('Create an account or log in to unlock this section.');
                      return;
                    }
                    setActiveTab(item.id as typeof activeTab);
                  }}
                  onMouseEnter={() => {
                    if (isLocked) {
                      setNavHint('Create an account or log in to unlock this section.');
                    }
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
          <div className="flex items-center gap-3">
            <ThemeToggle storageKey={isLoggedIn && user?.id ? `theme:${user.id}` : 'theme:guest'} />
            <div className="relative group">
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center transition hover:border-primary/50"
                aria-label="My Account"
                onClick={() => setShowAccountModal(true)}
              >
                <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
              </button>
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

      {/* Main Content */}
      <main
        className={`container mx-auto px-4 py-8 transition ${
          showUpsell || isBooting ? 'blur-md pointer-events-none select-none' : ''
        }`}
      >
        {activeTab === 'studio' && (
          <>
        <section id="studio" className="space-y-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Studio</p>
              <h2 className="text-3xl font-semibold tracking-tight">Creative Workspace</h2>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="glass-panel rounded-2xl p-6 space-y-6 text-left transition hover:border-primary/60 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
                  <h3 className="text-lg font-semibold">Your QR Arsenal</h3>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Codes', value: `${arsenalStats.total}`, tab: 'codes' },
                  { label: 'Scans Today', value: `${scanStats.total}`, tab: 'analytics' },
                  { label: 'Dynamic Live', value: `${arsenalStats.dynamic}`, tab: 'analytics' },
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
                    <p className="text-2xl font-semibold mt-2">{item.value}</p>
                  </button>
                ))}
              </div>
            </button>

            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Studio Guide</p>
              <h3 className="text-lg font-semibold">Your QR flow</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>1. Choose Static or Dynamic.</p>
                <p>2. Pick URL QR or Virtual Card.</p>
                <p>3. Customize, generate, and export.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Quick Actions</p>
            <h3 className="text-lg font-semibold">Jump into a new QR</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
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
                hint: isLoggedIn ? 'VCard' : 'Log in to unlock VCard',
                Icon: User,
                onClick: () => {
                  if (!isLoggedIn) {
                    toast.info('Create an account or log in to start creating VCards.');
                    return;
                  }
                  handleStartVcard();
                },
              },
              {
                id: 'file',
                label: 'File',
                hint: isLoggedIn ? 'File' : 'Log in to unlock File QR',
                Icon: File,
                onClick: () => {
                  if (!isLoggedIn) {
                    toast.info('Create an account or log in to unlock File QR.');
                    return;
                  }
                  handleStartFile();
                },
              },
              {
                id: 'dynamic',
                label: 'Dynamic',
                hint: isLoggedIn ? 'Dynamic' : 'Log in to unlock Dynamic',
                Icon: Sparkles,
                onClick: () => {
                  if (!isLoggedIn) {
                    toast.info('Create an account or log in to start creating Dynamic QR Codes.');
                    return;
                  }
                  setQrMode('dynamic');
                  setQrType('website');
                  setSelectedQuickAction('dynamic');
                  setPendingCreateScroll(true);
                },
              },
              {
                id: 'menu',
                label: 'Menu',
                hint: isLoggedIn ? 'Menu' : 'Log in to unlock Menu',
                Icon: Utensils,
                onClick: () => {
                  if (!isLoggedIn) {
                    toast.info('Create an account or log in to start building QR Menus.');
                    return;
                  }
                  openMenuBuilder();
                },
              },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                onMouseEnter={() => setQuickActionHover(action.id)}
                onMouseLeave={() => setQuickActionHover(null)}
                aria-pressed={selectedQuickAction === action.id}
                className={`group relative flex flex-col items-center justify-center rounded-full border h-14 w-14 transition hover:border-primary/60 hover:bg-secondary/40 ${
                  selectedQuickAction === action.id
                    ? 'border-primary/70 bg-secondary/50 ring-1 ring-primary/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                    : 'border-border/60 bg-secondary/30'
                }`}
              >
                <action.Icon className="h-5 w-5 text-primary" />
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

        <section ref={createSectionRef} id="create" className="mt-14">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Create</p>
              <h2 className="text-3xl font-semibold tracking-tight">Build Your QR</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Step-by-step</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            {/* Left Panel - Input & Preview */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-6 space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold">Step 1 · QR Mode</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Select</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className={qrMode === 'static'
                        ? 'bg-card/80 text-foreground border border-primary/50 border-b-transparent rounded-t-xl uppercase tracking-[0.2em] text-xs shadow-[0_0_14px_rgba(99,102,241,0.18)]'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-t-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => {
                        setQrMode('static');
                        setQrType(null);
                        setWebsiteTouched(false);
                      }}
                    >
                      Static
                    </Button>
                    <Button
                      size="sm"
                      className={qrMode === 'dynamic'
                        ? 'bg-card/80 text-foreground border border-primary/50 border-b-transparent rounded-t-xl uppercase tracking-[0.2em] text-xs shadow-[0_0_14px_rgba(99,102,241,0.18)]'
                        : 'bg-secondary/40 border border-border/60 text-muted-foreground rounded-t-xl uppercase tracking-[0.2em] text-xs hover:text-primary'}
                      onClick={() => {
                        if (!isLoggedIn) {
                          toast.info('Create an account or log in to unlock Dynamic QR Codes.');
                          return;
                        }
                        setQrMode('dynamic');
                        setQrType(null);
                        setWebsiteTouched(false);
                        setEmailTouched(false);
                        setPhoneTouched(false);
                        setSelectedQuickAction('dynamic');
                      }}
                      title={isLoggedIn ? undefined : 'Log in to unlock Dynamic QR Codes'}
                    >
                      Dynamic
                    </Button>
                  </div>
                </div>

                {hasSelectedMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Step 2 · QR Type</h3>
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
                          setSelectedQuickAction('website');
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
                          if (!isLoggedIn) {
                            toast.info('Create an account or log in to start creating VCards.');
                            return;
                          }
                          setQrType('vcard');
                          setSelectedQuickAction('vcard');
                        }}
                        title={isLoggedIn ? undefined : 'Log in to unlock VCard'}
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
                          setSelectedQuickAction('email');
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
                          setSelectedQuickAction('phone');
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
                          if (!isLoggedIn) {
                            toast.info('Create an account or log in to start creating File QR codes.');
                            return;
                          }
                          setQrMode('static');
                          setQrType('file');
                          setFileTouched(false);
                          setSelectedQuickAction('file');
                        }}
                        title={isLoggedIn ? undefined : 'Log in to unlock File QR'}
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
                          if (!isLoggedIn) {
                            toast.info('Create an account or log in to start building QR Menus.');
                            return;
                          }
                          setQrMode('dynamic');
                          setQrType('menu');
                          setSelectedQuickAction('menu');
                        }}
                        title={isLoggedIn ? undefined : 'Log in to unlock QR Menus'}
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
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Choose Static or Dynamic to unlock QR types.
                  </div>
                )}

                {hasSelectedType ? (
                  qrType === 'website' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Step 3 · Enter URL</h3>
                      </div>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
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
                        <h3 className="font-semibold">Step 3 · Enter Email</h3>
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
                        <h3 className="font-semibold">Step 3 · Enter Phone</h3>
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
                        <h3 className="font-semibold">Step 3 · Upload File</h3>
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
                      {fileTouched && !fileDataUrl && (
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
                        <h3 className="font-semibold">Step 3 · Build Menu Experience</h3>
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
                        <h3 className="font-semibold">Step 3 · Virtual Card Details</h3>
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
                        className="mt-2 border-border uppercase tracking-[0.2em] text-xs"
                        onClick={() => {
                          setShowVcardCustomizer(true);
                          setVcardPreviewSide('front');
                        }}
                      >
                        Customize VCard
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Select a QR type to continue building your code.
                  </div>
                )}

                {hasSelectedType ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="lg"
                      className="gap-2 bg-gradient-primary hover:opacity-90 text-primary-foreground glow uppercase tracking-[0.2em] text-xs"
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
                    Complete steps 1-3 to unlock generate and export actions.
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
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
                  <QRPreview
                    ref={qrRef}
                    options={options}
                    isGenerating={isGenerating}
                    contentOverride={previewContent}
                    showCaption={hasGenerated}
                  />
                ) : (
                  <div className="glass-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
                    Select a mode and type to preview your QR design.
                  </div>
                )}
              </motion.div>

              {hasGenerated && (
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
            </div>

            {/* Right Panel - Customization */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              {hasSelectedMode && hasSelectedType ? (
                <div className="glass-panel rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground px-4 pt-2">
                    Step 4 · Customize
                  </p>
                  <Accordion type="multiple" defaultValue={['colors', 'style']} className="space-y-2">
                    <AccordionItem value="colors" className="border-none">
                      <AccordionTrigger className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline">
                        <span className="text-sm font-medium">Colors</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 space-y-5">
                        <ColorPicker
                          label="Foreground Color"
                          value={options.fgColor}
                          onChange={(v) => updateOption('fgColor', v)}
                        />
                        <ColorPicker
                          label="Background Color"
                          value={options.bgColor}
                          onChange={(v) => updateOption('bgColor', v)}
                          presets={['#0A192F', '#D4AF37', '#F5F5F5', '#1F2937', '#111827', '#FFFFFF', '#000000']}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="style" className="border-none">
                      <AccordionTrigger className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline">
                        <span className="text-sm font-medium">Style</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 space-y-5">
                        <SizeSlider
                          value={options.size}
                          onChange={(v) => updateOption('size', v)}
                        />
                        <CornerStylePicker
                          value={options.cornerStyle}
                          onChange={(v) => updateOption('cornerStyle', v)}
                        />
                        <ErrorCorrectionSelector
                          value={options.errorCorrectionLevel}
                          onChange={(v) => updateOption('errorCorrectionLevel', v)}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="logo" className="border-none">
                      <AccordionTrigger className="py-3 px-4 rounded-lg hover:bg-secondary/50 hover:no-underline">
                        <span className="text-sm font-medium">Logo</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <LogoUpload
                          logo={options.logo}
                          onLogoChange={(v) => updateOption('logo', v)}
                        />
                        {options.logo && (
                          <div className="mt-4">
                            <SizeSlider
                              value={options.logoSize || 50}
                              onChange={(v) => updateOption('logoSize', v)}
                              min={20}
                              max={100}
                            />
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground">
                  Customize colors, style, and logo once you pick a mode and QR type.
                </div>
              )}
            </motion.div>
          </div>
        </section>
          </>
        )}

        {activeTab === 'codes' && (
          <section id="arsenal" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={handleAdaptiveMockOpen}
                className="group text-left rounded-2xl border border-amber-400/60 bg-secondary/20 p-4 shadow-[0_0_20px_rgba(251,191,36,0.15)] transition hover:border-amber-300"
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
                <p className="mt-3 text-sm font-semibold text-foreground">
                  <span className={adaptiveGradientText}>Adaptive QRC™</span> · Lunch Routing
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Routes by time, returning visitors, and admin IPs.
                </p>
              </button>
            </div>
            {isLoggedIn ? (
              <ArsenalPanel
                refreshKey={arsenalRefreshKey}
                onStatsChange={setArsenalStats}
                onScansChange={(total) => setScanStats({ total })}
                onRefreshRequest={() => setArsenalRefreshKey((prev) => prev + 1)}
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
          <section id="intel" className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Intel</p>
                <h2 className="text-3xl font-semibold tracking-tight">Live Intelligence</h2>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-border text-xs uppercase tracking-[0.3em]">
                    Export CSV
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/95 border-border">
                  <DropdownMenuItem onClick={() => handleExportCsv('day')}>Today</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportCsv('week')}>This Week</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportCsv('month')}>This Month</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
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
                    <div className="absolute inset-6 rounded-full border border-amber-200/30" />
                    <div className="absolute inset-12 rounded-full border border-amber-200/20" />
                    <div className="absolute inset-20 rounded-full border border-amber-200/10" />
                    <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/10" />
                    <div className="absolute inset-0 radar-sweep" />
                    {[
                      { top: '30%', left: '20%' },
                      { top: '60%', left: '62%' },
                      { top: '45%', left: '78%' },
                      { top: '72%', left: '38%' },
                    ].map((ping, index) => (
                      <div
                        key={`${ping.top}-${ping.left}-${index}`}
                        className="absolute h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.8)]"
                        style={{ top: ping.top, left: ping.left }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Active Nodes', value: '12' },
                    { label: 'Signals', value: '4.2k' },
                    { label: 'Response Time', value: '0.8s' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-semibold mt-2">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
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
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Signal Trends</p>
                    <div className="mt-4 h-20 flex items-end gap-2">
                      {[30, 50, 22, 60, 80, 45, 68].map((value, index) => (
                        <div
                          key={`${value}-${index}`}
                          className="flex-1 rounded-full bg-gradient-to-t from-amber-300/20 to-amber-300/80"
                          style={{ height: `${value}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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

                <div className="glass-panel rounded-2xl p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">QR Preview</p>
                  <div className="mt-4 flex justify-center">
                    <QRPreview
                      options={options}
                      contentOverride={generatedContent || 'https://preview.qrcodestudio.app'}
                      showCaption={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section id="config" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Config</p>
              <h2 className="text-3xl font-semibold tracking-tight">Preferences</h2>
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
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Profile</p>
                  <Input
                    value={profileForm.fullName}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    placeholder="Full Name"
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
                        placeholder="Username (max 18 characters)"
                        className={`bg-secondary/40 border-border ${usernameError ? 'border-destructive animate-shake' : ''}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-border uppercase tracking-[0.2em] text-[10px]"
                        onClick={handleUsernameCheck}
                        disabled={!profileForm.username.trim() || usernameStatus === 'checking'}
                      >
                        {usernameStatus === 'checking' ? 'Checking...' : 'Check'}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {usernameStatus === 'checking' && 'Checking availability...'}
                      {usernameStatus === 'available' && 'Username is available.'}
                      {usernameStatus === 'taken' && (usernameError || 'Username is already taken.')}
                      {usernameStatus === 'invalid' && (usernameError || 'Please keep it family friendly.')}
                      {usernameStatus === 'idle' && 'Usernames can be changed once every 30 days.'}
                    </div>
                    {userProfile?.usernameChangedAt && (
                      <div className="text-[11px] text-muted-foreground">
                        Next change available:{' '}
                        {new Date(new Date(userProfile.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Timezone
                      <select
                        value={profileForm.timezone}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))
                        }
                        className="mt-2 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Select timezone</option>
                        {timeZoneOptions.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Language
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
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Change Password</p>
                    <Input
                      value={profileForm.currentPassword}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                      placeholder="Current Password"
                      type="password"
                      className="bg-secondary/40 border-border"
                    />
                    <Input
                      value={profileForm.newPassword}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                      placeholder="New Password"
                      type="password"
                      className="bg-secondary/40 border-border"
                    />
                    <Input
                      value={profileForm.confirmPassword}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder="Confirm New Password"
                      type="password"
                      className="bg-secondary/40 border-border"
                    />
                  </div>
                  <Button
                    type="button"
                    className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs"
                    onClick={handleProfileSave}
                  >
                    Save Preferences
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
              <h2 className="text-3xl font-semibold tracking-tight">QR Code Studio by Luminar Apps</h2>
              <p className="text-sm text-muted-foreground">Pricing comparison for every team size.</p>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Current plan: <span className="text-foreground font-semibold">FREE FOREVER PLAN</span>
            </div>

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
                <div className="text-3xl font-semibold">$0 <span className="text-sm text-muted-foreground">/ month</span></div>
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
                <div className="text-3xl font-semibold">$7 <span className="text-sm text-muted-foreground">/ month</span></div>
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
                <div className="text-3xl font-semibold">$19 <span className="text-sm text-muted-foreground">/ month</span></div>
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

            {selectedPlanComparison && (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
                onClick={() => setSelectedPlanComparison(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, rotateY: 12 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-3xl space-y-5"
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

            <div className="glass-panel rounded-2xl p-6 overflow-x-auto">
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
          </section>
        )}

        {activeTab === 'adaptive' && (
          <section id="adaptive" className="space-y-10">
            <div className="text-center space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Adaptive QRC™</p>
              <h2 className={`text-4xl sm:text-5xl font-semibold tracking-tight ${adaptiveGradientText}`}>
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

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
          </section>
        )}

        <div className="mt-12 text-center">
          <a
            href="/terms"
            className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition"
          >
            Terms & Conditions
          </a>
        </div>
        <footer className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GDev x Luminar Apps.
        </footer>
      </main>
    </div>
  );
};

export default Index;
