import type { Scan } from '../models'
import type { ScansStorage } from './interface'

export class InMemoryScansStorageAdapter implements ScansStorage {
  private readonly records: Scan[] = []

  async recordScan(scan: Scan) {
    this.records.push(scan)
  }

  async getCountByUrl(urlId: string, urlRandom: string) {
    return this.records.filter((scan) => scan.urlId === urlId && scan.urlRandom === urlRandom).length
  }

  async getByUrl(urlId: string, urlRandom: string, limit = 100) {
    return this.records
      .filter((scan) => scan.urlId === urlId && scan.urlRandom === urlRandom)
      .slice(0, limit)
  }

  async deleteByUrlId(urlId: string) {
    this.records = this.records.filter((scan) => scan.urlId !== urlId)
  }

  async getTotalForUser(userId: string) {
    return this.records.filter((scan) => scan.userId === userId).length
  }

  async getTotalForUserToday(userId: string, _timeZone: string) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return this.records.filter(
      (scan) => scan.userId === userId && new Date(scan.scannedAt) >= startOfDay
    ).length
  }

  async getTotalForUserSince(userId: string, since: string) {
    const sinceDate = new Date(since)
    return this.records.filter(
      (scan) => scan.userId === userId && new Date(scan.scannedAt) >= sinceDate
    ).length
  }

  async getScansForUserSince(userId: string, since: string) {
    const sinceDate = new Date(since)
    return this.records.filter(
      (scan) => scan.userId === userId && new Date(scan.scannedAt) >= sinceDate
    )
  }

  async getScanTimestampsForUserSince(userId: string, since: string) {
    const sinceDate = new Date(since)
    return this.records
      .filter((scan) => scan.userId === userId && new Date(scan.scannedAt) >= sinceDate)
      .map((scan) => scan.scannedAt)
  }

  async getDailyCountsForUserSince(userId: string, since: string, _timeZone: string) {
    const sinceDate = new Date(since)
    const counts = new Map<string, number>()
    this.records.forEach((scan) => {
      if (scan.userId !== userId) return
      const scannedAt = new Date(scan.scannedAt)
      if (scannedAt < sinceDate) return
      const key = new Date(scannedAt.getFullYear(), scannedAt.getMonth(), scannedAt.getDate()).toISOString()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, count]) => ({ date, count }))
  }

  async getAverageResponseMsForUser(userId: string) {
    const values = this.records
      .filter((scan) => scan.userId === userId && typeof scan.responseMs === 'number')
      .map((scan) => scan.responseMs as number)
    // Only calculate average if we have 2 or more scans
    if (values.length < 2) return null
    const total = values.reduce((sum, value) => sum + value, 0)
    return total / values.length
  }

  async getAverageResponseMsForUserSince(userId: string, since: string) {
    const sinceDate = new Date(since)
    const values = this.records
      .filter(
        (scan) =>
          scan.userId === userId &&
          typeof scan.responseMs === 'number' &&
          new Date(scan.scannedAt) >= sinceDate
      )
      .map((scan) => scan.responseMs as number)
    // Only calculate average if we have 2 or more scans
    if (values.length < 2) return null
    const total = values.reduce((sum, value) => sum + value, 0)
    return total / values.length
  }

  async getCountsByUser(userId: string) {
    const counts = new Map<string, number>()
    this.records.forEach((scan) => {
      if (scan.userId !== userId) return
      const key = `${scan.urlId}:${scan.urlRandom}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Object.fromEntries(counts)
  }
}
