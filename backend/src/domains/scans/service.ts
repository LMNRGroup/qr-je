import type { CreateScanInput, Scan } from './models'
import type { ScansStorage } from './storage/interface'

export type ScansService = {
  recordScan: (input: CreateScanInput) => Promise<Scan>
  getScanCount: (urlId: string, urlRandom: string) => Promise<number>
  getScansForUrl: (urlId: string, urlRandom: string, limit?: number) => Promise<Scan[]>
  getTotalForUser: (userId: string) => Promise<number>
  getTotalForUserToday: (userId: string, timeZone: string) => Promise<number>
}

export const createScansService = (storage: ScansStorage): ScansService => {
  const recordScan = async (input: CreateScanInput) => {
    const scan: Scan = {
      id: crypto.randomUUID(),
      urlId: input.urlId,
      urlRandom: input.urlRandom,
      userId: input.userId,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      scannedAt: input.scannedAt ?? new Date().toISOString()
    }

    await storage.recordScan(scan)
    return scan
  }

  const getScanCount = (urlId: string, urlRandom: string) => {
    return storage.getCountByUrl(urlId, urlRandom)
  }

  const getScansForUrl = (urlId: string, urlRandom: string, limit = 100) => {
    return storage.getByUrl(urlId, urlRandom, limit)
  }

  const getTotalForUser = (userId: string) => {
    return storage.getTotalForUser(userId)
  }

  const getTotalForUserToday = (userId: string, timeZone: string) => {
    return storage.getTotalForUserToday(userId, timeZone)
  }

  return {
    recordScan,
    getScanCount,
    getScansForUrl,
    getTotalForUser,
    getTotalForUserToday
  }
}
