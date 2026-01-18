import supabase, { isSupabaseConfigured } from '@/lib/supabase';
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
  usernameChangedAt: string | null;
  createdAt: string;
};

const requireBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }
  return API_BASE_URL.replace(/\/+$/, '');
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

const request = async (path: string, init?: RequestInit) => {
  const baseUrl = requireBaseUrl();
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
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

export async function getScanSummary(): Promise<{ total: number }> {
  const response = await request('/scans/summary');
  const data = (await response.json()) as { total?: number | string };
  return { total: Number(data.total ?? 0) };
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
