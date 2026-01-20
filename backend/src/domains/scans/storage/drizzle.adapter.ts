import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { scans } from '../../../infra/db/schema'
import type { Scan } from '../models'
import type { ScansStorage } from './interface'

export class DrizzleScansStorageAdapter implements ScansStorage {
  async recordScan(scan: Scan) {
    await db.insert(scans).values({
      id: scan.id,
      urlId: scan.urlId,
      urlRandom: scan.urlRandom,
      userId: scan.userId,
      ip: scan.ip,
      userAgent: scan.userAgent,
      scannedAt: new Date(scan.scannedAt)
    })
  }

  async getCountByUrl(urlId: string, urlRandom: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(scans)
      .where(and(eq(scans.urlId, urlId), eq(scans.urlRandom, urlRandom)))

    return rows[0]?.count ?? 0
  }

  async getByUrl(urlId: string, urlRandom: string, limit = 100) {
    const rows = await db
      .select()
      .from(scans)
      .where(and(eq(scans.urlId, urlId), eq(scans.urlRandom, urlRandom)))
      .orderBy(desc(scans.scannedAt))
      .limit(limit)

    return rows.map((row) => ({
      id: row.id,
      urlId: row.urlId,
      urlRandom: row.urlRandom,
      userId: row.userId,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      scannedAt: row.scannedAt.toISOString()
    }))
  }

  async getTotalForUser(userId: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(scans)
      .where(eq(scans.userId, userId))
    return rows[0]?.count ?? 0
  }

  async getTotalForUserToday(userId: string, timeZone: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(scans)
      .where(
        and(
          eq(scans.userId, userId),
          sql`${scans.scannedAt} >= (date_trunc('day', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone})`
        )
      )
    return rows[0]?.count ?? 0
  }
}
