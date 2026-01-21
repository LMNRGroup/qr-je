import type { CreateScanInput, Scan } from './models'
import type { ScansStorage } from './storage/interface'

export type ScansService = {
  recordScan: (input: CreateScanInput) => Promise<Scan>
  getScanCount: (urlId: string, urlRandom: string) => Promise<number>
  getScansForUrl: (urlId: string, urlRandom: string, limit?: number) => Promise<Scan[]>
  deleteByUrlId: (urlId: string) => Promise<void>
  getTotalForUser: (userId: string) => Promise<number>
  getTotalForUserToday: (userId: string, timeZone: string) => Promise<number>
  getTotalForUserSince: (userId: string, since: string) => Promise<number>
  getScansForUserSince: (userId: string, since: string) => Promise<Scan[]>
  getScanTimestampsForUserSince: (userId: string, since: string) => Promise<string[]>
  getDailyCountsForUserSince: (
    userId: string,
    since: string,
    timeZone: string
  ) => Promise<Array<{ date: string; count: number }>>
  getAverageResponseMsForUser: (userId: string) => Promise<number | null>
  getAverageResponseMsForUserSince: (userId: string, since: string) => Promise<number | null>
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
      responseMs: input.responseMs ?? null,
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

  const deleteByUrlId = (urlId: string) => {
    return storage.deleteByUrlId(urlId)
  }

  const getTotalForUser = (userId: string) => {
    return storage.getTotalForUser(userId)
  }

  const getTotalForUserToday = (userId: string, timeZone: string) => {
    return storage.getTotalForUserToday(userId, timeZone)
  }

  const getTotalForUserSince = (userId: string, since: string) => {
    return storage.getTotalForUserSince(userId, since)
  }

  const getScansForUserSince = (userId: string, since: string) => {
    return storage.getScansForUserSince(userId, since)
  }

  const getScanTimestampsForUserSince = (userId: string, since: string) => {
    return storage.getScanTimestampsForUserSince(userId, since)
  }

  const getDailyCountsForUserSince = (userId: string, since: string, timeZone: string) => {
    return storage.getDailyCountsForUserSince(userId, since, timeZone)
  }

  const getAverageResponseMsForUser = (userId: string) => {
    return storage.getAverageResponseMsForUser(userId)
  }

  const getAverageResponseMsForUserSince = (userId: string, since: string) => {
    return storage.getAverageResponseMsForUserSince(userId, since)
  }

  return {
    recordScan,
    getScanCount,
    getScansForUrl,
    deleteByUrlId,
    getTotalForUser,
    getTotalForUserToday,
    getTotalForUserSince,
    getScansForUserSince,
    getScanTimestampsForUserSince,
    getDailyCountsForUserSince,
    getAverageResponseMsForUser,
    getAverageResponseMsForUserSince
  }
}
