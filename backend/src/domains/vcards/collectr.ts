import type { Context } from 'hono'

import type { AppBindings } from '../../shared/http/types'

const COLLECTR_HOST = 'app.getcollectr.com'
const COLLECTR_SHOWCASE_PREFIX = '/showcase/profile/'
const DEFAULT_LIMIT = 5
const MAX_LIMIT = 8

type CollectrPortfolioValueRecord = {
  price?: string | null
}

type CollectrProductRecord = {
  product_id?: string | null
  catalog_group?: string | null
  catalog_category_name?: string | null
  product_name?: string | null
  image_url?: string | null
  card_number?: string | null
  rarity?: string | null
  quantity?: string | null
  market_price?: string | null
  market_price_diff?: string | null
  market_price_percentage_diff?: string | null
  is_card?: boolean
}

type CollectrBadgeRecord = {
  badgeText?: string | null
}

type CollectrProfileBackgroundRecord = {
  imageUrl?: string | null
  hex?: string | null
}

type CollectrPagePayload = {
  user?: string | null
  handle?: string | null
  profile_photo?: string | null
  total_cards?: string | null
  total_sealed?: string | null
  total_graded?: string | null
  total_followers?: string | null
  total_following?: string | null
  portfolio_value?: CollectrPortfolioValueRecord[] | null
  products?: CollectrProductRecord[] | null
  badges?: CollectrBadgeRecord[] | null
  profileBackground?: CollectrProfileBackgroundRecord | null
}

export type CollectrPreviewCard = {
  id: string
  name: string
  imageUrl: string
  setName: string
  categoryName: string
  cardNumber: string
  rarity: string
  quantity: number
  marketPrice: number | null
  priceDelta: number | null
  priceDeltaPercent: number | null
  isCard: boolean
}

export type CollectrShowcasePreview = {
  sourceUrl: string
  profileId: string
  profile: {
    displayName: string
    handle: string
    profilePhotoUrl: string
    backgroundImageUrl: string
    badgeText: string
    totalCards: number
    totalSealed: number
    totalGraded: number
    totalFollowers: number
    totalFollowing: number
    portfolioValue: number | null
  }
  cards: CollectrPreviewCard[]
}

const normalizeText = (value?: string | null) => value?.trim() ?? ''

const parseInteger = (value?: string | null) => {
  const parsed = Number.parseInt(normalizeText(value), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseNumber = (value?: string | null) => {
  const parsed = Number.parseFloat(normalizeText(value))
  return Number.isFinite(parsed) ? parsed : null
}

const clampLimit = (value?: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(parsed, MAX_LIMIT))
}

const decodeNextFlightPayload = (html: string) => {
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g
  let match: RegExpExecArray | null
  let payload = ''

  while ((match = regex.exec(html))) {
    payload += JSON.parse(`"${match[1]}"`)
  }

  return payload
}

const extractBalancedObject = (source: string, startIndex: number) => {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

export const normalizeCollectrProfileId = (input?: string | null) => {
  const trimmed = normalizeText(input)
  if (!trimmed) return null

  try {
    const parsedUrl = new URL(trimmed)
    if (parsedUrl.hostname !== COLLECTR_HOST) return null
    if (!parsedUrl.pathname.startsWith(COLLECTR_SHOWCASE_PREFIX)) return null
    const slug = decodeURIComponent(parsedUrl.pathname.slice(COLLECTR_SHOWCASE_PREFIX.length))
      .replace(/^@/, '')
      .split('/')[0]
      ?.trim()
    return slug || null
  } catch {
    const cleaned = trimmed
      .replace(/^@/, '')
      .replace(/^showcase\/profile\//, '')
      .trim()
    return cleaned || null
  }
}

export const buildCollectrShowcaseUrl = (profileId: string) =>
  `https://${COLLECTR_HOST}/showcase/profile/@${encodeURIComponent(profileId)}`

export const extractCollectrShowcasePreview = (html: string, sourceUrl: string, limit = DEFAULT_LIMIT): CollectrShowcasePreview | null => {
  const payload = decodeNextFlightPayload(html)
  const queryMarker = '"queryKey":["showcase","getShowcaseProfile"'
  const queryIndex = payload.indexOf(queryMarker)
  if (queryIndex === -1) {
    return null
  }

  const pagesIndex = payload.lastIndexOf('"pages":[', queryIndex)
  if (pagesIndex === -1) {
    return null
  }

  const objectStart = payload.indexOf('{', pagesIndex)
  if (objectStart === -1) {
    return null
  }

  const rawObject = extractBalancedObject(payload, objectStart)
  if (!rawObject) {
    return null
  }

  const parsed = JSON.parse(rawObject) as CollectrPagePayload
  const profileId = normalizeCollectrProfileId(sourceUrl)
  if (!profileId) {
    return null
  }

  const cards = (parsed.products ?? [])
    .filter((product) => normalizeText(product.image_url) && normalizeText(product.product_name))
    .slice(0, limit)
    .map((product) => ({
      id: normalizeText(product.product_id) || crypto.randomUUID(),
      name: normalizeText(product.product_name),
      imageUrl: normalizeText(product.image_url),
      setName: normalizeText(product.catalog_group),
      categoryName: normalizeText(product.catalog_category_name),
      cardNumber: normalizeText(product.card_number),
      rarity: normalizeText(product.rarity),
      quantity: Math.max(1, parseInteger(product.quantity)),
      marketPrice: parseNumber(product.market_price),
      priceDelta: parseNumber(product.market_price_diff),
      priceDeltaPercent: parseNumber(product.market_price_percentage_diff),
      isCard: Boolean(product.is_card),
    }))

  if (!cards.length) {
    return null
  }

  return {
    sourceUrl,
    profileId,
    profile: {
      displayName: normalizeText(parsed.user),
      handle: normalizeText(parsed.handle),
      profilePhotoUrl: normalizeText(parsed.profile_photo),
      backgroundImageUrl: normalizeText(parsed.profileBackground?.imageUrl),
      badgeText: normalizeText(parsed.badges?.[0]?.badgeText),
      totalCards: parseInteger(parsed.total_cards),
      totalSealed: parseInteger(parsed.total_sealed),
      totalGraded: parseInteger(parsed.total_graded),
      totalFollowers: parseInteger(parsed.total_followers),
      totalFollowing: parseInteger(parsed.total_following),
      portfolioValue: parseNumber(parsed.portfolio_value?.[0]?.price),
    },
    cards,
  }
}

export const fetchCollectrShowcasePreview = async (input: string, limit = DEFAULT_LIMIT) => {
  const profileId = normalizeCollectrProfileId(input)
  if (!profileId) {
    return null
  }

  const sourceUrl = buildCollectrShowcaseUrl(profileId)
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; QRCodeStudio/1.0; +https://qrcode.luminarapps.com)',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!response.ok) {
    throw new Error(`Collectr request failed with ${response.status}`)
  }

  const html = await response.text()
  return extractCollectrShowcasePreview(html, sourceUrl, limit)
}

export const publicCollectrPreviewHandler = () => {
  return async (c: Context<AppBindings>) => {
    const input = c.req.query('url') ?? c.req.query('profile') ?? ''
    const limit = clampLimit(c.req.query('limit'))

    if (!input) {
      return c.json({ message: 'Collectr url or profile is required' }, 400)
    }

    const profileId = normalizeCollectrProfileId(input)
    if (!profileId) {
      return c.json({ message: 'Invalid Collectr showcase url' }, 400)
    }

    try {
      const preview = await fetchCollectrShowcasePreview(profileId, limit)
      if (!preview) {
        return c.json({ message: 'Unable to parse Collectr showcase' }, 502)
      }

      return c.json(preview)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown Collectr error'
      console.error('[collectr] preview failed', reason)
      return c.json({ message: 'Failed to load Collectr showcase', reason }, 502)
    }
  }
}
