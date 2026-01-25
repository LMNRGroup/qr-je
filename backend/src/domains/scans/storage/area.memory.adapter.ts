import type { AreaSummary, AreaScanRecord } from '../areaStore'
import type { AreaStorage } from './area.interface'

type AreaData = {
  areaId: string
  label: string
  count: number
  lastSeenAt: Date
  lat: number | null
  lon: number | null
  records: AreaScanRecord[]
}

const userAreaStores = new Map<string, Map<string, AreaData>>()

export class MemoryAreaStorageAdapter implements AreaStorage {
  async recordAreaScan(input: {
    userId: string
    areaId: string
    label: string
    city: string | null
    region: string | null
    countryCode: string | null
    lat: number | null
    lon: number | null
    ip: string | null
    userAgent: string | null
    device: string
    browser: string
    responseMs: number | null
  }) {
    let userStore = userAreaStores.get(input.userId)
    if (!userStore) {
      userStore = new Map()
      userAreaStores.set(input.userId, userStore)
    }

    const record: AreaScanRecord = {
      timestamp: new Date().toISOString(),
      ip: input.ip,
      city: input.city,
      region: input.region,
      countryCode: input.countryCode,
      device: input.device,
      browser: input.browser,
      responseMs: input.responseMs
    }

    const existing = userStore.get(input.areaId)
    if (existing) {
      existing.count += 1
      existing.lastSeenAt = new Date()
      existing.records.unshift(record)
      existing.records = existing.records.slice(0, 20)
      if (existing.lat === null || existing.lon === null) {
        existing.lat = input.lat ?? existing.lat
        existing.lon = input.lon ?? existing.lon
      }
    } else {
      userStore.set(input.areaId, {
        areaId: input.areaId,
        label: input.label,
        count: 1,
        lastSeenAt: new Date(),
        lat: input.lat,
        lon: input.lon,
        records: [record]
      })
    }
  }

  async getAreasForUser(userId: string): Promise<AreaSummary[]> {
    const userStore = userAreaStores.get(userId)
    if (!userStore) return []

    return Array.from(userStore.values()).map(area => ({
      areaId: area.areaId,
      label: area.label,
      count: area.count,
      lastSeenAt: area.lastSeenAt.toISOString(),
      recentScans: area.records,
      lat: area.lat,
      lon: area.lon
    }))
  }
}
