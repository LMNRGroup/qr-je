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
}
