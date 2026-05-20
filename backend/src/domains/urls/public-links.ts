import type { Context } from 'hono'

import { getAppBaseUrl } from '../../config/env'
import type { AppBindings } from '../../shared/http/types'
import { recordAreaScanForUser } from '../scans/areaStore'
import { lookupGeo } from '../scans/geo'
import type { AreaStorage } from '../scans/storage/area.interface'
import type { ScansService } from '../scans/service'
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
  socials?: Record<string, string | undefined>
  ctaType?: string
  ctaLabel?: string
  ctaValue?: string
}

type VcardStyleRecord = {
  fontFamily?: string
  radius?: number
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

const DEFAULT_VCARD_STYLE: Required<
  Pick<
    VcardStyleRecord,
    | 'fontFamily'
    | 'radius'
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
  fontFamily: 'Arial, sans-serif',
  radius: 24,
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

const pickColor = (value: unknown, fallback: string) => {
  const normalized = normalizeText(value)
  return normalized || fallback
}

const buildFieldRow = (label: string, value: string, href?: string) => {
  const escapedLabel = escapeHtml(label)
  const escapedValue = escapeHtml(value)
  const icon = escapeHtml(label.slice(0, 1).toUpperCase())

  return `
    <div class="info-row">
      <div class="info-icon" aria-hidden="true">${icon}</div>
      <div class="info-copy">
        <div class="info-label">${escapedLabel}</div>
        ${
          href
            ? `<a class="info-value info-link" href="${escapeHtml(href)}"${href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''}>${escapedValue}</a>`
            : `<div class="info-value">${escapedValue}</div>`
        }
      </div>
    </div>
  `
}

const buildSocialButton = (label: string, href: string, short: string) => `
  <a class="social-chip" href="${escapeHtml(normalizeUrl(href))}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(label)}">
    <span>${escapeHtml(short)}</span>
  </a>
`

const buildCtaConfig = (profile: VcardProfileRecord) => {
  const type = normalizeText(profile.ctaType)
  const label = normalizeText(profile.ctaLabel)
  const value = normalizeText(profile.ctaValue)
  if (!type || !label || !value) return null

  if (type === 'call') {
    return { href: `tel:${normalizePhone(value)}`, label }
  }
  if (type === 'email') {
    return { href: `mailto:${value}`, label }
  }
  if (type === 'whatsapp') {
    const digits = value.replace(/\D/g, '')
    return digits ? { href: `https://wa.me/${digits}`, label } : null
  }
  if (type === 'website') {
    return { href: normalizeUrl(value), label }
  }
  return null
}

export const buildVcardLandingHtml = (vcard: Vcard, canonicalUrl: string) => {
  const payload = (vcard.data ?? {}) as { profile?: VcardProfileRecord; style?: VcardStyleRecord }
  const profile = payload.profile ?? {}
  const style = { ...DEFAULT_VCARD_STYLE, ...(payload.style ?? {}) }
  const { shareTitle, shareDescription, fullName, company, title } = buildVcardShareMeta(profile)
  const about = normalizeText(profile.about)
  const location = normalizeText(profile.location)
  const phone = normalizeText(profile.phone)
  const email = normalizeText(profile.email)
  const website = normalizeText(profile.website)
  const frontFontColor = pickColor(style.frontFontColor, DEFAULT_VCARD_STYLE.frontFontColor)
  const buttonColor = pickColor(style.buttonColor, DEFAULT_VCARD_STYLE.buttonColor)
  const buttonTextColor = pickColor(style.buttonTextColor, DEFAULT_VCARD_STYLE.buttonTextColor)
  const shareImage = normalizeText(style.coverPhotoDataUrl) || normalizeText(style.profilePhotoDataUrl) || normalizeText(style.frontLogoDataUrl)
  const cardBackground = style.frontUseGradient
    ? `linear-gradient(180deg, ${pickColor(style.frontGradient, DEFAULT_VCARD_STYLE.frontGradient)} 0%, ${pickColor(style.frontColor, DEFAULT_VCARD_STYLE.frontColor)} 100%)`
    : pickColor(style.frontColor, DEFAULT_VCARD_STYLE.frontColor)
  const coverBackground = style.frontUseGradient
    ? `linear-gradient(135deg, ${pickColor(style.frontGradient, DEFAULT_VCARD_STYLE.frontGradient)} 0%, ${pickColor(style.frontColor, DEFAULT_VCARD_STYLE.frontColor)} 100%)`
    : pickColor(style.frontColor, DEFAULT_VCARD_STYLE.frontColor)
  const profileAlign = PROFILE_ALIGNMENT[style.profileAlign ?? DEFAULT_VCARD_STYLE.profileAlign]
  const profileInitial = escapeHtml((fullName || 'V').charAt(0).toUpperCase())

  const infoRows = [
    phone ? buildFieldRow('Phone', phone, `tel:${normalizePhone(phone)}`) : '',
    email ? buildFieldRow('Email', email, `mailto:${email}`) : '',
    location ? buildFieldRow('Location', location) : '',
    website ? buildFieldRow('Website', website, normalizeUrl(website)) : '',
    company && company !== title ? buildFieldRow('Company', company) : '',
  ].filter(Boolean).join('')

  const socials = profile.socials ?? {}
  const socialButtons = [
    socials.instagram ? buildSocialButton('Instagram', socials.instagram, 'IG') : '',
    socials.facebook ? buildSocialButton('Facebook', socials.facebook, 'FB') : '',
    socials.youtube ? buildSocialButton('YouTube', socials.youtube, 'YT') : '',
    socials.tiktok ? buildSocialButton('TikTok', socials.tiktok, 'TT') : '',
  ].filter(Boolean).join('')

  const cta = buildCtaConfig(profile)

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
  <style>
    * { box-sizing: border-box; }
    :root {
      color-scheme: light;
      --page-bg: #f6f1ff;
      --card-fg: ${frontFontColor};
      --button-bg: ${buttonColor};
      --button-fg: ${buttonTextColor};
      --cover-bg: ${coverBackground};
      --card-bg: ${cardBackground};
      --radius: ${Math.max(18, Math.min(style.radius ?? DEFAULT_VCARD_STYLE.radius, 36))}px;
    }
    body {
      margin: 0;
      min-height: 100svh;
      font-family: ${escapeHtml(style.fontFamily ?? DEFAULT_VCARD_STYLE.fontFamily)};
      background:
        radial-gradient(circle at top, rgba(168,85,247,0.18), transparent 35%),
        radial-gradient(circle at bottom, rgba(56,189,248,0.14), transparent 30%),
        var(--page-bg);
      color: var(--card-fg);
      padding: max(12px, env(safe-area-inset-top, 0px)) 12px max(18px, env(safe-area-inset-bottom, 0px)) 12px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .shell {
      width: min(100%, 980px);
    }
    .card {
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--card-bg);
      color: var(--card-fg);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 24px 80px rgba(15,23,42,0.28);
    }
    .cover {
      position: relative;
      aspect-ratio: 5 / 2;
      background: var(--cover-bg);
      overflow: hidden;
    }
    .cover-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: ${style.coverX ?? DEFAULT_VCARD_STYLE.coverX}% ${style.coverY ?? DEFAULT_VCARD_STYLE.coverY}%;
      transform: scale(${(style.coverZoom ?? DEFAULT_VCARD_STYLE.coverZoom) / 100});
      transform-origin: center center;
      opacity: 0.98;
    }
    .cover::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.28) 100%);
    }
    .brand-mark {
      position: absolute;
      top: 18px;
      right: 18px;
      z-index: 2;
      max-height: 58px;
      max-width: 140px;
      border-radius: 16px;
      padding: 10px;
      background: rgba(15,23,42,0.18);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .profile-wrap {
      position: relative;
      display: flex;
      justify-content: ${profileAlign};
      padding: 0 24px;
      margin-top: -64px;
      z-index: 3;
    }
    .profile {
      width: 132px;
      height: 132px;
      border-radius: 999px;
      overflow: hidden;
      border: 4px solid rgba(255,255,255,0.82);
      box-shadow: 0 12px 30px rgba(15,23,42,0.35);
      background: rgba(255,255,255,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 42px;
      font-weight: 700;
    }
    .profile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: ${style.photoX ?? DEFAULT_VCARD_STYLE.photoX}% ${style.photoY ?? DEFAULT_VCARD_STYLE.photoY}%;
      transform: scale(${(style.photoZoom ?? DEFAULT_VCARD_STYLE.photoZoom) / 100});
      transform-origin: center center;
    }
    .content {
      padding: 24px 20px 18px;
      display: grid;
      gap: 22px;
    }
    .headline {
      display: grid;
      gap: 8px;
    }
    .headline h1 {
      margin: 0;
      font-size: clamp(2rem, 5vw, 3.25rem);
      line-height: 1;
      letter-spacing: -0.04em;
    }
    .subtitle {
      margin: 0;
      font-size: clamp(0.95rem, 2.6vw, 1.15rem);
      opacity: 0.92;
      font-weight: 600;
    }
    .company {
      margin: 0;
      font-size: 0.98rem;
      opacity: 0.72;
    }
    .socials {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding-top: 4px;
    }
    .social-chip {
      display: inline-flex;
      width: 38px;
      height: 38px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      text-decoration: none;
      color: var(--card-fg);
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(10px);
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .about {
      margin: 0;
      font-size: 0.98rem;
      line-height: 1.6;
      opacity: 0.86;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .info-row {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 12px;
      padding: 14px 14px;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(8px);
      align-items: start;
    }
    .info-icon {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      font-size: 0.82rem;
      font-weight: 800;
      opacity: 0.9;
    }
    .info-copy {
      min-width: 0;
      display: grid;
      gap: 6px;
    }
    .info-label {
      font-size: 0.68rem;
      letter-spacing: 0.22em;
      opacity: 0.58;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 1rem;
      font-weight: 600;
      color: inherit;
      word-break: break-word;
    }
    .info-link {
      text-decoration: none;
    }
    .cta {
      display: inline-flex;
      width: 100%;
      justify-content: center;
      align-items: center;
      min-height: 58px;
      padding: 14px 18px;
      border-radius: 18px;
      font-size: 1rem;
      font-weight: 700;
      text-decoration: none;
      background: var(--button-bg);
      color: var(--button-fg);
      margin-top: 4px;
    }
    .footer {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 14px;
      text-align: center;
      font-size: 0.75rem;
      line-height: 1.5;
      opacity: 0.72;
    }
    .footer a {
      color: inherit;
      font-weight: 700;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 4px;
    }
    @media (min-width: 900px) {
      body { padding: 28px; }
      .content {
        grid-template-columns: minmax(0, 1fr) 320px;
        padding: 28px 28px 20px;
        align-items: start;
      }
      .headline-block {
        display: grid;
        gap: 18px;
      }
      .profile-wrap {
        padding: 0 32px;
        margin-top: -72px;
      }
      .profile {
        width: 148px;
        height: 148px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <div class="cover">
        ${style.coverPhotoDataUrl ? `<img class="cover-image" src="${escapeHtml(style.coverPhotoDataUrl)}" alt="" />` : ''}
        ${style.frontLogoDataUrl ? `<img class="brand-mark" src="${escapeHtml(style.frontLogoDataUrl)}" alt="Brand mark" />` : ''}
      </div>
      <div class="profile-wrap">
        <div class="profile">
          ${
            style.profilePhotoDataUrl
              ? `<img src="${escapeHtml(style.profilePhotoDataUrl)}" alt="${escapeHtml(fullName)}" />`
              : profileInitial
          }
        </div>
      </div>
      <div class="content">
        <div class="headline-block">
          <div class="headline">
            <h1>${escapeHtml(fullName)}</h1>
            ${title ? `<p class="subtitle">${escapeHtml(title)}</p>` : ''}
            ${company ? `<p class="company">${escapeHtml(company)}</p>` : ''}
            ${socialButtons ? `<div class="socials">${socialButtons}</div>` : ''}
          </div>
          ${about ? `<p class="about">${escapeHtml(about)}</p>` : ''}
        </div>
        <div class="grid">
          ${infoRows}
          ${
            cta
              ? `<a class="cta" href="${escapeHtml(cta.href)}"${cta.href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''}>${escapeHtml(cta.label)}</a>`
              : ''
          }
        </div>
      </div>
      <div class="content" style="display:block;padding-top:0;">
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

const renderVcardPublicPage = (
  c: Context<AppBindings>,
  url: Url,
  vcard: Vcard,
  scansService?: ScansService,
  areaStorage?: AreaStorage
) => {
  recordPublicPageScan(c, url, scansService, areaStorage)
  const canonicalUrl = buildVcardPublicUrl(vcard)
  return c.html(buildVcardLandingHtml(vcard, canonicalUrl))
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
