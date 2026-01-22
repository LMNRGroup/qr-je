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
      responseMs: scan.responseMs,
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
      responseMs: row.responseMs ?? null,
      scannedAt: row.scannedAt.toISOString()
    }))
  }

  async deleteByUrlId(urlId: string) {
    await db.delete(scans).where(eq(scans.urlId, urlId))
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

  async getTotalForUserSince(userId: string, since: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(scans)
      .where(and(eq(scans.userId, userId), sql`${scans.scannedAt} >= ${since}`))
    return rows[0]?.count ?? 0
  }

  async getScansForUserSince(userId: string, since: string) {
    const rows = await db
      .select()
      .from(scans)
      .where(and(eq(scans.userId, userId), sql`${scans.scannedAt} >= ${since}`))
      .orderBy(desc(scans.scannedAt))

    return rows.map((row) => ({
      id: row.id,
      urlId: row.urlId,
      urlRandom: row.urlRandom,
      userId: row.userId,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      responseMs: row.responseMs ?? null,
      scannedAt: row.scannedAt.toISOString()
    }))
  }

  async getScanTimestampsForUserSince(userId: string, since: string) {
    const rows = await db
      .select({ scannedAt: scans.scannedAt })
      .from(scans)
      .where(and(eq(scans.userId, userId), sql`${scans.scannedAt} >= ${since}`))
      .orderBy(desc(scans.scannedAt))

    return rows.map((row) => row.scannedAt.toISOString())
  }

  async getDailyCountsForUserSince(userId: string, since: string, timeZone: string) {
    const dayBucket = sql<string>`date_trunc('day', ${scans.scannedAt} AT TIME ZONE ${timeZone})`
    const rows = await db
      .select({ date: dayBucket, count: sql<number>`count(*)` })
      .from(scans)
      .where(and(eq(scans.userId, userId), sql`${scans.scannedAt} >= ${new Date(since)}`))
      .groupBy(dayBucket)
      .orderBy(dayBucket)

    return rows.map((row) => ({
      date: new Date(row.date).toISOString(),
      count: row.count ?? 0
    }))
  }

  async getAverageResponseMsForUser(userId: string) {
    // Get both count and average in one query
    const rows = await db
      .select({
        count: sql<number>`count(*)`,
        avg: sql<number | null>`avg(${scans.responseMs})`
      })
      .from(scans)
      .where(and(eq(scans.userId, userId), sql`${scans.responseMs} is not null`))
    const count = rows[0]?.count ?? 0
    const avg = rows[0]?.avg ?? null
    // Only return average if we have 2 or more scans
    if (count < 2 || avg === null) return null
    return Number(avg)
  }

  async getAverageResponseMsForUserSince(userId: string, since: string) {
    // Get both count and average in one query
    const rows = await db
      .select({
        count: sql<number>`count(*)`,
        avg: sql<number | null>`avg(${scans.responseMs})`
      })
      .from(scans)
      .where(
        and(
          eq(scans.userId, userId),
          sql`${scans.responseMs} is not null`,
          sql`${scans.scannedAt} >= ${new Date(since)}`
        )
      )
    const count = rows[0]?.count ?? 0
    const avg = rows[0]?.avg ?? null
    // Only return average if we have 2 or more scans
    if (count < 2 || avg === null) return null
    return Number(avg)
  }

  async getCountsByUser(userId: string) {
    const rows = await db
      .select({
        urlId: scans.urlId,
        urlRandom: scans.urlRandom,
        count: sql<number>`count(*)`
      })
      .from(scans)
      .where(eq(scans.userId, userId))
      .groupBy(scans.urlId, scans.urlRandom)

    const result: Record<string, number> = {}
    for (const row of rows) {
      // Key format: urlId:urlRandom
      const key = `${row.urlId}:${row.urlRandom}`
      result[key] = row.count ?? 0
    }
    return result
  }
}
