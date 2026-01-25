import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { QRHistoryItem, QROptions } from '@/types/qr';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

type UrlResponse = {
  id: string;
  random: string;
  targetUrl: string;
  shortUrl: string;
  createdAt: string;
  options?: Record<string, unknown> | null;
  kind?: string | null;
  name?: string | null;
};

type VcardResponse = {
  id: string;
  userId: string;
  slug: string;
  publicUrl: string;
  shortId: string;
  shortRandom: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  timezone: string | null;
  language: string | null;
  theme: string | null;
  avatarType: string | null;
  avatarColor: string | null;
  leftie: boolean;
  usernameChangedAt: string | null;
  createdAt: string;
};

const requireBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }
  return API_BASE_URL.replace(/\/+$/, '');
};

const readStoredSession = (): { access_token: string; refresh_token: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem('qrc.auth.session');
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.access_token && parsed?.refresh_token) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const writeStoredSession = (session?: Session | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (session?.access_token && session?.refresh_token) {
    localStorage.setItem('qrc.auth.token', session.access_token);
    localStorage.setItem(
      'qrc.auth.session',
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    );
    return;
  }
  localStorage.removeItem('qrc.auth.token');
  localStorage.removeItem('qrc.auth.session');
};

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const direct = localStorage.getItem('qrc.auth.token');
  if (direct) {
    return direct;
  }
  const sessionRaw = localStorage.getItem('qrc.auth.session');
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    } catch {
      // ignore
    }
  }
  const supabaseKey = Object.keys(localStorage).find(
    (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
  );
  if (!supabaseKey) {
    return null;
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(supabaseKey) ?? '');
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
};

const getAuthHeaders = async () => {
  let token = getStoredToken();
  if (!token && isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const refreshAuthToken = async () => {
  if (!isSupabaseConfigured) {
    return null;
  }
  const storedSession = readStoredSession();
  if (!storedSession) {
    return null;
  }
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: storedSession.refresh_token,
  });
  if (error || !data.session) {
    return null;
  }
  writeStoredSession(data.session);
  return data.session.access_token;
};

const request = async (path: string, init?: RequestInit) => {
  const baseUrl = requireBaseUrl();
  const authHeaders = await getAuthHeaders();
  const buildHeaders = (extra?: Record<string, string>) => ({
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(extra ?? {}),
    ...(init?.headers ?? {}),
  });
  let response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(),
  });

  if (response.status === 401 && isSupabaseConfigured) {
    const refreshedToken = await refreshAuthToken();
    if (refreshedToken) {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: buildHeaders({ Authorization: `Bearer ${refreshedToken}` }),
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    const message = errorText || 'Request failed';
    window.dispatchEvent(
      new CustomEvent('qrc:api-error', {
        detail: {
          message: `${response.status} ${response.statusText}`,
          detail: `${path}\n${message}`,
        },
      })
    );
    throw new Error(message);
  }

  return response;
};

const shouldUseSafeContent = (value: string) => {
  if (!value) return false;
  if (value.startsWith('data:')) return true;
  return value.length > 2048;
};

const toHistoryItem = (entry: UrlResponse): QRHistoryItem => {
  const qrContent = entry.shortUrl ?? entry.targetUrl;
  const safeTarget = shouldUseSafeContent(entry.targetUrl)
    ? entry.shortUrl ?? entry.targetUrl
    : entry.targetUrl;

  return {
    id: entry.id,
    random: entry.random,
    content: safeTarget,
    options: {
      size: 256,
      fgColor: '#2B2B2B',
      bgColor: '#F3F3F0',
      errorCorrectionLevel: 'M',
      cornerStyle: 'square',
      ...(entry.options ?? {}),
      content: qrContent,
    } as QROptions,
    createdAt: entry.createdAt,
    shortUrl: entry.shortUrl,
    name: entry.name ?? null,
    kind: entry.kind ?? null,
  };
};

export async function generateQR(
  content: string,
  options: Partial<QROptions>,
  kind?: string,
  name?: string | null
): Promise<{ success: boolean; data?: QRHistoryItem }> {
  const response = await request('/urls', {
    method: 'POST',
    body: JSON.stringify({
      targetUrl: content,
      options,
      kind: kind ?? null,
      name: name ?? null,
    }),
  });

  const data = (await response.json()) as UrlResponse;
  return { success: true, data: toHistoryItem(data) };
}

export async function updateQR(
  id: string,
  payload: {
    targetUrl?: string;
    name?: string | null;
    options?: Record<string, unknown> | null;
    kind?: string | null;
  }
): Promise<{ success: boolean; data?: QRHistoryItem }> {
  const response = await request(`/urls/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as UrlResponse;
  return { success: true, data: toHistoryItem(data) };
}

export async function createVcard(payload: {
  slug?: string | null;
  publicUrl: string;
  data: Record<string, unknown>;
  options?: Record<string, unknown> | null;
}): Promise<{ success: boolean; url?: UrlResponse; vcard?: VcardResponse }> {
  const response = await request('/vcards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { url: UrlResponse; vcard: VcardResponse };
  return { success: true, url: data.url, vcard: data.vcard };
}

export async function getPublicVcard(slug: string): Promise<VcardResponse> {
  const baseUrl = requireBaseUrl();
  const response = await fetch(`${baseUrl}/public/vcards/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to load vcard');
  }
  return (await response.json()) as VcardResponse;
}

export async function getQRHistory(): Promise<{ success: boolean; data: QRHistoryItem[] }> {
  const response = await request('/urls');
  const data = (await response.json()) as UrlResponse[];
  return { success: true, data: data.map(toHistoryItem) };
}

export async function getPublicUrlDetails(id: string, random: string): Promise<UrlResponse> {
  const baseUrl = requireBaseUrl();
  const response = await fetch(`${baseUrl}/public/urls/${encodeURIComponent(id)}/${encodeURIComponent(random)}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to load asset');
  }
  return (await response.json()) as UrlResponse;
}

export async function getScanCount(id: string, random: string): Promise<number> {
  const response = await request(`/urls/${encodeURIComponent(id)}/${encodeURIComponent(random)}/scans/count`);
  const data = (await response.json()) as { count?: number | string };
  return Number(data.count ?? 0);
}

export async function getScanCounts(): Promise<Record<string, number>> {
  const response = await request('/scans/counts');
  const data = (await response.json()) as { counts?: Record<string, number> };
  return data.counts ?? {};
}

export async function getScanSummary(
  range: 'all' | 'today' | '7d' | '30d' = 'all',
  timeZone?: string
): Promise<{ total: number; today: number; range: string; rangeTotal: number; avgResponseMs: number | null }> {
  const params = new URLSearchParams();
  params.set('range', range);
  if (timeZone) params.set('tz', timeZone);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await request(`/scans/summary${query}`);
  const data = (await response.json()) as {
    total?: number | string;
    today?: number | string;
    range?: string;
    rangeTotal?: number | string;
    avgResponseMs?: number | string | null;
  };
  return {
    total: Number(data.total ?? 0),
    today: Number(data.today ?? 0),
    range: data.range ?? range,
    rangeTotal: Number(data.rangeTotal ?? data.total ?? 0),
    avgResponseMs: data.avgResponseMs === null || data.avgResponseMs === undefined
      ? null
      : Number(data.avgResponseMs),
  };
}

export async function getScanTrends(
  days = 7,
  timeZone?: string
): Promise<Array<{ date: string; count: number }> & { hourly?: boolean }> {
  const params = new URLSearchParams();
  params.set('days', String(days));
  if (timeZone) params.set('tz', timeZone);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await request(`/scans/trends${query}`);
  const data = (await response.json()) as { 
    points?: Array<{ date: string; count: number }>; 
    hourly?: boolean;
  };
  const result = data.points ?? [];
  // Add hourly flag to result array
  if (data.hourly) {
    (result as any).hourly = true;
  }
  return result as Array<{ date: string; count: number }> & { hourly?: boolean };
}

export type ScanAreaSummary = {
  areaId: string;
  label: string;
  count: number;
  lastSeenAt: string;
  recentScans: Array<{
    timestamp: string;
    ip: string | null;
    city: string | null;
    region: string | null;
    countryCode: string | null;
    device: string;
    browser: string;
    responseMs: number | null;
  }>;
  lat: number | null;
  lon: number | null;
};

export async function getScanAreas(): Promise<ScanAreaSummary[]> {
  const response = await request('/scans/areas');
  return (await response.json()) as ScanAreaSummary[];
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await request('/users/me');
  return (await response.json()) as UserProfile;
}

export async function updateUserProfile(payload: {
  name?: string | null;
  username?: string | null;
  timezone?: string | null;
  language?: string | null;
  theme?: string | null;
  avatarType?: string | null;
  avatarColor?: string | null;
  leftie?: boolean;
}): Promise<UserProfile> {
  const response = await request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return (await response.json()) as UserProfile;
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; message?: string; username?: string }> {
  const response = await request('/users/username/check', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return (await response.json()) as { available: boolean; message?: string; username?: string };
}

export async function deleteQRFromHistory(id: string): Promise<{ success: boolean }> {
  await request(`/urls/${id}`, { method: 'DELETE' });
  return { success: true };
}
