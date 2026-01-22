import type { Context } from 'hono'

import type { ScansService } from './service'
import { getAreasForUser } from './areaStore'
import type { UrlsService } from '../urls/service'
import type { AppBindings } from '../../shared/http/types'
import { parseResolveParams } from '../urls/validators'
import { UrlValidationError, UrlNotFoundError } from '../urls/errors'

const getZonedStartOfDay = (timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const year = Number.parseInt(get('year'), 10)
  const month = Number.parseInt(get('month'), 10)
  const day = Number.parseInt(get('day'), 10)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString()
}

const parseRange = (value?: string | null) => {
  switch (value) {
    case 'today':
    case '7d':
    case '30d':
    case 'all':
      return value
    default:
      return 'all'
  }
}

const getDateKeyInZone = (value: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(value)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export const getScanCountHandler = (scansService: ScansService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      const params = parseResolveParams(c.req.param())
      const url = await urlsService.resolveUrl(params)

      if (url.userId !== userId) {
        return c.json({ message: 'Not found' }, 404)
      }

      const count = await scansService.getScanCount(url.id, url.random)
      return c.json({ count })
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

export const listScansHandler = (scansService: ScansService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      const params = parseResolveParams(c.req.param())
      const url = await urlsService.resolveUrl(params)

      if (url.userId !== userId) {
        return c.json({ message: 'Not found' }, 404)
      }

      const scans = await scansService.getScansForUrl(url.id, url.random, 100)
      return c.json(scans)
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

export const getUserScanSummaryHandler = (scansService: ScansService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const timeZone = c.req.query('tz') || 'UTC'
    const range = parseRange(c.req.query('range'))
    const total = await scansService.getTotalForUser(userId)
    const today = await scansService.getTotalForUserToday(userId, timeZone)

    let rangeTotal = total
    let avgResponseMs: number | null = null
    try {
      avgResponseMs = await scansService.getAverageResponseMsForUser(userId)
    } catch (error) {
      console.error('[scans] failed to load avg response time', error)
    }

    if (range === 'today') {
      rangeTotal = today
      try {
        avgResponseMs = await scansService.getAverageResponseMsForUserSince(
          userId,
          getZonedStartOfDay(timeZone)
        )
      } catch (error) {
        console.error('[scans] failed to load avg response time', error)
        avgResponseMs = null
      }
    } else if (range === '7d' || range === '30d') {
      const days = range === '7d' ? 7 : 30
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      rangeTotal = await scansService.getTotalForUserSince(userId, since)
      try {
        avgResponseMs = await scansService.getAverageResponseMsForUserSince(userId, since)
      } catch (error) {
        console.error('[scans] failed to load avg response time', error)
        avgResponseMs = null
      }
    }

    return c.json({ total, today, range, rangeTotal, avgResponseMs })
  }
}

export const getUserScanTrendsHandler = (scansService: ScansService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const timeZone = c.req.query('tz') || 'UTC'
      const daysRaw = c.req.query('days')
      const days = Math.min(30, Math.max(1, Number.parseInt(daysRaw ?? '7', 10) || 7))
      const todayStart = new Date(getZonedStartOfDay(timeZone))
      const startDate = new Date(todayStart)
      startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
      const since = startDate.toISOString()

      const timestamps = await scansService.getScanTimestampsForUserSince(userId, since)
      const map = new Map<string, number>()
      timestamps.forEach((timestamp) => {
        const key = getDateKeyInZone(new Date(String(timestamp)), timeZone)
        map.set(key, (map.get(key) ?? 0) + 1)
      })
      const points = Array.from({ length: days }, (_, index) => {
        const date = new Date(startDate)
        date.setUTCDate(startDate.getUTCDate() + index)
        const key = getDateKeyInZone(date, timeZone)
        return { date: date.toISOString(), count: map.get(key) ?? 0 }
      })

      return c.json({ days, points })
    } catch (error) {
      console.error('[scans] trends failed', error)
      const baseDetail = error instanceof Error ? error.message : String(error)
      const cause = (error as { cause?: { message?: string } } | null)?.cause?.message
      const detail = cause ? `${baseDetail}\n${cause}` : baseDetail
      return c.json({ message: 'Failed to load scan trends', detail }, 500)
    }
  }
}

export const getScanAreasHandler = () => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    return c.json(getAreasForUser(userId))
  }
}

export const getUserScanCountsHandler = (scansService: ScansService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      const counts = await scansService.getCountsByUser(userId)
      return c.json({ counts })
    } catch (error) {
      console.error('[scans] failed to load counts', error)
      return c.json({ message: 'Failed to load scan counts' }, 500)
    }
  }
}
