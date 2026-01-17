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

const getAuthHeaders = async () => {
  if (!isSupabaseConfigured) {
    return {};
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
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
    fgColor: '#D4AF37',
    bgColor: '#0A192F',
    errorCorrectionLevel: 'M',
    cornerStyle: 'square',
    ...(entry.options ?? {}),
  } as QROptions,
  createdAt: entry.createdAt,
});

export async function generateQR(
  content: string,
  options: Partial<QROptions>,
  kind?: string
): Promise<{ success: boolean; data?: QRHistoryItem }> {
  const response = await request('/urls', {
    method: 'POST',
    body: JSON.stringify({
      targetUrl: content,
      options,
      kind: kind ?? null,
    }),
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

export async function getQRHistory(): Promise<{ success: boolean; data: QRHistoryItem[] }> {
  const response = await request('/urls');
  const data = (await response.json()) as UrlResponse[];
  return { success: true, data: data.map(toHistoryItem) };
}

export async function deleteQRFromHistory(id: string): Promise<{ success: boolean }> {
  await request(`/urls/${id}`, { method: 'DELETE' });
  return { success: true };
}
