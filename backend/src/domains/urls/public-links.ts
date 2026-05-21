import type { Context } from 'hono'

import { getAppBaseUrl } from '../../config/env'
import type { AppBindings } from '../../shared/http/types'
import { recordAreaScanForUser } from '../scans/areaStore'
import { lookupGeo } from '../scans/geo'
import type { AreaStorage } from '../scans/storage/area.interface'
import type { ScansService } from '../scans/service'
import { fetchCollectrShowcasePreview, type CollectrShowcasePreview } from '../vcards/collectr'
import type { Vcard } from '../vcards/models'
import type { VcardsService } from '../vcards/service'
import type { Url } from './models'
import type { UrlsService } from './service'

const PUBLIC_SLUG_FALLBACK = 'link'
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

type ParsedKind = {
  mode: 'dynamic' | 'static'
  type: string
}

type LegacyAliasRecord = {
  oldPath: string
  type?: string
  canonicalPath?: string
  active?: boolean
}

type PublicTargetInput = Pick<Url, 'id' | 'userId' | 'targetUrl' | 'name' | 'kind' | 'options'>

type VcardProfileRecord = {
  name?: string
  title?: string
  phone?: string
  email?: string
  website?: string
  location?: string
  company?: string
  about?: string
  slug?: string
  collectrUrl?: string
  socials?: Record<string, string | undefined>
  favoriteSocial?: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | ''
  ctaType?: string
  ctaLabel?: string
  ctaValue?: string
}

type VcardStyleRecord = {
  fontFamily?: string
  radius?: number
  texture?: 'matte' | 'glossy' | 'metallic' | 'paper'
  frontColor?: string
  frontGradient?: string
  frontUseGradient?: boolean
  frontFontColor?: string
  frontLogoDataUrl?: string
  coverPhotoDataUrl?: string
  profilePhotoDataUrl?: string
  profileAlign?: 'left' | 'center' | 'right'
  buttonColor?: string
  buttonTextColor?: string
  coverZoom?: number
  coverX?: number
  coverY?: number
  photoZoom?: number
  photoX?: number
  photoY?: number
}

const PROFILE_ALIGNMENT: Record<NonNullable<VcardStyleRecord['profileAlign']>, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

const VCARD_GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Lora:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;700&display=swap'

const VCARD_DEFAULT_FONT_FAMILY =
  '"Manrope", "Inter", "SF Pro Text", "Helvetica Neue", Arial, sans-serif'

const SUPPORTED_VCARD_FONTS = new Set([
  VCARD_DEFAULT_FONT_FAMILY,
  '"Plus Jakarta Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Sora", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Outfit", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Lora", Georgia, serif',
])

const LEGACY_VCARD_FONT_MAP: Record<string, string> = {
  'Arial, sans-serif': VCARD_DEFAULT_FONT_FAMILY,
  'Helvetica, Arial, sans-serif': VCARD_DEFAULT_FONT_FAMILY,
  '"Times New Roman", Times, serif': '"Lora", Georgia, serif',
  'Georgia, serif': '"Lora", Georgia, serif',
  '"Trebuchet MS", Arial, sans-serif': '"Plus Jakarta Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  'Verdana, Geneva, sans-serif': '"DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Courier New", Courier, monospace': '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Lucida Console", Monaco, monospace': '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif',
  'Tahoma, Geneva, sans-serif': '"DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  'Garamond, "Times New Roman", serif': '"Lora", Georgia, serif',
}

const DEFAULT_VCARD_STYLE: Required<
  Pick<
    VcardStyleRecord,
    | 'fontFamily'
    | 'radius'
    | 'texture'
    | 'frontColor'
    | 'frontGradient'
    | 'frontUseGradient'
    | 'frontFontColor'
    | 'profileAlign'
    | 'buttonColor'
    | 'buttonTextColor'
    | 'coverZoom'
    | 'coverX'
    | 'coverY'
    | 'photoZoom'
    | 'photoX'
    | 'photoY'
  >
> = {
  fontFamily: VCARD_DEFAULT_FONT_FAMILY,
  radius: 24,
  texture: 'matte',
  frontColor: '#25113a',
  frontGradient: '#5b2b73',
  frontUseGradient: true,
  frontFontColor: '#F8FAFC',
  profileAlign: 'left',
  buttonColor: '#F3E7D0',
  buttonTextColor: '#34164B',
  coverZoom: 100,
  coverX: 50,
  coverY: 50,
  photoZoom: 110,
  photoX: 50,
  photoY: 50,
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeVcardFontFamily = (value?: string | null) => {
  const font = value?.trim() ?? ''
  if (!font) {
    return VCARD_DEFAULT_FONT_FAMILY
  }

  if (SUPPORTED_VCARD_FONTS.has(font)) {
    return font
  }

  return LEGACY_VCARD_FONT_MAP[font] ?? VCARD_DEFAULT_FONT_FAMILY
}

const slugifyPublicSegment = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

const parseKind = (kind?: string | null): ParsedKind => {
  if (!kind) return { mode: 'static', type: 'url' }
  if (kind === 'adaptive') return { mode: 'dynamic', type: 'adaptive' }
  if (kind === 'vcard') return { mode: 'dynamic', type: 'vcard' }
  if (kind === 'dynamic' || kind === 'static') return { mode: kind, type: 'url' }
  if (kind.includes(':')) {
    const [mode, type] = kind.split(':')
    return {
      mode: mode === 'dynamic' ? 'dynamic' : 'static',
      type: type || 'url'
    }
  }
  return { mode: 'static', type: kind }
}

const hashFnv1a = (value: string, seed = FNV_OFFSET) => {
  let hash = seed >>> 0
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash >>> 0
}

export const buildPublicOwnerSlug = (userId: string) => {
  const primary = hashFnv1a(userId)
  const secondary = hashFnv1a(userId.split('').reverse().join(''), FNV_OFFSET ^ 0x9e3779b9)
  return `${primary.toString(36)}${secondary.toString(36)}`.replace(/[^a-z0-9]/g, '').slice(0, 10).padEnd(8, '0')
}

const tryParseUrlPathname = (value: string) => {
  try {
    return new URL(value).pathname
  } catch {
    return ''
  }
}

const extractLegacyVcardSlug = (targetUrl: string) => {
  const pathname = tryParseUrlPathname(targetUrl)
  const match = pathname.match(/^\/v\/([^/?#]+)/i)
  return match?.[1] ?? ''
}

const getStoredOptionRecord = (options: Url['options']) =>
  options && typeof options === 'object' ? options : null

const normalizePathname = (value: string) => {
  const raw = value.startsWith('http://') || value.startsWith('https://')
    ? tryParseUrlPathname(value)
    : value
  const normalized = raw.trim()
  if (!normalized) return ''
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  const stripped = withLeadingSlash.replace(/\/+$/, '')
  return stripped || '/'
}

const dedupeLegacyAliases = (aliases: LegacyAliasRecord[]) => {
  const seen = new Set<string>()
  const output: LegacyAliasRecord[] = []

  for (const alias of aliases) {
    const oldPath = normalizePathname(alias.oldPath)
    if (!oldPath || seen.has(oldPath)) continue
    seen.add(oldPath)
    output.push({
      oldPath,
      type: alias.type || 'vcard',
      canonicalPath: alias.canonicalPath ? normalizePathname(alias.canonicalPath) : undefined,
      active: alias.active !== false,
    })
  }

  return output
}

export const buildLegacyVcardPath = (slug: string) => {
  const normalizedSlug = slugifyPublicSegment(slug)
  return normalizedSlug ? `/v/${normalizedSlug}` : ''
}

const parseStoredLegacyAliases = (options: Url['options']) => {
  const record = getStoredOptionRecord(options)
  const raw = record?.legacyAliases
  if (!Array.isArray(raw)) return []

  const aliases: LegacyAliasRecord[] = []
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const oldPath = normalizePathname(entry)
      if (oldPath) aliases.push({ oldPath, type: 'vcard', active: true })
      continue
    }

    if (entry && typeof entry === 'object') {
      const aliasRecord = entry as Record<string, unknown>
      const oldPath = normalizePathname(
        normalizeText(aliasRecord.oldPath) || normalizeText(aliasRecord.path)
      )
      if (!oldPath) continue
      aliases.push({
        oldPath,
        type: normalizeText(aliasRecord.type) || 'vcard',
        canonicalPath: normalizePathname(normalizeText(aliasRecord.canonicalPath)),
        active: aliasRecord.active !== false,
      })
    }
  }

  return dedupeLegacyAliases(aliases)
}

const getInternalTargetUrl = (url: Url) => {
  const options = getStoredOptionRecord(url.options)
  const internalTargetUrl = normalizeText(options?.internalTargetUrl)
  return internalTargetUrl || url.targetUrl
}

export const getStoredLegacyAliases = (
  url: Pick<Url, 'kind' | 'targetUrl' | 'options'>,
  fallbackSlug?: string
) => {
  const parsedKind = parseKind(url.kind)
  if (parsedKind.type !== 'vcard') {
    return [] as LegacyAliasRecord[]
  }

  const options = getStoredOptionRecord(url.options)
  const aliases = parseStoredLegacyAliases(url.options)
  const extractedSlug = extractLegacyVcardSlug(url.targetUrl)
  const optionVcardSlug = normalizeText(options?.vcardSlug)

  const fallbackAliases = [extractedSlug, optionVcardSlug, fallbackSlug]
    .map((value) => buildLegacyVcardPath(value ?? ''))
    .filter(Boolean)
    .map((oldPath) => ({ oldPath, type: 'vcard', active: true } satisfies LegacyAliasRecord))

  return dedupeLegacyAliases([...aliases, ...fallbackAliases])
}

export const withStoredVcardAliases = (
  input: PublicTargetInput,
  slug: string
) => {
  const normalizedSlug = slugifyPublicSegment(slug)
  const existing = getStoredOptionRecord(input.options) ?? {}
  const canonicalPath = buildPublicPath(input.userId, normalizedSlug)

  return {
    ...existing,
    vcardSlug: normalizedSlug,
    legacyAliases: getStoredLegacyAliases(input, normalizedSlug).map((alias) => ({
      oldPath: alias.oldPath,
      type: 'vcard',
      canonicalPath,
      active: alias.active !== false,
    })),
  }
}

const getStoredPublicSlug = (url: PublicTargetInput) => {
  const options = getStoredOptionRecord(url.options)
  const optionSlug = normalizeText(options?.publicSlug)
  if (optionSlug) return slugifyPublicSegment(optionSlug)

  const parsedKind = parseKind(url.kind)
  if (parsedKind.type === 'vcard') {
    const optionVcardSlug = normalizeText(options?.vcardSlug)
    if (optionVcardSlug) return slugifyPublicSegment(optionVcardSlug)

    const legacySlug = extractLegacyVcardSlug(url.targetUrl)
    if (legacySlug) return slugifyPublicSegment(legacySlug)
  }

  const nameSlug = slugifyPublicSegment(normalizeText(url.name))
  if (nameSlug) return nameSlug

  const fallbackType = slugifyPublicSegment(parsedKind.type || PUBLIC_SLUG_FALLBACK) || PUBLIC_SLUG_FALLBACK
  const idSuffix = normalizeText(url.id).toLowerCase().slice(0, 4)
  return idSuffix ? `${fallbackType}-${idSuffix}` : fallbackType
}

export const buildPublicPath = (userId: string, slug: string) =>
  `/${buildPublicOwnerSlug(userId)}/${slugifyPublicSegment(slug)}`

export const buildVcardPublicUrl = (vcard: Pick<Vcard, 'userId' | 'slug'>) =>
  `${getAppBaseUrl()}${buildPublicPath(vcard.userId, vcard.slug)}`

export const buildPublicUrlForUrl = (url: PublicTargetInput) => {
  const parsedKind = parseKind(url.kind)
  const isEligible = parsedKind.type === 'vcard' || parsedKind.mode === 'dynamic'
  if (!isEligible || parsedKind.type === 'adaptive') {
    return null
  }

  const publicSlug = getStoredPublicSlug(url)
  if (!publicSlug) return null
  return `${getAppBaseUrl()}${buildPublicPath(url.userId, publicSlug)}`
}

export const ensureStablePublicSlug = (
  urlsForUser: Url[],
  input: PublicTargetInput,
  currentId?: string
) => {
  const options = getStoredOptionRecord(input.options)
  const existing = slugifyPublicSegment(normalizeText(options?.publicSlug))
  if (existing) return existing

  const baseSlug = getStoredPublicSlug(input) || PUBLIC_SLUG_FALLBACK
  const used = new Set(
    urlsForUser
      .filter((url) => url.id !== currentId)
      .map((url) => getStoredPublicSlug(url))
  )

  if (!used.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  let candidate = `${baseSlug}-${suffix}`
  while (used.has(candidate)) {
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }
  return candidate
}

export const withStoredPublicSlug = (
  input: PublicTargetInput,
  urlsForUser: Url[],
  currentId?: string
) => {
  const parsedKind = parseKind(input.kind)
  const isEligible = parsedKind.type !== 'vcard' && parsedKind.type !== 'adaptive' && parsedKind.mode === 'dynamic'
  if (!isEligible) {
    return input.options ?? null
  }

  const stablePublicSlug = ensureStablePublicSlug(urlsForUser, input, currentId)
  return {
    ...(getStoredOptionRecord(input.options) ?? {}),
    publicSlug: stablePublicSlug,
  }
}

const matchesPublicAlias = (url: Url, ownerSlug: string, publicSlug: string) => {
  return buildPublicOwnerSlug(url.userId) === ownerSlug && getStoredPublicSlug(url) === publicSlug
}

const matchesLegacyVcardAlias = (url: Url, legacyPath: string) => {
  return getStoredLegacyAliases(url).some(
    (alias) => alias.active !== false && alias.oldPath === legacyPath
  )
}

export const resolveLegacyVcardMatch = async (
  service: UrlsService,
  vcardsService: VcardsService,
  slug: string
) => {
  const normalizedSlug = slugifyPublicSegment(slug)
  if (!normalizedSlug) return null

  const legacyPath = buildLegacyVcardPath(normalizedSlug)
  const urls = await service.getAllUrls()
  const match = urls.find((url) => matchesLegacyVcardAlias(url, legacyPath))

  if (match) {
    const vcard = await vcardsService.getByShortId(match.id)
    if (vcard) {
      return { url: match, vcard, legacyPath }
    }
  }

  const vcard = await vcardsService.getBySlug(normalizedSlug)
  if (!vcard) {
    return null
  }

  const url = await service.getById(vcard.shortId)
  if (!url) {
    return null
  }

  return { url, vcard, legacyPath }
}

const isPrivateIp = (ip: string) => {
  if (ip === '::1') return true
  const lower = ip.toLowerCase()
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('fe80')) return true
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 127) return true
  return false
}

const getClientIp = (c: Context<AppBindings>) => {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    const candidates = forwarded.split(',').map((entry) => entry.trim()).filter(Boolean)
    const publicIp = candidates.find((ip) => !isPrivateIp(ip))
    return publicIp ?? candidates[0] ?? null
  }
  const direct = c.req.header('x-real-ip') ?? c.req.header('cf-connecting-ip')
  if (direct) return direct
  const raw = c.req.raw as unknown as { socket?: { remoteAddress?: string }; conn?: { remoteAddress?: string } }
  return raw?.socket?.remoteAddress ?? raw?.conn?.remoteAddress ?? null
}

const getNowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const recordPublicPageScan = (
  c: Context<AppBindings>,
  url: Pick<Url, 'id' | 'random' | 'userId'>,
  scansService?: ScansService,
  areaStorage?: AreaStorage
) => {
  if (!scansService && !areaStorage) return

  const startedAt = getNowMs()
  const ip = getClientIp(c)
  const userAgent = c.req.header('user-agent') ?? null
  const responseMs = Math.round(getNowMs() - startedAt)

  Promise.all([
    areaStorage
      ? lookupGeo(ip)
          .then((geo) =>
            recordAreaScanForUser(areaStorage, {
              userId: url.userId,
              ip,
              userAgent,
              city: geo.city,
              region: geo.region,
              countryCode: geo.countryCode,
              lat: geo.lat,
              lon: geo.lon,
              responseMs,
            }).catch((err) => console.error('[scan] failed to record public page area scan', err))
          )
          .catch((err) => {
            console.error('[scan] failed to lookup public page geo', err)
            return recordAreaScanForUser(areaStorage, {
              userId: url.userId,
              ip,
              userAgent,
              city: null,
              region: null,
              countryCode: null,
              lat: null,
              lon: null,
              responseMs,
            }).catch((fallbackErr) =>
              console.error('[scan] failed to record public page area scan (fallback)', fallbackErr)
            )
          })
      : Promise.resolve(),
    scansService?.recordScan({
      urlId: url.id,
      urlRandom: url.random,
      userId: url.userId,
      ip,
      userAgent,
      responseMs,
    }).catch((err) => console.error('[scan] failed to record public page scan', err)),
  ]).catch(() => {})
}

const buildVcardShareMeta = (profile: VcardProfileRecord) => {
  const fullName = normalizeText(profile.name) || 'Someone'
  const firstName = fullName.split(/\s+/)[0] || fullName
  const company = normalizeText(profile.company)
  const title = normalizeText(profile.title)
  const shareTitle =
    fullName === 'Someone'
      ? 'A virtual card has been shared with you'
      : `${firstName} wants to share a virtual card with you`
  const roleSummary = [title, company].filter(Boolean).join(' at ')
  const shareDescription =
    fullName === 'Someone'
      ? 'Open this virtual card to view contact details and save them in one tap.'
      : `Open ${fullName}'s virtual card${roleSummary ? `, ${roleSummary},` : ''} and save their contact details in one tap.`

  return { shareTitle, shareDescription, fullName, company, title }
}

const normalizeUrl = (value: string) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '').trim()

const ICON_SVGS = {
  phone: `
    <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.08 6.18 2 2 0 0 1 5.06 4h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.66 2.62a2 2 0 0 1-.45 2.11L9.1 11.62a16 16 0 0 0 3.28 3.28l1.17-1.17a2 2 0 0 1 2.11-.45c.84.32 1.72.54 2.62.66A2 2 0 0 1 22 16.92Z"/>
    </svg>
  `,
  email: `
    <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="m4 7 8 6 8-6"/>
    </svg>
  `,
  location: `
    <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z"/>
      <circle cx="12" cy="11" r="2.2"/>
    </svg>
  `,
  website: `
    <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M3 12h18"/>
      <path d="M12 3a14.5 14.5 0 0 1 0 18"/>
      <path d="M12 3a14.5 14.5 0 0 0 0 18"/>
    </svg>
  `,
  instagram: `
    <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="5.25"/>
      <circle cx="12" cy="12" r="4.1"/>
      <circle cx="17.35" cy="6.65" r="1.15" fill="currentColor" stroke="none"/>
    </svg>
  `,
  facebook: `
    <svg viewBox="0 0 24 24" class="icon-svg fill-icon" fill="currentColor" aria-hidden="true">
      <path d="M13.25 21v-6.7h2.27l.34-2.77h-2.61V9.76c0-.8.22-1.35 1.38-1.35H16V5.96c-.24-.03-1.07-.1-2.04-.1-2.02 0-3.4 1.24-3.4 3.5v2.17H8.28v2.77h2.28V21h2.69Z"/>
    </svg>
  `,
  youtube: `
    <svg viewBox="0 0 24 24" class="icon-svg fill-icon" fill="currentColor" aria-hidden="true">
      <path d="M21.56 7.3a2.85 2.85 0 0 0-2-2.02C17.78 4.8 12 4.8 12 4.8s-5.78 0-7.56.48a2.85 2.85 0 0 0-2 2.02A29.7 29.7 0 0 0 2 12a29.7 29.7 0 0 0 .44 4.7 2.85 2.85 0 0 0 2 2.02c1.78.48 7.56.48 7.56.48s5.78 0 7.56-.48a2.85 2.85 0 0 0 2-2.02A29.7 29.7 0 0 0 22 12a29.7 29.7 0 0 0-.44-4.7ZM10.25 15.2V8.8L15.85 12l-5.6 3.2Z"/>
    </svg>
  `,
  tiktok: `
    <svg viewBox="0 0 24 24" class="icon-svg fill-icon" fill="currentColor" aria-hidden="true">
      <path d="M14.2 3c.35 1.7 1.3 3.02 2.86 3.95.8.48 1.7.77 2.64.83v2.78a7.58 7.58 0 0 1-4.06-1.14v5.26a5.05 5.05 0 1 1-4.4-5.01v2.89a2.26 2.26 0 1 0 1.3 2.04V3h1.66Z"/>
    </svg>
  `,
} as const

const SOCIAL_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
} as const

const pickColor = (value: unknown, fallback: string) => {
  const normalized = normalizeText(value)
  return normalized || fallback
}

const CTA_LABELS = {
  call: 'Call Me',
  email: 'Email Me',
  whatsapp: 'WhatsApp Me',
  website: 'Visit My Website',
} as const

const CTA_KICKERS = {
  call: 'Direct line',
  email: 'Quick email',
  whatsapp: 'Instant chat',
  website: 'Explore more',
} as const

const CTA_HELPERS = {
  call: 'Tap to start a call right away.',
  email: 'Open a message with one tap.',
  whatsapp: 'Jump into WhatsApp instantly.',
  website: 'Open the full website experience.',
} as const

const FEATURED_SOCIAL_TITLES = {
  instagram: 'Follow on Instagram',
  facebook: 'Follow on Facebook',
  youtube: 'Watch on YouTube',
  tiktok: 'Follow on TikTok',
} as const

const FEATURED_SOCIAL_HINTS = {
  instagram: 'See the latest updates, stories, and drops.',
  facebook: 'Stay connected for posts, events, and announcements.',
  youtube: 'Open the channel and explore featured videos.',
  tiktok: 'Catch short-form updates and behind-the-scenes posts.',
} as const

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

const parseRgb = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : hex.length === 6
          ? hex
          : ''

    if (!normalized) return null

    const parsed = Number.parseInt(normalized, 16)
    if (Number.isNaN(parsed)) return null

    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    }
  }

  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!rgbMatch) return null

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
  }
}

const toRgba = (value: string | undefined, alpha: number) => {
  const rgb = parseRgb(value)
  if (!rgb) return null
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

const isLightColor = (value?: string | null) => {
  const rgb = parseRgb(value)
  if (!rgb) return true
  const channel = [rgb.r, rgb.g, rgb.b].map((component) => {
    const normalized = component / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2]
  return luminance > 0.58
}

const makeGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`

const makeBase = (useGradient: boolean, color: string, gradient: string) =>
  useGradient ? makeGradient(color, gradient) : `linear-gradient(0deg, ${color}, ${color})`

const getTextureStyle = (texture: NonNullable<VcardStyleRecord['texture']>, base: string) => {
  switch (texture) {
    case 'metallic':
      return {
        backgroundImage:
          'linear-gradient(120deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.25) 70%, rgba(255,255,255,0.25) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 6px), ' +
          base,
        backgroundBlendMode: 'screen, overlay, normal',
        boxShadow:
          'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.35)',
      }
    case 'glossy':
      return {
        backgroundImage:
          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.2)), ' +
          base,
        backgroundBlendMode: 'screen, overlay, normal',
        boxShadow:
          'inset 0 12px 24px rgba(255,255,255,0.2), inset 0 -10px 16px rgba(0,0,0,0.3)',
      }
    case 'paper':
      return {
        backgroundImage:
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), rgba(255,255,255,0) 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.95)',
      }
    case 'matte':
    default:
      return {
        backgroundImage:
          'linear-gradient(0deg, rgba(0,0,0,0.16), rgba(0,0,0,0.16)), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px), ' +
          base,
        backgroundBlendMode: 'soft-light, overlay, normal',
        filter: 'saturate(0.94)',
      }
  }
}

const serializeStyle = (styles: Record<string, string | number | undefined | null>) =>
  Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const cssKey = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
      return `${cssKey}:${String(value)}`
    })
    .join(';')

type LinkConfig = {
  href: string
  external: boolean
}

type BuiltCtaConfig = LinkConfig & {
  label: string
  kicker: string
  helper: string
  iconMarkup: string
}

const buildMaybeLink = (
  link: LinkConfig | null,
  className: string,
  content: string
) => {
  if (!link?.href) {
    return `<div class="${className}">${content}</div>`
  }

  return `<a class="${className}" href="${escapeHtml(link.href)}"${link.external ? ' target="_blank" rel="noreferrer"' : ''}>${content}</a>`
}

const buildSocialButton = (label: string, href: string, iconMarkup: string) =>
  `<a class="social-chip" href="${escapeHtml(normalizeUrl(href))}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(label)}">${iconMarkup}</a>`

const buildActionLink = (profile: VcardProfileRecord): BuiltCtaConfig | null => {
  const type = normalizeText(profile.ctaType) as keyof typeof CTA_LABELS | ''
  if (!type || !(type in CTA_LABELS)) return null

  const rawValue = normalizeText(profile.ctaValue)
  const label = normalizeText(profile.ctaLabel) || CTA_LABELS[type]

  if (type === 'call') {
    const phone = normalizePhone(rawValue || normalizeText(profile.phone))
    return phone
      ? {
          href: `tel:${phone}`,
          external: false,
          label,
          kicker: CTA_KICKERS.call,
          helper: CTA_HELPERS.call,
          iconMarkup: ICON_SVGS.phone,
        }
      : null
  }

  if (type === 'email') {
    const email = rawValue || normalizeText(profile.email)
    return email
      ? {
          href: `mailto:${email}`,
          external: false,
          label,
          kicker: CTA_KICKERS.email,
          helper: CTA_HELPERS.email,
          iconMarkup: ICON_SVGS.email,
        }
      : null
  }

  if (type === 'whatsapp') {
    const digits = normalizePhone(rawValue || normalizeText(profile.phone)).replace(/\D/g, '')
    return digits
      ? {
          href: `https://wa.me/${digits}`,
          external: true,
          label,
          kicker: CTA_KICKERS.whatsapp,
          helper: CTA_HELPERS.whatsapp,
          iconMarkup: `
            <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-12.37 7.35L3 20l1.2-5.34A8.5 8.5 0 1 1 21 11.5Z"/>
              <path d="M8.7 9.2c.18-.4.36-.42.53-.43.14-.01.3-.01.46-.01.14 0 .37-.05.57.39.22.49.74 1.72.81 1.84.07.12.11.27.02.43-.09.16-.14.26-.28.4-.14.14-.29.31-.42.42-.14.12-.28.25-.12.5.16.26.72 1.18 1.55 1.92 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.16-.19.69-.8.87-1.07.18-.28.37-.23.63-.14.26.09 1.64.77 1.93.91.28.14.46.21.53.33.07.12.07.7-.16 1.38-.23.69-1.36 1.34-1.88 1.42-.48.08-1.09.11-1.76-.11-.41-.13-.93-.3-1.6-.59-2.81-1.22-4.65-4.22-4.79-4.41-.14-.18-1.14-1.51-1.14-2.88 0-1.37.72-2.04.97-2.32Z"/>
            </svg>
          `,
        }
      : null
  }

  const website = normalizeUrl(rawValue || normalizeText(profile.website))
  return website
    ? {
        href: website,
        external: true,
        label,
        kicker: CTA_KICKERS.website,
        helper: CTA_HELPERS.website,
        iconMarkup: ICON_SVGS.website,
      }
    : null
}

const buildContactRow = (
  label: string,
  value: string,
  link: LinkConfig | null,
  iconMarkup: string
) =>
  buildMaybeLink(
    link,
    'contact-row',
    `
      <div class="contact-icon icon-bubble" aria-hidden="true">${iconMarkup}</div>
      <div class="contact-copy">
        <div class="contact-label">${escapeHtml(label)}</div>
        <div class="contact-value">${escapeHtml(value)}</div>
      </div>
      ${link?.href ? '<span class="row-arrow" aria-hidden="true">↗</span>' : ''}
    `
  )

const buildCollectrModule = (preview: CollectrShowcasePreview) => {
  const stats = [
    preview.profile.totalCards > 0
      ? `<div class="collectr-stat"><span class="collectr-stat-label">Cards</span><span class="collectr-stat-value">${escapeHtml(String(preview.profile.totalCards))}</span></div>`
      : '',
    preview.profile.totalSealed > 0
      ? `<div class="collectr-stat"><span class="collectr-stat-label">Sealed</span><span class="collectr-stat-value">${escapeHtml(String(preview.profile.totalSealed))}</span></div>`
      : '',
    preview.profile.portfolioValue !== null
      ? `<div class="collectr-stat"><span class="collectr-stat-label">Value</span><span class="collectr-stat-value">${escapeHtml(formatCurrency(preview.profile.portfolioValue))}</span></div>`
      : '',
  ]
    .filter(Boolean)
    .join('')

  const cards = preview.cards
    .map((card) => {
      const title = escapeHtml(card.name)
      const setName = escapeHtml(card.setName || card.categoryName || 'Collectr')
      const price = formatCurrency(card.marketPrice)
      return `
        <a class="collectr-card" href="${escapeHtml(preview.sourceUrl)}" target="_blank" rel="noreferrer">
          <div class="collectr-card-media">
            <img src="${escapeHtml(card.imageUrl)}" alt="${title}" loading="lazy" />
          </div>
          <div class="collectr-card-body">
            <div class="collectr-card-set">${setName}</div>
            <div class="collectr-card-title">${title}</div>
            <div class="collectr-card-meta">
              ${price ? `<span class="collectr-price">${escapeHtml(price)}</span>` : ''}
              ${card.quantity > 1 ? `<span class="collectr-quantity">x${escapeHtml(String(card.quantity))}</span>` : ''}
            </div>
          </div>
        </a>
      `
    })
    .join('')

  const handle = normalizeText(preview.profile.handle)
  const backgroundImage = normalizeText(preview.profile.backgroundImageUrl)

  return `
    <section class="surface-shell collectr-panel">
      ${backgroundImage ? `<div class="collectr-bg" style="${escapeHtml(serializeStyle({ backgroundImage: `url(${backgroundImage})`, backgroundPosition: 'center', backgroundSize: 'cover' }))}"></div>` : ''}
      <div class="collectr-sheen"></div>
      <div class="collectr-content">
        <div class="collectr-header">
          <div class="collectr-copy">
            <div class="chip-row">
              <span class="surface-chip">Collection showcase</span>
              ${handle ? `<span class="surface-chip">@${escapeHtml(handle)}</span>` : ''}
            </div>
            <h2>Featured from my Collectr</h2>
            <p>A quick look at standout pieces from the collection without leaving this card.</p>
          </div>
          ${stats ? `<div class="collectr-stats">${stats}</div>` : ''}
        </div>
        <div class="collectr-grid">${cards}</div>
        <a class="collectr-link" href="${escapeHtml(preview.sourceUrl)}" target="_blank" rel="noreferrer">
          <div>
            <span class="collectr-link-label">Full showcase</span>
            <span class="collectr-link-copy">Open the complete Collectr page</span>
          </div>
          <span class="row-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  `
}

export const buildVcardLandingHtml = (
  vcard: Vcard,
  canonicalUrl: string,
  collectrPreview: CollectrShowcasePreview | null = null
) => {
  const payload = (vcard.data ?? {}) as { profile?: VcardProfileRecord; style?: VcardStyleRecord }
  const profile = payload.profile ?? {}
  const style = { ...DEFAULT_VCARD_STYLE, ...(payload.style ?? {}) }
  const { shareTitle, shareDescription } = buildVcardShareMeta(profile)
  const name = normalizeText(profile.name) || 'Your Name'
  const title = normalizeText(profile.title)
  const company = normalizeText(profile.company)
  const about = normalizeText(profile.about)
  const location = normalizeText(profile.location)
  const phone = normalizeText(profile.phone)
  const email = normalizeText(profile.email)
  const website = normalizeText(profile.website)
  const frontFontColor = pickColor(style.frontFontColor, DEFAULT_VCARD_STYLE.frontFontColor)
  const buttonColor = pickColor(style.buttonColor, DEFAULT_VCARD_STYLE.buttonColor)
  const buttonTextColor = pickColor(style.buttonTextColor, DEFAULT_VCARD_STYLE.buttonTextColor)
  const shareImage =
    normalizeText(style.coverPhotoDataUrl) ||
    normalizeText(style.profilePhotoDataUrl) ||
    normalizeText(style.frontLogoDataUrl)
  const profileAlign = PROFILE_ALIGNMENT[style.profileAlign ?? DEFAULT_VCARD_STYLE.profileAlign]
  const profileInitial = escapeHtml((name || 'Q').charAt(0).toUpperCase())
  const titleLabel = title || company ? 'Role' : 'Profile'
  const primarySubline = company || title
  const secondarySubline = company && title ? title : ''
  const texture = style.texture ?? DEFAULT_VCARD_STYLE.texture
  const cardBase = makeBase(style.frontUseGradient, style.frontColor, style.frontGradient)
  const textureStyle = getTextureStyle(texture, cardBase)
  const hasLightText = isLightColor(frontFontColor)
  const hasDarkButtonText = !isLightColor(buttonTextColor)
  const toneClass = hasLightText ? 'tone-light-text' : 'tone-dark-text'
  const accentGlow =
    toRgba(style.frontGradient || style.frontColor, hasLightText ? 0.22 : 0.18) ??
    'rgba(255,255,255,0.12)'
  const buttonGlow =
    toRgba(buttonColor, hasDarkButtonText ? 0.22 : 0.34) ??
    'rgba(15,23,42,0.22)'
  const featuredSurface =
    `linear-gradient(135deg, ${toRgba(style.frontGradient || style.frontColor, hasLightText ? 0.18 : 0.12) ?? 'transparent'} 0%, transparent 55%, ${toRgba(buttonColor, 0.18) ?? 'transparent'} 100%)`
  const buttonSurface =
    `linear-gradient(135deg, ${buttonColor} 0%, ${buttonColor} 65%, ${toRgba(buttonColor, hasDarkButtonText ? 0.78 : 0.92) ?? buttonColor} 100%)`
  const socialLinks = [
    { key: 'instagram' as const, label: SOCIAL_LABELS.instagram, value: normalizeText(profile.socials?.instagram) },
    { key: 'facebook' as const, label: SOCIAL_LABELS.facebook, value: normalizeText(profile.socials?.facebook) },
    { key: 'youtube' as const, label: SOCIAL_LABELS.youtube, value: normalizeText(profile.socials?.youtube) },
    { key: 'tiktok' as const, label: SOCIAL_LABELS.tiktok, value: normalizeText(profile.socials?.tiktok) },
  ].filter((link) => link.value)
  const favoriteSocialKey = normalizeText(profile.favoriteSocial) as VcardProfileRecord['favoriteSocial']
  const featuredSocial =
    favoriteSocialKey && favoriteSocialKey !== ''
      ? socialLinks.find((link) => link.key === favoriteSocialKey) ?? null
      : null
  const cta = buildActionLink(profile)
  const collectrModule = collectrPreview ? buildCollectrModule(collectrPreview) : ''
  const cardStyle = escapeHtml(
    serializeStyle({
      color: frontFontColor,
      fontFamily: normalizeVcardFontFamily(style.fontFamily),
      borderRadius: `${Math.max(18, Math.min(style.radius ?? DEFAULT_VCARD_STYLE.radius, 36))}px`,
      backgroundImage: textureStyle.backgroundImage,
      backgroundBlendMode: textureStyle.backgroundBlendMode,
      boxShadow: ['0 24px 80px rgba(15,23,42,0.28)', textureStyle.boxShadow].filter(Boolean).join(', '),
      filter: textureStyle.filter,
      '--accent-glow': accentGlow,
      '--button-glow': buttonGlow,
      '--button-surface': buttonSurface,
      '--button-text': buttonTextColor,
      '--featured-surface': featuredSurface,
    })
  )
  const coverBaseStyle = escapeHtml(serializeStyle({ background: cardBase }))
  const coverImageStyle = escapeHtml(
    serializeStyle({
      backgroundImage: style.coverPhotoDataUrl ? `url(${style.coverPhotoDataUrl})` : '',
      backgroundSize: `${style.coverZoom ?? DEFAULT_VCARD_STYLE.coverZoom}%`,
      backgroundPosition: `${style.coverX ?? DEFAULT_VCARD_STYLE.coverX}% ${style.coverY ?? DEFAULT_VCARD_STYLE.coverY}%`,
      backgroundRepeat: 'no-repeat',
    })
  )
  const profilePhotoStyle = escapeHtml(
    serializeStyle({
      backgroundImage: style.profilePhotoDataUrl ? `url(${style.profilePhotoDataUrl})` : '',
      backgroundSize: `${style.photoZoom ?? DEFAULT_VCARD_STYLE.photoZoom}%`,
      backgroundPosition: `${style.photoX ?? DEFAULT_VCARD_STYLE.photoX}% ${style.photoY ?? DEFAULT_VCARD_STYLE.photoY}%`,
      backgroundRepeat: 'no-repeat',
    })
  )
  const socialButtons = socialLinks
    .map((link) => buildSocialButton(link.label, link.value, ICON_SVGS[link.key]))
    .join('')
  const contactRows = [
    phone
      ? buildContactRow(
          'Phone',
          phone,
          { href: `tel:${normalizePhone(phone)}`, external: false },
          ICON_SVGS.phone
        )
      : '',
    email
      ? buildContactRow(
          'Email',
          email,
          { href: `mailto:${email}`, external: false },
          ICON_SVGS.email
        )
      : '',
    location ? buildContactRow('Location', location, null, ICON_SVGS.location) : '',
    website
      ? buildContactRow(
          'Website',
          website,
          { href: normalizeUrl(website), external: true },
          ICON_SVGS.website
        )
      : '',
  ]
    .filter(Boolean)
    .join('')
  const featuredSocialMarkup =
    featuredSocial
      ? buildMaybeLink(
          { href: normalizeUrl(featuredSocial.value), external: true },
          'surface-shell featured-card',
          `
            <div class="featured-bg"></div>
            <div class="featured-inner">
              <div class="featured-icon" aria-hidden="true">${ICON_SVGS[featuredSocial.key]}</div>
              <div class="featured-copy">
                <div class="featured-kicker">Favorite channel</div>
                <div class="featured-title">${escapeHtml(FEATURED_SOCIAL_TITLES[featuredSocial.key])}</div>
                <div class="featured-hint">${escapeHtml(FEATURED_SOCIAL_HINTS[featuredSocial.key])}</div>
              </div>
              <span class="row-arrow" aria-hidden="true">↗</span>
            </div>
          `
        )
      : ''
  const ctaMarkup =
    cta
      ? `<a class="action-card" href="${escapeHtml(cta.href)}"${cta.external ? ' target="_blank" rel="noreferrer"' : ''}>
          <div class="action-overlay"></div>
          <div class="action-inner">
            <div class="action-copy-wrap">
              <div class="action-icon" aria-hidden="true">${cta.iconMarkup}</div>
              <div class="action-copy">
                <div class="action-kicker">${escapeHtml(cta.kicker)}</div>
                <div class="action-title">${escapeHtml(cta.label)}</div>
                <div class="action-helper">${escapeHtml(cta.helper)}</div>
              </div>
            </div>
            <span class="row-arrow action-arrow" aria-hidden="true">↗</span>
          </div>
        </a>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(shareTitle)}</title>
  <meta name="description" content="${escapeHtml(shareDescription)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(shareTitle)}" />
  <meta property="og:description" content="${escapeHtml(shareDescription)}" />
  ${shareImage ? `<meta property="og:image" content="${escapeHtml(shareImage)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}" />
  <meta name="twitter:title" content="${escapeHtml(shareTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(shareDescription)}" />
  ${shareImage ? `<meta name="twitter:image" content="${escapeHtml(shareImage)}" />` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${VCARD_GOOGLE_FONTS_URL}" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    :root {
      color-scheme: light;
      --page-bg: #f6f1ff;
      --divider: rgba(255,255,255,0.1);
      --cover-shadow: rgba(15,23,42,0.35);
    }
    html { background: var(--page-bg); }
    body {
      margin: 0;
      min-height: 100svh;
      background:
        radial-gradient(circle at top, rgba(168,85,247,0.18), transparent 35%),
        radial-gradient(circle at bottom, rgba(56,189,248,0.14), transparent 30%),
        var(--page-bg);
      padding: max(12px, env(safe-area-inset-top, 0px)) 12px max(18px, env(safe-area-inset-bottom, 0px)) 12px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      color: inherit;
    }
    .shell {
      width: min(100%, 1120px);
    }
    .card {
      position: relative;
      isolation: isolate;
      width: 100%;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .card-glow {
      pointer-events: none;
      position: absolute;
      inset: 0;
      opacity: 0.9;
      background:
        radial-gradient(circle at 12% 14%, var(--accent-glow) 0%, transparent 34%),
        radial-gradient(circle at 88% 84%, var(--button-glow) 0%, transparent 32%);
    }
    .tone-light-text {
      --surface-border: rgba(255,255,255,0.12);
      --surface-bg: rgba(255,255,255,0.08);
      --surface-shadow: 0 18px 40px rgba(15,23,42,0.18);
      --panel-border: rgba(255,255,255,0.12);
      --panel-bg: rgba(255,255,255,0.06);
      --chip-border: rgba(255,255,255,0.12);
      --chip-bg: rgba(255,255,255,0.10);
      --chip-color: rgba(255,255,255,0.9);
      --icon-bg: rgba(255,255,255,0.12);
      --icon-color: rgba(255,255,255,0.92);
      --text-strong: rgba(255,255,255,0.96);
      --text-base: rgba(255,255,255,0.84);
      --text-soft: rgba(255,255,255,0.78);
      --text-label: rgba(255,255,255,0.58);
      --logo-bg: rgba(0,0,0,0.20);
      --logo-border: rgba(255,255,255,0.18);
      --social-bg: rgba(255,255,255,0.10);
      --social-border: rgba(255,255,255,0.14);
      --social-hover: rgba(255,255,255,0.16);
      --social-hover-border: rgba(255,255,255,0.24);
      --feature-icon-bg: rgba(255,255,255,0.12);
    }
    .tone-dark-text {
      --surface-border: rgba(15,23,42,0.10);
      --surface-bg: rgba(255,255,255,0.58);
      --surface-shadow: 0 18px 40px rgba(15,23,42,0.12);
      --panel-border: rgba(15,23,42,0.10);
      --panel-bg: rgba(255,255,255,0.5);
      --chip-border: rgba(15,23,42,0.08);
      --chip-bg: rgba(255,255,255,0.7);
      --chip-color: rgba(15,23,42,0.85);
      --icon-bg: rgba(15,23,42,0.06);
      --icon-color: rgba(15,23,42,0.8);
      --text-strong: rgba(15,23,42,0.90);
      --text-base: rgba(15,23,42,0.74);
      --text-soft: rgba(15,23,42,0.66);
      --text-label: rgba(15,23,42,0.5);
      --logo-bg: rgba(255,255,255,0.65);
      --logo-border: rgba(15,23,42,0.12);
      --social-bg: rgba(255,255,255,0.72);
      --social-border: rgba(15,23,42,0.08);
      --social-hover: rgba(255,255,255,0.88);
      --social-hover-border: rgba(15,23,42,0.14);
      --feature-icon-bg: rgba(255,255,255,0.7);
      --divider: rgba(15,23,42,0.10);
    }
    .surface-shell {
      border: 1px solid var(--surface-border);
      background: var(--surface-bg);
      box-shadow: var(--surface-shadow);
      backdrop-filter: blur(24px);
    }
    .surface-panel {
      border: 1px solid var(--panel-border);
      background: var(--panel-bg);
      backdrop-filter: blur(18px);
    }
    .surface-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid var(--chip-border);
      background: var(--chip-bg);
      color: var(--chip-color);
      padding: 6px 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .hero {
      position: relative;
    }
    .cover {
      position: relative;
      overflow: hidden;
      aspect-ratio: 5 / 2;
    }
    .cover-base,
    .cover-image,
    .cover-shade,
    .cover-bottom {
      position: absolute;
      inset: 0;
    }
    .cover-image {
      background-position: center;
    }
    .cover-shade {
      background: linear-gradient(135deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.08) 42%, rgba(0,0,0,0.38) 100%);
    }
    .cover-bottom {
      inset: auto 0 0 0;
      height: 7rem;
      background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.36) 100%);
    }
    .brand-mark {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 1.4rem;
      border: 1px solid var(--logo-border);
      background: var(--logo-bg);
      padding: 10px;
      backdrop-filter: blur(16px);
      max-height: 4.5rem;
      max-width: 9.25rem;
    }
    .brand-mark img {
      display: block;
      height: 3.5rem;
      max-width: 9.1rem;
    }
    .profile-anchor {
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      z-index: 3;
      display: flex;
      transform: translateY(50%);
      padding: 0 20px;
    }
    .profile-shell {
      display: flex;
      height: 7rem;
      width: 7rem;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 999px;
      border: 4px solid rgba(255,255,255,0.9);
      box-shadow: 0 14px 38px var(--cover-shadow);
      background: rgba(255,255,255,0.15);
    }
    .profile-fill {
      display: flex;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: center;
      background-color: rgba(0,0,0,0.15);
      color: white;
      font-size: 2rem;
      font-weight: 700;
      background-position: center;
    }
    .card-body {
      position: relative;
      padding: 4.75rem 16px 16px;
      display: grid;
      gap: 20px;
    }
    .layout {
      display: grid;
      gap: 16px;
    }
    .column-main,
    .column-side {
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .intro-shell {
      border-radius: 30px;
      padding: 20px 20px 22px;
    }
    .intro-copy {
      display: grid;
      gap: 16px;
    }
    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .headline {
      display: grid;
      gap: 8px;
    }
    .headline h1 {
      margin: 0;
      font-size: clamp(2.15rem, 8vw, 3.15rem);
      line-height: 1.02;
      letter-spacing: -0.04em;
      font-weight: 700;
      color: var(--text-strong);
    }
    .headline-subline {
      margin: 0;
      font-size: clamp(1.2rem, 4vw, 2rem);
      line-height: 1.05;
      letter-spacing: -0.03em;
      font-weight: 600;
      color: var(--text-base);
    }
    .headline-secondary {
      margin: 0;
      font-size: 0.96rem;
      line-height: 1.5;
      color: var(--text-soft);
    }
    .social-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .social-chip {
      display: inline-flex;
      height: 40px;
      width: 40px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid var(--social-border);
      background: var(--social-bg);
      color: inherit;
      text-decoration: none;
      backdrop-filter: blur(14px);
      transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
    }
    .social-chip:hover {
      transform: translateY(-1px);
      background: var(--social-hover);
      border-color: var(--social-hover-border);
    }
    .social-chip .icon-svg {
      width: 16px;
      height: 16px;
    }
    .about {
      margin: 0;
      max-width: 62ch;
      font-size: 0.96rem;
      line-height: 1.7;
      color: var(--text-base);
    }
    .action-card {
      position: relative;
      display: block;
      overflow: hidden;
      border-radius: 30px;
      padding: 18px 20px;
      color: var(--button-text);
      text-decoration: none;
      background: var(--button-surface);
      box-shadow: 0 18px 40px var(--button-glow);
    }
    .action-overlay {
      position: absolute;
      inset: 0;
      opacity: 0.8;
      background: linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,0.08) 100%);
    }
    .action-inner {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .action-copy-wrap {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 12px;
    }
    .action-icon {
      display: flex;
      height: 48px;
      width: 48px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(0,0,0,0.15);
    }
    .tone-dark-text .action-icon {
      border-color: rgba(15,23,42,0.12);
      background: rgba(255,255,255,0.35);
    }
    .action-copy {
      min-width: 0;
    }
    .action-kicker,
    .contact-label,
    .featured-kicker,
    .collectr-stat-label,
    .collectr-link-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-transform: uppercase;
    }
    .action-kicker { opacity: 0.72; }
    .action-title {
      font-size: clamp(1rem, 3vw, 1.25rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .action-helper {
      margin-top: 4px;
      font-size: 0.85rem;
      line-height: 1.45;
      opacity: 0.82;
    }
    .contact-shell {
      border-radius: 30px;
      padding: 10px;
    }
    .contact-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 12px 12px;
    }
    .contact-header-copy {
      display: grid;
      gap: 4px;
    }
    .contact-kicker {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: var(--text-label);
    }
    .contact-helper {
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--text-base);
    }
    .contact-count { display: none; }
    .contact-panel {
      overflow: hidden;
      border-radius: 24px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      color: inherit;
      text-decoration: none;
      transition: transform 180ms ease, background 180ms ease;
    }
    .contact-row + .contact-row {
      border-top: 1px solid var(--divider);
    }
    .contact-row:hover {
      transform: translateY(-1px);
    }
    .icon-bubble,
    .featured-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 1rem;
      background: var(--icon-bg);
      color: var(--icon-color);
      flex-shrink: 0;
    }
    .icon-bubble {
      height: 44px;
      width: 44px;
    }
    .contact-copy {
      min-width: 0;
      flex: 1;
    }
    .contact-label {
      color: var(--text-label);
    }
    .contact-value {
      margin-top: 4px;
      font-size: 0.98rem;
      font-weight: 600;
      line-height: 1.35;
      letter-spacing: -0.02em;
      color: var(--text-strong);
      word-break: break-word;
    }
    .row-arrow {
      flex-shrink: 0;
      font-size: 1.05rem;
      line-height: 1;
      opacity: 0.72;
    }
    .action-arrow { font-size: 1.2rem; }
    .featured-card {
      position: relative;
      overflow: hidden;
      border-radius: 30px;
      padding: 18px 20px;
      color: inherit;
      text-decoration: none;
    }
    .featured-bg {
      position: absolute;
      inset: 0;
      background: var(--featured-surface);
      opacity: 0.72;
    }
    .featured-inner {
      position: relative;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .featured-icon {
      height: 56px;
      width: 56px;
      border: 1px solid var(--surface-border);
      background: var(--feature-icon-bg);
    }
    .featured-copy {
      min-width: 0;
      flex: 1;
    }
    .featured-kicker {
      color: var(--text-label);
    }
    .featured-title {
      margin-top: 4px;
      font-size: clamp(1rem, 3vw, 1.25rem);
      line-height: 1.15;
      letter-spacing: -0.03em;
      font-weight: 700;
      color: var(--text-strong);
    }
    .featured-hint {
      margin-top: 6px;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--text-soft);
    }
    .collectr-panel {
      position: relative;
      overflow: hidden;
      border-radius: 32px;
      padding: 16px;
    }
    .collectr-bg,
    .collectr-sheen {
      position: absolute;
      inset: 0;
    }
    .collectr-bg { opacity: 0.14; }
    .collectr-sheen {
      opacity: 0.9;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 48%, rgba(255,255,255,0.06) 100%);
    }
    .collectr-content {
      position: relative;
      display: grid;
      gap: 16px;
    }
    .collectr-header {
      display: grid;
      gap: 16px;
    }
    .collectr-copy {
      display: grid;
      gap: 8px;
    }
    .collectr-copy h2 {
      margin: 0;
      font-size: clamp(1.2rem, 4vw, 1.5rem);
      line-height: 1.05;
      letter-spacing: -0.03em;
      color: var(--text-strong);
    }
    .collectr-copy p {
      margin: 0;
      font-size: 0.94rem;
      line-height: 1.6;
      color: var(--text-base);
    }
    .collectr-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .collectr-stat {
      border-radius: 18px;
      border: 1px solid var(--panel-border);
      background: var(--panel-bg);
      padding: 10px 12px;
      backdrop-filter: blur(18px);
      min-width: 92px;
    }
    .collectr-stat-label {
      color: var(--text-label);
      display: block;
    }
    .collectr-stat-value {
      display: block;
      margin-top: 6px;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-strong);
    }
    .collectr-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .collectr-card {
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid var(--panel-border);
      background: var(--panel-bg);
      color: inherit;
      text-decoration: none;
      transition: transform 180ms ease, box-shadow 180ms ease;
    }
    .collectr-card:hover,
    .collectr-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 34px rgba(15,23,42,0.14);
    }
    .collectr-card-media {
      aspect-ratio: 3 / 4;
      background: rgba(15,23,42,0.1);
      overflow: hidden;
    }
    .collectr-card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .collectr-card-body {
      display: grid;
      gap: 8px;
      padding: 12px;
    }
    .collectr-card-set {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.26em;
      text-transform: uppercase;
      color: var(--text-label);
    }
    .collectr-card-title {
      min-height: 2.4em;
      font-size: 0.9rem;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.02em;
      color: var(--text-strong);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .collectr-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .collectr-price,
    .collectr-quantity {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid var(--chip-border);
      background: var(--chip-bg);
      color: var(--chip-color);
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .collectr-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-radius: 24px;
      border: 1px solid var(--panel-border);
      background: var(--panel-bg);
      padding: 14px 16px;
      color: inherit;
      text-decoration: none;
      transition: transform 180ms ease, box-shadow 180ms ease;
    }
    .collectr-link-copy {
      display: block;
      margin-top: 6px;
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
      color: var(--text-strong);
    }
    .footer {
      border-top: 1px solid var(--divider);
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      line-height: 1.5;
      color: var(--text-soft);
    }
    .footer a {
      color: inherit;
      font-weight: 700;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 4px;
    }
    .icon-svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .fill-icon {
      stroke: none;
    }
    @media (min-width: 640px) {
      body { padding: max(18px, env(safe-area-inset-top, 0px)) 18px max(22px, env(safe-area-inset-bottom, 0px)) 18px; }
      .brand-mark {
        top: 1.5rem;
        right: 1.5rem;
      }
      .profile-anchor { padding: 0 32px; }
      .profile-shell {
        height: 8rem;
        width: 8rem;
      }
      .card-body {
        padding: 5.5rem 24px 24px;
        gap: 24px;
      }
      .intro-shell { padding: 24px 24px 26px; }
      .contact-shell { padding: 12px; }
      .contact-count { display: inline-flex; }
      .collectr-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (min-width: 1024px) {
      body { padding: 28px; }
      .shell { width: min(100%, 1280px); }
      .cover {
        aspect-ratio: 16 / 5;
      }
      .profile-shell {
        height: 9rem;
        width: 9rem;
      }
      .card-body {
        padding: 6rem 32px 32px;
        gap: 24px;
      }
      .layout {
        grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
        gap: 24px;
      }
      .collectr-header {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }
      .collectr-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card ${toneClass}" style="${cardStyle}">
      <div class="card-glow"></div>
      <div class="hero">
        <div class="cover">
          <div class="cover-base" style="${coverBaseStyle}"></div>
          ${style.coverPhotoDataUrl ? `<div class="cover-image" style="${coverImageStyle}" aria-label="VCard cover"></div>` : ''}
          <div class="cover-shade"></div>
          <div class="cover-bottom"></div>
          ${style.frontLogoDataUrl ? `<div class="brand-mark"><img src="${escapeHtml(style.frontLogoDataUrl)}" alt="Brand mark" /></div>` : ''}
        </div>
        <div class="profile-anchor" style="justify-content:${profileAlign}">
          <div class="profile-shell">
            <div class="profile-fill"${style.profilePhotoDataUrl ? ` style="${profilePhotoStyle}"` : ''}>${style.profilePhotoDataUrl ? '' : profileInitial}</div>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="layout">
          <div class="column-main">
            <div class="surface-shell intro-shell">
              <div class="intro-copy">
                <div class="chip-row">
                  <span class="surface-chip">${escapeHtml(titleLabel)}</span>
                  ${socialLinks.length > 0 ? `<span class="surface-chip">${socialLinks.length} social${socialLinks.length > 1 ? 's' : ''}</span>` : ''}
                </div>
                <div class="headline">
                  <h1>${escapeHtml(name)}</h1>
                  ${primarySubline ? `<p class="headline-subline">${escapeHtml(primarySubline)}</p>` : ''}
                  ${secondarySubline ? `<p class="headline-secondary">${escapeHtml(secondarySubline)}</p>` : ''}
                </div>
                ${socialButtons ? `<div class="social-row">${socialButtons}</div>` : ''}
                ${about ? `<p class="about">${escapeHtml(about)}</p>` : ''}
              </div>
            </div>
            ${ctaMarkup}
          </div>

          <div class="column-side">
            ${contactRows ? `
              <div class="surface-shell contact-shell">
                <div class="contact-header">
                  <div class="contact-header-copy">
                    <div class="contact-kicker">Contact</div>
                    <div class="contact-helper">Reach out directly from the channels below.</div>
                  </div>
                  <span class="surface-chip contact-count">${[phone, email, location, website].filter(Boolean).length} ways</span>
                </div>
                <div class="surface-panel contact-panel">${contactRows}</div>
              </div>
            ` : ''}
            ${featuredSocialMarkup}
          </div>
        </div>

        ${collectrModule}

        <div class="footer">
          This vcard was created with QR Code Studio by Luminar Apps.
          <a href="https://qrcode.luminarapps.com" target="_blank" rel="noreferrer">Create yours now</a>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`
}

const renderVcardPublicPage = async (
  c: Context<AppBindings>,
  url: Url,
  vcard: Vcard,
  scansService?: ScansService,
  areaStorage?: AreaStorage
) => {
  recordPublicPageScan(c, url, scansService, areaStorage)
  const canonicalUrl = buildVcardPublicUrl(vcard)
  const payload = (vcard.data ?? {}) as { profile?: VcardProfileRecord }
  const collectrUrl = normalizeText(payload.profile?.collectrUrl)
  const collectrPreview = collectrUrl
    ? await fetchCollectrShowcasePreview(collectrUrl, 5).catch(() => null)
    : null
  return c.html(buildVcardLandingHtml(vcard, canonicalUrl, collectrPreview))
}

export const publicLegacyVcardPageHandler = (
  service: UrlsService,
  vcardsService: VcardsService,
  scansService?: ScansService,
  areaStorage?: AreaStorage
) => {
  return async (c: Context<AppBindings>) => {
    const slug = slugifyPublicSegment(c.req.param('slug') ?? '')
    if (!slug) {
      return c.text('Not found', 404)
    }

    const match = await resolveLegacyVcardMatch(service, vcardsService, slug)
    if (!match) {
      return c.text('Not found', 404)
    }

    return renderVcardPublicPage(c, match.url, match.vcard, scansService, areaStorage)
  }
}

export const publicAliasPageHandler = (
  service: UrlsService,
  vcardsService: VcardsService,
  scansService?: ScansService,
  areaStorage?: AreaStorage
) => {
  return async (c: Context<AppBindings>) => {
    const owner = slugifyPublicSegment(c.req.param('owner') ?? '')
    const slug = slugifyPublicSegment(c.req.param('slug') ?? '')

    if (!owner || !slug) {
      return c.text('Not found', 404)
    }

    const urls = await service.getAllUrls()
    const match = urls.find((url) => matchesPublicAlias(url, owner, slug))

    if (!match) {
      return c.text('Not found', 404)
    }

    const parsedKind = parseKind(match.kind)
    if (parsedKind.type === 'vcard') {
      const vcard = await vcardsService.getByShortId(match.id)
      if (!vcard) {
        return c.text('Not found', 404)
      }
      return renderVcardPublicPage(c, match, vcard, scansService, areaStorage)
    }

    return c.redirect(getInternalTargetUrl(match), 302)
  }
}
