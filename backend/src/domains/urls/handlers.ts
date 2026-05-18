import type { Context } from 'hono'

import { buildShortUrl } from '../../config/env'
import { UrlConflictError, UrlNotFoundError, UrlValidationError } from './errors'
import { UrlsService } from './service'
import type { ScansService } from '../scans/service'
import type { VcardsService } from '../vcards/service'
import type { Vcard } from '../vcards/models'
import { buildUrlResponse } from '../vcards/response'
import { isVcardKind, normalizeVcardKind } from '../vcards/kind'
import { buildPublicUrlForUrl, withStoredPublicSlug } from './public-links'
import { recordAreaScanForUser } from '../scans/areaStore'
import { lookupGeo } from '../scans/geo'
import type { AreaStorage } from '../scans/storage/area.interface'
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

      // Check if user is trying to create an Adaptive QRC
      const isAdaptiveQRC = input.kind === 'adaptive' || 
                            (input.options && typeof input.options === 'object' && 
                             'adaptive' in input.options && input.options.adaptive !== null)

      if (isAdaptiveQRC) {
        // Check if user already has an Adaptive QRC
        const userUrls = await service.getUrlsForUser(userId)
        const hasAdaptiveQRC = userUrls.some((url) => {
          if (url.kind === 'adaptive') return true
          if (url.options && typeof url.options === 'object' && 'adaptive' in url.options) {
            return url.options.adaptive !== null && url.options.adaptive !== undefined
          }
          return false
        })

        if (hasAdaptiveQRC) {
          return c.json({ 
            message: 'You can only have one Adaptive QRC™ per account. Please modify your existing Adaptive QRC™ instead.' 
          }, 409)
        }
      }

      const userUrls = await service.getUrlsForUser(userId)
      const options = withStoredPublicSlug(
        {
          id: '',
          userId,
          targetUrl: input.targetUrl,
          name: input.name ?? null,
          kind: input.kind ?? null,
          options: input.options ?? null,
        },
        userUrls
      )
      const url = await service.createUrl({ ...input, userId, options })

      return c.json(
        {
          id: url.id,
          random: url.random,
          targetUrl: url.targetUrl,
          name: url.name ?? null,
          virtualCardId: url.virtualCardId ?? null,
          shortUrl: buildShortUrl(url.id, url.random),
          publicUrl: buildPublicUrlForUrl(url),
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
  order?: number
  name?: string
  url?: string
  fileUrl?: string
  fileSize?: number
  fileType?: 'image' | 'pdf'
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
    manualOverride?: { enabled?: boolean; slot?: string }
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
  // Return fileUrl if available, otherwise url
  return match?.fileUrl ?? match?.url ?? null
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

  if (adaptive.manualOverride?.enabled) {
    const target = resolveAdaptiveSlotUrl(options, adaptive.manualOverride.slot)
    if (target) return target
  }

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
export const redirectUrlHandler = (service: UrlsService, scansService?: ScansService, areaStorage?: AreaStorage) => {
  return async (c: Context<AppBindings>) => {
    const startedAt = getNowMs()
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params) // ✅ Only blocking operation
      const ip = getClientIp(c)
      const userAgent = c.req.header('user-agent') ?? null
      const responseMs = Math.round(getNowMs() - startedAt)

      // ✅ FIRE-AND-FORGET: Don't block redirect for analytics
      Promise.all([
        // Geo lookup + area scan recording (async, non-blocking)
        areaStorage ? lookupGeo(ip)
          .then((geo) => {
            recordAreaScanForUser(areaStorage, {
              userId: url.userId,
              ip,
              userAgent,
              city: geo.city,
              region: geo.region,
              countryCode: geo.countryCode,
              lat: geo.lat,
              lon: geo.lon,
              responseMs
            }).catch((err) => console.error('[scan] failed to record area scan', err))
          })
          .catch((err) => {
            // ✅ FIX: Even if geo lookup fails, try to record with available data
            console.error('[scan] failed to lookup geo', err)
            // Record with minimal data - at least we know a scan happened
            recordAreaScanForUser(areaStorage, {
              userId: url.userId,
              ip,
              userAgent,
              city: null,
              region: null,
              countryCode: null,
              lat: null,
              lon: null,
              responseMs
            }).catch((err) => console.error('[scan] failed to record area scan (fallback)', err))
          }) : Promise.resolve(),
        
        // Scan recording (async, non-blocking)
        scansService?.recordScan({
          urlId: url.id,
          urlRandom: url.random,
          userId: url.userId,
          ip,
          userAgent,
          responseMs
        }).catch((err) => console.error('[scan] failed to record scan', err))
      ]).catch(() => {}) // Ignore all analytics errors

      // ✅ IMMEDIATE REDIRECT - Don't wait for analytics
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

const buildAdaptiveInfoPage = (url: any, options: AdaptiveOptions, currentTarget: string | null, isReturning: boolean) => {
  const adaptive = options.adaptive ?? {}
  const slots = adaptive.slots ?? []
  const qrName = url.name || 'Adaptive QRC™'
  
  // Build rules display
  let rulesHtml = ''
  
  // Visit-based rules
  if (adaptive.firstReturn?.enabled) {
    const firstSlot = slots.find((s: any) => s.id === adaptive.firstReturn?.firstSlot)
    const returnSlot = slots.find((s: any) => s.id === adaptive.firstReturn?.returnSlot)
    rulesHtml += `
      <div class="rule-item">
        <div class="rule-label">First Visit:</div>
        <div class="rule-content">${firstSlot?.name || 'Not set'}</div>
      </div>
      <div class="rule-item">
        <div class="rule-label">Returning Visit:</div>
        <div class="rule-content">${returnSlot?.name || 'Not set'}</div>
      </div>
    `
  }
  
  // Time-based rules
  if (adaptive.dateRules && adaptive.dateRules.length > 0) {
    adaptive.dateRules.forEach((rule: any, index: number) => {
      const slot = slots.find((s: any) => s.id === rule.slot)
      const timeRange = rule.startTime && rule.endTime 
        ? `${rule.startTime} - ${rule.endTime}`
        : rule.startTime || rule.endTime || 'All day'
      const days = rule.days && rule.days.length > 0 
        ? rule.days.join(', ')
        : 'Every day'
      rulesHtml += `
        <div class="rule-item">
          <div class="rule-label">Rule ${index + 1} (${days}):</div>
          <div class="rule-content">${slot?.name || 'Not set'} - ${timeRange}</div>
        </div>
      `
    })
  }
  
  // Default slot
  const defaultSlot = slots.find((s: any) => s.id === (adaptive.defaultSlot || slots[0]?.id))
  const defaultContent = defaultSlot?.name || 'Default content'
  
  // Current target - find which slot matches the current destination
  let currentContent = defaultContent
  if (currentTarget) {
    const currentSlot = slots.find((s: any) => 
      (s.url && s.url === currentTarget) || 
      (s.fileUrl && s.fileUrl === currentTarget)
    )
    if (currentSlot?.name) {
      currentContent = currentSlot.name
    }
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${qrName} - Adaptive QRC™</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0b0f14 0%, #1a1a1a 50%, #0b0f14 100%);
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      width: 100%;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .sparkles {
      font-size: 32px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #D4AF37 0%, #F7EF8A 50%, #D4AF37 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      color: rgba(212, 175, 55, 0.7);
      margin-bottom: 24px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: rgba(212, 175, 55, 0.9);
      margin-bottom: 12px;
    }
    .rule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(212, 175, 55, 0.1);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .rule-label {
      font-weight: 600;
      color: rgba(212, 175, 55, 0.9);
      font-size: 13px;
    }
    .rule-content {
      color: #e5e5e5;
      font-size: 14px;
      text-align: right;
    }
    .current-content {
      background: rgba(212, 175, 55, 0.15);
      border: 2px solid rgba(212, 175, 55, 0.4);
      padding: 16px;
      border-radius: 12px;
      margin-top: 8px;
    }
    .current-content-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: rgba(212, 175, 55, 0.7);
      margin-bottom: 8px;
    }
    .current-content-value {
      font-size: 18px;
      font-weight: 700;
      color: #D4AF37;
    }
    .default-content {
      padding: 12px 16px;
      background: rgba(100, 100, 100, 0.1);
      border: 1px solid rgba(100, 100, 100, 0.2);
      border-radius: 12px;
      margin-top: 8px;
    }
    .default-label {
      font-size: 12px;
      color: rgba(200, 200, 200, 0.7);
      margin-bottom: 4px;
    }
    .default-value {
      font-size: 14px;
      color: #e5e5e5;
    }
    .redirect-info {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(212, 175, 55, 0.2);
      color: rgba(200, 200, 200, 0.7);
      font-size: 13px;
    }
    .redirect-button {
      display: inline-block;
      margin-top: 16px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #D4AF37 0%, #F7EF8A 50%, #D4AF37 100%);
      color: #1a1a1a;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: opacity 0.2s;
    }
    .redirect-button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="sparkles">✨</div>
      <h1>${qrName}</h1>
      <div class="subtitle">Adaptive QRC™</div>
    </div>
    
    <div class="section">
      <div class="section-title">Currently Displaying</div>
      <div class="current-content">
        <div class="current-content-label">Content</div>
        <div class="current-content-value">${currentContent}</div>
      </div>
    </div>
    
    ${rulesHtml ? `
    <div class="section">
      <div class="section-title">Rules</div>
      ${rulesHtml}
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">Default Content</div>
      <div class="default-content">
        <div class="default-label">When no rules match:</div>
        <div class="default-value">${defaultContent}</div>
      </div>
    </div>
    
    <div class="redirect-info">
      <p>Redirecting to content in <span id="countdown">3</span> seconds...</p>
      <a href="${currentTarget || '#'}" class="redirect-button">Continue Now →</a>
    </div>
  </div>
  
  <script>
    let countdown = 3;
    const countdownEl = document.getElementById('countdown');
    const interval = setInterval(() => {
      countdown--;
      if (countdownEl) countdownEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(interval);
        window.location.href = '${currentTarget || '#'}';
      }
    }, 1000);
  </script>
</body>
</html>`
}

const buildAdaptiveLimitReachedPage = (url: any, scansUsed: number, limit: number) => {
  const qrName = url.name || 'Adaptive QRC™'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${qrName} - Scan Limit Reached</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #f8fafc;
      background:
        radial-gradient(circle at top left, rgba(251, 191, 36, 0.22), transparent 34%),
        radial-gradient(circle at bottom right, rgba(120, 53, 15, 0.36), transparent 30%),
        linear-gradient(135deg, #070a0f 0%, #111827 48%, #070a0f 100%);
    }
    .card {
      width: 100%;
      max-width: 560px;
      padding: 34px;
      border-radius: 28px;
      border: 1px solid rgba(251, 191, 36, 0.28);
      background: rgba(15, 23, 42, 0.86);
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.55), 0 0 40px rgba(251, 191, 36, 0.12);
      backdrop-filter: blur(18px);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 68px;
      height: 68px;
      margin-bottom: 22px;
      border-radius: 22px;
      border: 1px solid rgba(251, 191, 36, 0.38);
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(180, 83, 9, 0.14));
      color: #fbbf24;
      font-size: 34px;
      font-weight: 800;
    }
    .eyebrow {
      margin-bottom: 10px;
      color: rgba(252, 211, 77, 0.86);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.34em;
      text-transform: uppercase;
    }
    h1 {
      margin-bottom: 14px;
      font-size: clamp(30px, 7vw, 44px);
      line-height: 1;
      letter-spacing: -0.05em;
      background: linear-gradient(135deg, #fde68a 0%, #fbbf24 48%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .message {
      margin: 0 auto 24px;
      max-width: 420px;
      color: rgba(226, 232, 240, 0.78);
      font-size: 16px;
      line-height: 1.6;
    }
    .meter {
      margin: 26px 0;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(251, 191, 36, 0.2);
      background: rgba(2, 6, 23, 0.48);
      text-align: left;
    }
    .meter-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
      color: rgba(226, 232, 240, 0.72);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .bar {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.22);
    }
    .fill {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a);
      box-shadow: 0 0 22px rgba(251, 191, 36, 0.42);
    }
    .owner-note {
      margin-top: 22px;
      padding-top: 22px;
      border-top: 1px solid rgba(251, 191, 36, 0.18);
      color: rgba(226, 232, 240, 0.64);
      font-size: 13px;
      line-height: 1.55;
    }
    .brand {
      margin-top: 18px;
      color: rgba(252, 211, 77, 0.64);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <main class="card" role="main" aria-labelledby="limit-title">
    <div class="badge" aria-hidden="true">!</div>
    <div class="eyebrow">Adaptive QRC™</div>
    <h1 id="limit-title">Scan Limit Reached</h1>
    <p class="message">
      This Adaptive QRC™ has reached its monthly scan limit. Please upgrade your account to keep this QR code active.
    </p>
    <div class="meter" aria-label="Monthly scan usage">
      <div class="meter-row">
        <span>Monthly scans</span>
        <span>${scansUsed}/${limit}</span>
      </div>
      <div class="bar"><div class="fill"></div></div>
    </div>
    <p class="owner-note">
      If you own this QR code, upgrade your plan or wait until the monthly limit resets. The QR code itself does not need to be reprinted.
    </p>
    <div class="brand">QR Code Studio</div>
  </main>
</body>
</html>`
}

export const adaptiveResolveHandler = (service: UrlsService, scansService?: ScansService, areaStorage?: AreaStorage) => {
  return async (c: Context<AppBindings>) => {
    const startedAt = getNowMs()
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)
      const options = (url.options ?? {}) as AdaptiveOptions
      
      // Check scan limit for Adaptive QRC (500 scans per month)
      // Only apply limit if this is actually an Adaptive QRC
      const isAdaptiveQRC = url.kind === 'adaptive' || 
                            (url.options && typeof url.options === 'object' && 
                             'adaptive' in url.options && url.options.adaptive !== null)
      
      if (isAdaptiveQRC && scansService) {
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // ✅ Use optimized COUNT query instead of fetching all records
        const scanCount = await scansService.getCountByUrlAndDateRange(
          url.id,
          url.random,
          firstDayOfMonth,
          now
        )
        
        if (scanCount >= 500) {
          return c.html(buildAdaptiveLimitReachedPage(url, scanCount, 500), 429)
        }
      }
      
      const ip = getClientIp(c)
      const userAgent = c.req.header('user-agent') ?? null
      const tokenCookie = c.req.header('cookie')?.match(/adaptive_token=([^;]+)/)?.[1] ?? null
      const isReturning = Boolean(tokenCookie)
      if (!tokenCookie) {
        const token = crypto.randomUUID()
        c.header('Set-Cookie', `adaptive_token=${token}; Path=/; Max-Age=31536000; SameSite=Lax`)
      }
      
      const adaptiveTarget = resolveAdaptiveTarget(options, ip, isReturning)
      const destination = adaptiveTarget ?? url.targetUrl
      const responseMs = Math.round(getNowMs() - startedAt)

      // ✅ FIRE-AND-FORGET: Don't block redirect for analytics
      Promise.all([
        // Geo lookup + area scan recording (async, non-blocking)
        areaStorage ? lookupGeo(ip)
          .then((geo) => {
            recordAreaScanForUser(areaStorage, {
              userId: url.userId,
              ip,
              userAgent,
              city: geo.city,
              region: geo.region,
              countryCode: geo.countryCode,
              lat: geo.lat,
              lon: geo.lon,
              responseMs
            }).catch((err) => console.error('[scan] failed to record adaptive area scan', err))
          })
          .catch((err) => {
            // ✅ FIX: Even if geo lookup fails, try to record with available data
            console.error('[scan] failed to lookup adaptive geo', err)
            // Record with minimal data - at least we know a scan happened
            recordAreaScanForUser(areaStorage, {
              userId: url.userId,
              ip,
              userAgent,
              city: null,
              region: null,
              countryCode: null,
              lat: null,
              lon: null,
              responseMs
            }).catch((err) => console.error('[scan] failed to record adaptive area scan (fallback)', err))
          }) : Promise.resolve(),
        
        // Scan recording (async, non-blocking)
        scansService?.recordScan({
          urlId: url.id,
          urlRandom: url.random,
          userId: url.userId,
          ip,
          userAgent,
          responseMs
        }).catch((err) => console.error('[scan] failed to record adaptive scan', err))
      ]).catch(() => {}) // Ignore all analytics errors
      
      // ✅ IMMEDIATE REDIRECT - Don't wait for analytics
      // Use 307 (Temporary Redirect) instead of 302 for better performance
      // This preserves the HTTP method and is faster than 302
      return c.redirect(destination, 307)
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
        publicUrl: buildPublicUrlForUrl(url),
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

export const listUrlsHandler = (service: UrlsService, vcardsService?: VcardsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const urls = await service.getUrlsForUser(userId)
    const summary = c.req.query('summary') === '1' || c.req.query('summary') === 'true'
    const vcardMap = new Map<string, Vcard | null>()

    if (!summary && vcardsService) {
      const vcardUrls = urls.filter((url) => isVcardKind(url.kind))
      const vcardEntries = await Promise.all(
        vcardUrls.map(async (url) => [url.id, await vcardsService.getByShortId(url.id)] as const)
      )
      for (const [shortId, vcard] of vcardEntries) {
        vcardMap.set(shortId, vcard)
      }
    }

    return c.json(
      urls.map((url) =>
        summary
          ? {
              id: url.id,
              random: url.random,
              targetUrl: url.targetUrl,
              name: url.name ?? null,
              shortUrl: buildShortUrl(url.id, url.random),
              publicUrl: buildPublicUrlForUrl(url),
              createdAt: url.createdAt,
              options: null,
              kind: isVcardKind(url.kind) ? normalizeVcardKind(url.kind) : url.kind ?? null
            }
          : buildUrlResponse(url, vcardMap.get(url.id) ?? null)
      )
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

      const existing = await service.getById(id)
      if (!existing || existing.userId !== userId) {
        return c.json({ message: 'Short url not found' }, 404)
      }

      const payload = await c.req.json()
      const updates = parseUpdateUrlInput(payload)
      const userUrls = await service.getUrlsForUser(userId)
      const nextOptions = updates.options === undefined
        ? existing.options ?? null
        : updates.options
      const options = withStoredPublicSlug(
        {
          id: existing.id,
          userId,
          targetUrl: updates.targetUrl ?? existing.targetUrl,
          name: updates.name ?? existing.name ?? null,
          kind: updates.kind ?? existing.kind ?? null,
          options: nextOptions,
        },
        userUrls,
        existing.id
      )
      const url = await service.updateUrl(id, userId, { ...updates, options })

      return c.json({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        publicUrl: buildPublicUrlForUrl(url),
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
    if (isVcardKind(url.kind) && vcardsService) {
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
