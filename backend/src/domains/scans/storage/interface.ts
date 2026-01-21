import type { Scan } from '../models'

export type ScansStorage = {
  recordScan: (scan: Scan) => Promise<void>
  getCountByUrl: (urlId: string, urlRandom: string) => Promise<number>
  getByUrl: (urlId: string, urlRandom: string, limit?: number) => Promise<Scan[]>
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
