import { useEffect, useMemo, useState } from 'react';

const COLLECTR_HOST = 'app.getcollectr.com';
const COLLECTR_PREFIX = '/showcase/profile/';
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export const COLLECTR_SHOWCASE_FALLBACK = `https://${COLLECTR_HOST}${COLLECTR_PREFIX}@ramon852`;
export const COLLECTR_MANAGED_OWNER_SLUG = '1vbilcikwj';
export const COLLECTR_MANAGED_VCARD_SLUG = 'r';
export const COLLECTR_MANAGED_LEGACY_PATH = `/v/${COLLECTR_MANAGED_VCARD_SLUG}`;
export const COLLECTR_MANAGED_PUBLIC_PATH = `/${COLLECTR_MANAGED_OWNER_SLUG}/ramn-figueroa-soto`;
export const COLLECTR_ALLOWED_PUBLIC_PATHS = new Set([
  COLLECTR_MANAGED_LEGACY_PATH,
  COLLECTR_MANAGED_PUBLIC_PATH,
]);

export type CollectrPreviewCard = {
  id: string;
  name: string;
  imageUrl: string;
  setName: string;
  categoryName: string;
  cardNumber: string;
  rarity: string;
  quantity: number;
  marketPrice: number | null;
  priceDelta: number | null;
  priceDeltaPercent: number | null;
  isCard: boolean;
};

export type CollectrShowcasePreview = {
  sourceUrl: string;
  profileId: string;
  profile: {
    displayName: string;
    handle: string;
    profilePhotoUrl: string;
    backgroundImageUrl: string;
    badgeText: string;
    totalCards: number;
    totalSealed: number;
    totalGraded: number;
    totalFollowers: number;
    totalFollowing: number;
    portfolioValue: number | null;
  };
  cards: CollectrPreviewCard[];
};

type CollectrPreviewState = {
  data: CollectrShowcasePreview | null;
  isLoading: boolean;
  error: string | null;
};

const previewCache = new Map<string, Promise<CollectrShowcasePreview | null>>();

const normalizeSlugValue = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const normalizeCollectrInput = (value?: string | null) => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname !== COLLECTR_HOST) return '';
    if (!parsed.pathname.startsWith(COLLECTR_PREFIX)) return '';
    const profileId = decodeURIComponent(parsed.pathname.slice(COLLECTR_PREFIX.length))
      .replace(/^@/, '')
      .split('/')[0]
      ?.trim();
    return profileId ? `https://${COLLECTR_HOST}${COLLECTR_PREFIX}@${profileId}` : '';
  } catch {
    const profileId = trimmed.replace(/^@/, '').replace(/^showcase\/profile\//, '').trim();
    return profileId ? `https://${COLLECTR_HOST}${COLLECTR_PREFIX}@${profileId}` : '';
  }
};

const normalizePathname = (value?: string | null) => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    return parsed.pathname.replace(/\/+$/, '') || '/';
  } catch {
    const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeadingSlash.replace(/\/+$/, '') || '/';
  }
};

const hashFnv1a = (value: string, seed = FNV_OFFSET) => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
};

export const buildPublicOwnerSlug = (userId: string) => {
  const primary = hashFnv1a(userId);
  const secondary = hashFnv1a(userId.split('').reverse().join(''), FNV_OFFSET ^ 0x9e3779b9);
  return `${primary.toString(36)}${secondary.toString(36)}`
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10)
    .padEnd(8, '0');
};

export const isCollectrAllowedPublicPath = (value?: string | null) => {
  const normalized = normalizePathname(value);
  return Boolean(normalized) && COLLECTR_ALLOWED_PUBLIC_PATHS.has(normalized);
};

export const canEditCollectrForVcard = ({
  userId,
  slug,
  publicUrl,
  pathname,
}: {
  userId?: string | null;
  slug?: string | null;
  publicUrl?: string | null;
  pathname?: string | null;
}) => {
  if ([publicUrl, pathname].some((value) => isCollectrAllowedPublicPath(value))) {
    return true;
  }

  if (!userId) {
    return false;
  }

  return (
    buildPublicOwnerSlug(userId) === COLLECTR_MANAGED_OWNER_SLUG &&
    normalizeSlugValue(slug) === COLLECTR_MANAGED_VCARD_SLUG
  );
};

export const getCollectrPrefillUrl = (value?: string | null) =>
  normalizeCollectrInput(value) || COLLECTR_SHOWCASE_FALLBACK;

export const resolveCollectrPreviewInput = (
  pathname?: string | null,
  explicitInput?: string | null,
  publicUrl?: string | null
) => {
  if (![pathname, publicUrl].some((value) => isCollectrAllowedPublicPath(value))) {
    return '';
  }

  return normalizeCollectrInput(explicitInput) || COLLECTR_SHOWCASE_FALLBACK;
};

export const formatCollectrCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
};

export const getCollectrPreview = async (input: string, limit = 5) => {
  const normalized = normalizeCollectrInput(input);
  if (!normalized) {
    return null;
  }

  const key = `${normalized}:${limit}`;
  if (!previewCache.has(key)) {
    previewCache.set(
      key,
      fetch(`/public/integrations/collectr?url=${encodeURIComponent(normalized)}&limit=${limit}`)
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }
          return (await response.json()) as CollectrShowcasePreview;
        })
        .catch(() => null)
    );
  }

  return previewCache.get(key) ?? null;
};

export const useCollectrPreview = (input?: string | null, limit = 5): CollectrPreviewState => {
  const normalized = useMemo(() => normalizeCollectrInput(input), [input]);
  const [state, setState] = useState<CollectrPreviewState>({
    data: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let active = true;

    if (!normalized) {
      setState({ data: null, isLoading: false, error: null });
      return () => {
        active = false;
      };
    }

    setState((prev) => ({
      data: prev.data?.sourceUrl === normalized ? prev.data : null,
      isLoading: true,
      error: null,
    }));

    getCollectrPreview(normalized, limit)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setState({ data: null, isLoading: false, error: 'unavailable' });
          return;
        }
        setState({ data, isLoading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'unavailable';
        setState({ data: null, isLoading: false, error: message });
      });

    return () => {
      active = false;
    };
  }, [limit, normalized]);

  return state;
};
