import type { Scan } from '../models'

export type ScansStorage = {
  recordScan: (scan: Scan) => Promise<void>
  getCountByUrl: (urlId: string, urlRandom: string) => Promise<number>
  getByUrl: (urlId: string, urlRandom: string, limit?: number) => Promise<Scan[]>
  getTotalForUser: (userId: string) => Promise<number>
  getTotalForUserToday: (userId: string, timeZone: string) => Promise<number>
}
