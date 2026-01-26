export type AreaScanRecord = {
  timestamp: string
  ip: string | null
  city: string | null
  region: string | null
  countryCode: string | null
  device: string
  browser: string
  responseMs: number | null
}

export type AreaSummary = {
  areaId: string
  label: string
  count: number
  lastSeenAt: string
  recentScans: AreaScanRecord[]
  lat: number | null
  lon: number | null
}

// Removed in-memory store - now using database storage
const PR_CENTER = { lat: 18.2208, lon: -66.5901 }
const COUNTRY_FALLBACKS: Record<string, { lat: number; lon: number; label: string }> = {
  US: { lat: 39.8283, lon: -98.5795, label: 'United States' },
  MX: { lat: 23.6345, lon: -102.5528, label: 'Mexico' },
  BR: { lat: -14.235, lon: -51.9253, label: 'Brazil' },
  AR: { lat: -38.4161, lon: -63.6167, label: 'Argentina' },
  CO: { lat: 4.5709, lon: -74.2973, label: 'Colombia' },
  CA: { lat: 56.1304, lon: -106.3468, label: 'Canada' },
  ES: { lat: 40.4637, lon: -3.7492, label: 'Spain' },
  FR: { lat: 46.2276, lon: 2.2137, label: 'France' },
  GB: { lat: 55.3781, lon: -3.436, label: 'United Kingdom' },
  DE: { lat: 51.1657, lon: 10.4515, label: 'Germany' }
}

// Removed getStoreForUser - now using database storage

const maskIp = (ip: string | null) => {
  if (!ip) return null
  if (ip.includes(':')) {
    const chunks = ip.split(':').filter(Boolean)
    if (chunks.length <= 2) return 'xxxx:xxxx'
    return `xxxx:xxxx:${chunks.slice(-2).join(':')}`
  }
  const parts = ip.split('.')
  if (parts.length !== 4) return 'xxx.xxx.xxx.xxx'
  return `xxx.xxx.${parts[2]}.${parts[3]}`
}

const summarizeUserAgent = (ua: string | null) => {
  const value = (ua ?? '').toLowerCase()
  let device = 'Desktop'
  if (value.includes('ipad') || value.includes('tablet')) device = 'Tablet'
  if (value.includes('mobi') || value.includes('iphone') || value.includes('android')) device = 'Mobile'

  let browser = 'Unknown'
  if (value.includes('edg')) browser = 'Edge'
  else if (value.includes('chrome')) browser = 'Chrome'
  else if (value.includes('firefox')) browser = 'Firefox'
  else if (value.includes('safari')) browser = 'Safari'

  return { device, browser }
}

const resolveAreaId = (countryCode: string | null, region: string | null) => {
  // Check region first for PR (since IP geolocation often returns US for PR)
  if (region) {
    const regionUpper = region.toUpperCase()
    if (regionUpper === 'PR' || regionUpper === 'PUERTO RICO') {
      return 'PR'
    }
  }
  // Then check countryCode
  if (!countryCode) return 'UNKNOWN'
  if (countryCode.toUpperCase() === 'PR') return 'PR'
  return countryCode.toUpperCase()
}

const resolveAreaLabel = (areaId: string) => {
  if (areaId === 'PR') return 'Puerto Rico'
  return COUNTRY_FALLBACKS[areaId]?.label ?? areaId
}

const resolveAreaLatLon = (
  areaId: string,
  lat: number | null,
  lon: number | null
): { lat: number | null; lon: number | null } => {
  if (areaId === 'PR') return PR_CENTER
  if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon }
  const fallback = COUNTRY_FALLBACKS[areaId]
  if (fallback) return { lat: fallback.lat, lon: fallback.lon }
  return { lat: null, lon: null }
}

import type { AreaStorage } from './storage/area.interface'

export const recordAreaScanForUser = async (
  areaStorage: AreaStorage,
  input: {
  userId: string
  ip: string | null
  userAgent: string | null
  city: string | null
  region: string | null
  countryCode: string | null
  lat: number | null
  lon: number | null
  responseMs: number | null
  }
) => {
  // ✅ FIX: Check both region and countryCode for PR detection
  const areaId = resolveAreaId(input.countryCode, input.region)
  const { device, browser } = summarizeUserAgent(input.userAgent)
  const label = resolveAreaLabel(areaId)
  const resolved = resolveAreaLatLon(areaId, input.lat, input.lon)

  await areaStorage.recordAreaScan({
    userId: input.userId,
    areaId,
    label,
    city: input.city,
    region: input.region,
    countryCode: input.countryCode,
    lat: resolved.lat,
    lon: resolved.lon,
    ip: maskIp(input.ip),
    userAgent: input.userAgent,
    device,
    browser,
    responseMs: input.responseMs
  })
}

export const getAreasForUser = async (areaStorage: AreaStorage, userId: string) => {
  return await areaStorage.getAreasForUser(userId)
}
