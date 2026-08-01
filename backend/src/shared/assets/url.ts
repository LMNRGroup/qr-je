import { getAppBaseUrl } from '../../config/env'

export const QR_ASSETS_BUCKET = 'qr-assets'
export const ALLOWED_ASSET_FOLDERS = ['files', 'menus', 'logos'] as const

const SUPABASE_PUBLIC_URL_PATTERN = /\/storage\/v1\/object\/public\/qr-assets\/(.+)$/
const PROXY_URL_PATTERN = /\/public\/assets\/(.+)$/

/**
 * Extracts the storage path (e.g. "menus/abc.png") from either a legacy
 * Supabase public URL or a proxy URL. Returns null for anything else.
 */
export const extractStoragePath = (url: string): string | null => {
  const supabaseMatch = url.match(SUPABASE_PUBLIC_URL_PATTERN)
  if (supabaseMatch) return decodeURIComponent(supabaseMatch[1])

  const proxyMatch = url.match(PROXY_URL_PATTERN)
  if (proxyMatch) return decodeURIComponent(proxyMatch[1])

  return null
}

export const isAllowedAssetPath = (path: string): boolean => {
  if (path.startsWith('/') || path.includes('..') || path.includes('\\')) return false
  const folder = path.split('/')[0]
  return (ALLOWED_ASSET_FOLDERS as readonly string[]).includes(folder)
}

export const buildAssetProxyUrl = (path: string) =>
  `${getAppBaseUrl()}/public/assets/${path.split('/').map(encodeURIComponent).join('/')}`

/**
 * Rewrites a legacy Supabase public URL to the backend proxy URL.
 * Anything else (including existing proxy URLs) passes through unchanged.
 */
export const rewriteAssetUrl = (url: string): string => {
  if (!SUPABASE_PUBLIC_URL_PATTERN.test(url)) return url
  const path = extractStoragePath(url)
  if (!path || !isAllowedAssetPath(path)) return url
  return buildAssetProxyUrl(path)
}

type AdaptiveSlotLike = {
  fileUrl?: unknown
  [key: string]: unknown
}

const rewriteSlotFileUrls = (slots: unknown): unknown => {
  if (!Array.isArray(slots)) return slots
  return slots.map((slot: AdaptiveSlotLike) => {
    if (!slot || typeof slot !== 'object') return slot
    if (typeof slot.fileUrl !== 'string') return slot
    return { ...slot, fileUrl: rewriteAssetUrl(slot.fileUrl) }
  })
}

/**
 * Rewrites every Supabase-hosted asset reference inside a url row's options
 * object so responses never expose the Supabase project URL.
 */
export const rewriteOptionsAssetUrls = <T extends Record<string, unknown> | null | undefined>(options: T): T => {
  if (!options || typeof options !== 'object') return options

  const next: Record<string, unknown> = { ...options }

  if (typeof next.fileUrl === 'string') next.fileUrl = rewriteAssetUrl(next.fileUrl)
  if (typeof next.menuLogo === 'string') next.menuLogo = rewriteAssetUrl(next.menuLogo)
  if (typeof next.photo === 'string') next.photo = rewriteAssetUrl(next.photo)

  if (Array.isArray(next.menuFiles)) {
    next.menuFiles = next.menuFiles.map((file) => {
      if (!file || typeof file !== 'object') return file
      const entry = file as Record<string, unknown>
      if (typeof entry.url !== 'string') return file
      return { ...entry, url: rewriteAssetUrl(entry.url) }
    })
  }

  next.adaptiveSlots = rewriteSlotFileUrls(next.adaptiveSlots)

  const adaptive = next.adaptive
  if (adaptive && typeof adaptive === 'object' && !Array.isArray(adaptive)) {
    const adaptiveRecord = adaptive as Record<string, unknown>
    if ('slots' in adaptiveRecord) {
      next.adaptive = { ...adaptiveRecord, slots: rewriteSlotFileUrls(adaptiveRecord.slots) }
    }
  }

  return next as T
}
