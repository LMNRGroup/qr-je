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
  if (!isSupabaseConfigured) {
    return {};
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? getStoredToken();
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

const toHistoryItem = (entry: UrlResponse): QRHistoryItem => ({
  id: entry.id,
  content: entry.targetUrl,
  options: {
    content: entry.targetUrl,
    size: 256,
    fgColor: '#2B2B2B',
    bgColor: '#F3F3F0',
    errorCorrectionLevel: 'M',
    cornerStyle: 'square',
    ...(entry.options ?? {}),
  } as QROptions,
  createdAt: entry.createdAt,
  shortUrl: entry.shortUrl,
  name: entry.name ?? null,
  kind: entry.kind ?? null,
});

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

export async function deleteQRFromHistory(id: string): Promise<{ success: boolean }> {
  await request(`/urls/${id}`, { method: 'DELETE' });
  return { success: true };
}
