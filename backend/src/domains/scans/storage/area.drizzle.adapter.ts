import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../../infra/db/postgres.db'
import { scanAreas, scanAreaRecords } from '../../../infra/db/schema'
import type { AreaSummary, AreaScanRecord } from '../areaStore'
import type { AreaStorage } from './area.interface'

export class DrizzleAreaStorageAdapter implements AreaStorage {
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
    const now = new Date()
    const recordId = crypto.randomUUID()
    
    // Insert or update area summary
    const existing = await db
      .select()
      .from(scanAreas)
      .where(and(eq(scanAreas.userId, input.userId), eq(scanAreas.areaId, input.areaId)))
      .limit(1)

    if (existing.length > 0) {
      // Update existing area
      await db
        .update(scanAreas)
        .set({
          count: sql`${scanAreas.count} + 1`,
          lastSeenAt: now,
          updatedAt: now,
          lat: input.lat ?? existing[0].lat,
          lon: input.lon ?? existing[0].lon
        })
        .where(eq(scanAreas.id, existing[0].id))
    } else {
      // Insert new area
      await db.insert(scanAreas).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        areaId: input.areaId,
        label: input.label,
        count: 1,
        lastSeenAt: now,
        lat: input.lat,
        lon: input.lon,
        createdAt: now,
        updatedAt: now
      })
    }

    // Insert area record
    await db.insert(scanAreaRecords).values({
      id: recordId,
      areaId: input.areaId,
      userId: input.userId,
      timestamp: now,
      ip: input.ip,
      city: input.city,
      region: input.region,
      countryCode: input.countryCode,
      device: input.device,
      browser: input.browser,
      responseMs: input.responseMs
    })

    // Keep only last 20 records per area (cleanup old records)
    // Get all records for this area, ordered by timestamp desc
    const allRecords = await db
      .select({ id: scanAreaRecords.id })
      .from(scanAreaRecords)
      .where(and(
        eq(scanAreaRecords.areaId, input.areaId),
        eq(scanAreaRecords.userId, input.userId)
      ))
      .orderBy(desc(scanAreaRecords.timestamp))

    // Delete records beyond the first 20
    if (allRecords.length > 20) {
      const idsToDelete = allRecords.slice(20).map(r => r.id)
      for (const id of idsToDelete) {
        await db
          .delete(scanAreaRecords)
          .where(eq(scanAreaRecords.id, id))
      }
    }
  }

  async getAreasForUser(userId: string): Promise<AreaSummary[]> {
    const areaRows = await db
      .select()
      .from(scanAreas)
      .where(eq(scanAreas.userId, userId))
      .orderBy(desc(scanAreas.lastSeenAt))

    const areas: AreaSummary[] = []

    for (const areaRow of areaRows) {
      // Get recent records for this area
      const recordRows = await db
        .select()
        .from(scanAreaRecords)
        .where(and(
          eq(scanAreaRecords.areaId, areaRow.areaId),
          eq(scanAreaRecords.userId, userId)
        ))
        .orderBy(desc(scanAreaRecords.timestamp))
        .limit(20)

      const recentScans: AreaScanRecord[] = recordRows.map(row => ({
        timestamp: row.timestamp.toISOString(),
        ip: row.ip,
        city: row.city,
        region: row.region,
        countryCode: row.countryCode,
        device: row.device ?? 'Unknown',
        browser: row.browser ?? 'Unknown',
        responseMs: row.responseMs
      }))

      areas.push({
        areaId: areaRow.areaId,
        label: areaRow.label,
        count: areaRow.count,
        lastSeenAt: areaRow.lastSeenAt.toISOString(),
        recentScans,
        lat: areaRow.lat,
        lon: areaRow.lon
      })
    }

    return areas
  }
}
