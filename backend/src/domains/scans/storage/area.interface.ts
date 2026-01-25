import type { AreaSummary } from '../areaStore'

export type AreaStorage = {
  recordAreaScan: (input: {
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
  }) => Promise<void>
  getAreasForUser: (userId: string) => Promise<AreaSummary[]>
}
