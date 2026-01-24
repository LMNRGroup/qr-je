import type { Context } from 'hono'

import { buildShortUrl } from '../../config/env'
import { UrlConflictError, UrlNotFoundError, UrlValidationError } from './errors'
import { UrlsService } from './service'
import type { ScansService } from '../scans/service'
import type { VcardsService } from '../vcards/service'
import { recordAreaScanForUser } from '../scans/areaStore'
import { lookupGeo } from '../scans/geo'
import { parseCreateUrlInput, parseResolveParams, parseUpdateUrlInput } from './validators'
import type { AppBindings } from '../../shared/http/types'

export const createUrlHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const payload = await c.req.json()
      const input = parseCreateUrlInput(payload)
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const url = await service.createUrl({ ...input, userId })

      return c.json(
        {
          id: url.id,
          random: url.random,
          targetUrl: url.targetUrl,
          name: url.name ?? null,
          virtualCardId: url.virtualCardId ?? null,
          shortUrl: buildShortUrl(url.id, url.random),
          createdAt: url.createdAt,
          options: url.options ?? null,
          kind: url.kind ?? null
        },
        201
      )
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlConflictError) {
        return c.json({ message: error.message }, 409)
      }

      throw error
    }
  }
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

type AdaptiveSlot = {
  id: string
  url?: string
}

type AdaptiveRule = {
  slot?: string
  startDate?: string
  endDate?: string
  days?: string[]
  startTime?: string
  endTime?: string
}

type AdaptiveOptions = {
  adaptive?: {
    slots?: AdaptiveSlot[]
    defaultSlot?: string
    dateRules?: AdaptiveRule[]
    firstReturn?: { enabled?: boolean; firstSlot?: string; returnSlot?: string }
    admin?: { enabled?: boolean; ips?: string[]; slot?: string }
    timezone?: string
  }
  adaptiveSlots?: AdaptiveSlot[]
  adaptiveDefaultSlot?: string
  adaptiveDateRules?: AdaptiveRule[]
  adaptiveFirstReturnEnabled?: boolean
  adaptiveFirstSlot?: string
  adaptiveReturnSlot?: string
  adaptiveAdminEnabled?: boolean
  adaptiveAdminIps?: string[]
  adaptiveAdminSlot?: string
  timezone?: string
}

const resolveAdaptiveSlotUrl = (options: AdaptiveOptions, slotId: string | undefined) => {
  if (!slotId) return null
  const slots = options.adaptive?.slots ?? options.adaptiveSlots ?? []
  const match = slots.find((slot) => slot.id === slotId)
  return match?.url ?? null
}

const parseTimeRange = (time?: string) => {
  if (!time) return null
  const [hour, minute] = time.split(':').map((value) => Number.parseInt(value, 10))
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return hour * 60 + minute
}

const getZonedNow = (timezone?: string) => {
  const zone = timezone || 'UTC'
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short'
  })
  const parts = formatter.formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const month = Number.parseInt(get('month'), 10)
  const day = Number.parseInt(get('day'), 10)
  const year = Number.parseInt(get('year'), 10)
  const hour = Number.parseInt(get('hour'), 10)
  const minute = Number.parseInt(get('minute'), 10)
  const weekday = get('weekday')
  return { year, month, day, hour, minute, weekday }
}

const dayMatches = (ruleDays: string[] | undefined, weekday: string) => {
  if (!ruleDays || ruleDays.length === 0) return true
  return ruleDays.some((day) => day.toLowerCase().startsWith(weekday.toLowerCase().slice(0, 3)))
}

const dateMatches = (rule: AdaptiveRule, today: Date) => {
  if (!rule.startDate && !rule.endDate) return true
  const start = rule.startDate ? new Date(rule.startDate) : null
  const end = rule.endDate ? new Date(rule.endDate) : null
  if (start && Number.isNaN(start.getTime())) return false
  if (end && Number.isNaN(end.getTime())) return false
  if (start && today < start) return false
  if (end && today > end) return false
  return true
}

const timeMatches = (rule: AdaptiveRule, minutes: number) => {
  const start = parseTimeRange(rule.startTime)
  const end = parseTimeRange(rule.endTime)
  if (start === null && end === null) return true
  if (start !== null && minutes < start) return false
  if (end !== null && minutes > end) return false
  return true
}

const resolveAdaptiveTarget = (options: AdaptiveOptions, ip: string | null, isReturning: boolean) => {
  const adaptive = options.adaptive ?? {}
  const timezone = adaptive.timezone ?? options.timezone
  const { year, month, day, hour, minute, weekday } = getZonedNow(timezone)
  const nowDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const nowMinutes = hour * 60 + minute

  const adminEnabled = adaptive.admin?.enabled ?? options.adaptiveAdminEnabled ?? false
  const adminIps = adaptive.admin?.ips ?? options.adaptiveAdminIps ?? []
  if (adminEnabled && ip && adminIps.includes(ip)) {
    const slotId = adaptive.admin?.slot ?? options.adaptiveAdminSlot
    return resolveAdaptiveSlotUrl(options, slotId)
  }

  const firstReturnEnabled = adaptive.firstReturn?.enabled ?? options.adaptiveFirstReturnEnabled ?? false
  if (firstReturnEnabled) {
    const slotId = isReturning
      ? adaptive.firstReturn?.returnSlot ?? options.adaptiveReturnSlot
      : adaptive.firstReturn?.firstSlot ?? options.adaptiveFirstSlot
    const target = resolveAdaptiveSlotUrl(options, slotId)
    if (target) return target
  }

  const rules = adaptive.dateRules ?? options.adaptiveDateRules ?? []
  for (const rule of rules) {
    if (!dayMatches(rule.days, weekday)) continue
    if (!dateMatches(rule, nowDate)) continue
    if (!timeMatches(rule, nowMinutes)) continue
    const target = resolveAdaptiveSlotUrl(options, rule.slot)
    if (target) return target
  }

  const defaultSlot = adaptive.defaultSlot ?? options.adaptiveDefaultSlot
  return resolveAdaptiveSlotUrl(options, defaultSlot)
}
export const redirectUrlHandler = (service: UrlsService, scansService?: ScansService) => {
  return async (c: Context<AppBindings>) => {
    const startedAt = getNowMs()
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)
      const ip = getClientIp(c)
      const userAgent = c.req.header('user-agent') ?? null
      let geo = { city: null, region: null, countryCode: null, lat: null, lon: null }
      try {
        geo = await lookupGeo(ip)
      } catch (areaError) {
        console.error('[scan] failed to lookup geo', areaError)
      }

      const responseMs = Math.round(getNowMs() - startedAt)
      try {
        recordAreaScanForUser({
          userId: url.userId,
          ip,
          userAgent,
          city: geo.city,
          region: geo.region,
          countryCode: geo.countryCode,
          lat: geo.lat,
          lon: geo.lon,
          responseMs
        })
      } catch (areaError) {
        console.error('[scan] failed to record area scan', areaError)
      }
      if (scansService) {
        Promise.resolve(
          scansService.recordScan({
            urlId: url.id,
            urlRandom: url.random,
            userId: url.userId,
            ip,
            userAgent,
            responseMs
          })
        ).catch((scanError) => {
          console.error('[scan] failed to record scan', scanError)
        })
      }

      return c.redirect(url.targetUrl, 302)
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}

export const adaptiveResolveHandler = (service: UrlsService, scansService?: ScansService) => {
  return async (c: Context<AppBindings>) => {
    const startedAt = getNowMs()
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)
      const options = (url.options ?? {}) as AdaptiveOptions
      const ip = getClientIp(c)
      const userAgent = c.req.header('user-agent') ?? null
      const tokenCookie = c.req.header('cookie')?.match(/adaptive_token=([^;]+)/)?.[1] ?? null
      const isReturning = Boolean(tokenCookie)
      if (!tokenCookie) {
        const token = crypto.randomUUID()
        c.header('Set-Cookie', `adaptive_token=${token}; Path=/; Max-Age=31536000; SameSite=Lax`)
      }
      let geo = { city: null, region: null, countryCode: null, lat: null, lon: null }
      try {
        geo = await lookupGeo(ip)
      } catch (areaError) {
        console.error('[scan] failed to lookup adaptive geo', areaError)
      }
      const adaptiveTarget = resolveAdaptiveTarget(options, ip, isReturning)
      const destination = adaptiveTarget ?? url.targetUrl
      const responseMs = Math.round(getNowMs() - startedAt)
      try {
        recordAreaScanForUser({
          userId: url.userId,
          ip,
          userAgent,
          city: geo.city,
          region: geo.region,
          countryCode: geo.countryCode,
          lat: geo.lat,
          lon: geo.lon,
          responseMs
        })
      } catch (areaError) {
        console.error('[scan] failed to record adaptive area scan', areaError)
      }
      if (scansService) {
        Promise.resolve(
          scansService.recordScan({
            urlId: url.id,
            urlRandom: url.random,
            userId: url.userId,
            ip,
            userAgent,
            responseMs
          })
        ).catch((scanError) => {
          console.error('[scan] failed to record adaptive scan', scanError)
        })
      }
      return c.redirect(destination, 302)
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}
export const publicUrlDetailsHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)
      return c.json({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        createdAt: url.createdAt,
        options: url.options ?? null,
        kind: url.kind ?? null
      })
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}

export const listUrlsHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const urls = await service.getUrlsForUser(userId)
    const summary = c.req.query('summary') === '1' || c.req.query('summary') === 'true'
    return c.json(
      urls.map((url) => ({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        createdAt: url.createdAt,
        options: summary ? null : url.options ?? null,
        kind: url.kind ?? null
      }))
    )
  }
}

export const updateUrlHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const id = c.req.param('id')
      if (!id) {
        return c.json({ message: 'id is required' }, 400)
      }

      const payload = await c.req.json()
      const updates = parseUpdateUrlInput(payload)
      const url = await service.updateUrl(id, userId, updates)

      return c.json({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        createdAt: url.createdAt,
        options: url.options ?? null,
        kind: url.kind ?? null
      })
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}

// Helper to extract file paths from URL options and delete from Supabase storage
const deleteStorageFiles = async (options: Record<string, unknown> | null | undefined) => {
  if (!options) return

  const SUPABASE_PROJECT_URL = process.env.SUPABASE_PROJECT_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_PROJECT_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[storage] Supabase not configured, skipping file cleanup')
    return
  }

  const filesToDelete: string[] = []

  // Extract file URLs from different QR types
  if (options.menuFiles && Array.isArray(options.menuFiles)) {
    // Menu files: array of { url: string, type: string }
    for (const file of options.menuFiles) {
      if (file && typeof file === 'object' && 'url' in file && typeof file.url === 'string') {
        filesToDelete.push(file.url)
      }
    }
  }

  if (options.menuLogo && typeof options.menuLogo === 'string') {
    filesToDelete.push(options.menuLogo)
  }

  if (options.fileUrl && typeof options.fileUrl === 'string') {
    filesToDelete.push(options.fileUrl)
  }

  if (options.photo && typeof options.photo === 'string') {
    filesToDelete.push(options.photo)
  }

  // Delete files from Supabase storage
  for (const fileUrl of filesToDelete) {
    try {
      // Extract path from Supabase public URL
      // Format: https://{project}.supabase.co/storage/v1/object/public/qr-assets/{path}
      const urlMatch = fileUrl.match(/\/storage\/v1\/object\/public\/qr-assets\/(.+)$/)
      if (!urlMatch) continue

      const filePath = urlMatch[1]
      const storageUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/qr-assets/${filePath}`

      const response = await fetch(storageUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        }
      })

      if (!response.ok && response.status !== 404) {
        console.error(`[storage] Failed to delete file ${filePath}:`, response.status, response.statusText)
      }
    } catch (error) {
      console.error(`[storage] Error deleting file ${fileUrl}:`, error)
    }
  }
}

export const deleteUrlHandler = (
  service: UrlsService,
  scansService?: ScansService,
  vcardsService?: VcardsService
) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const id = c.req.param('id')
    if (!id) {
      return c.json({ message: 'id is required' }, 400)
    }

    // Get URL record first to extract file paths
    const url = await service.getById(id)
    if (!url) {
      return c.json({ message: 'URL not found' }, 404)
    }

    // Check ownership
    if (url.userId !== userId) {
      return c.json({ message: 'Forbidden' }, 403)
    }

    // Delete associated scans
    if (scansService) {
      try {
        await scansService.deleteByUrlId(id)
      } catch (error) {
        console.error('[scan] failed to delete scans', error)
      }
    }

    // Delete storage files (menu files, logos, file QRCs, vCard photos)
    try {
      await deleteStorageFiles(url.options)
    } catch (error) {
      console.error('[storage] failed to delete storage files', error)
      // Continue with URL deletion even if storage cleanup fails
    }

    // If this is a vCard QR, delete the associated vCard record
    if (url.kind === 'vcard' && vcardsService) {
      try {
        const vcard = await vcardsService.getByShortId(id)
        if (vcard) {
          await vcardsService.deleteById(vcard.id)
          console.info(`[vcard] Deleted vCard ${vcard.id} associated with URL ${id}`)
        }
      } catch (error) {
        console.error('[vcard] failed to delete vCard', error)
        // Continue with URL deletion even if vCard cleanup fails
      }
    }

    // Delete URL record
    await service.deleteUrl(id)
    return c.json({ success: true })
  }
}
