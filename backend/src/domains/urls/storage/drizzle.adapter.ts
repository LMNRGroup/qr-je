import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { urls } from '../../../infra/db/schema'
import { Url, UrlQuota } from '../models'
import { UrlQuotaExceededError } from '../errors'
import { findQuotaIncreaseViolation, findQuotaViolation } from '../quota'
import { UrlsStorage } from './interface'

type UrlRow = {
  id: string
  random: string
  userId: string
  virtualCardId?: string | null
  targetUrl: string
  name?: string | null
  createdAt: Date
  options?: Record<string, unknown> | null
  kind?: string | null
}

export class DrizzleUrlsStorageAdapter implements UrlsStorage {
  async createUrl(url: Url, quota?: UrlQuota) {
    const values: typeof urls.$inferInsert = {
      id: url.id,
      random: url.random,
      userId: url.userId,
      virtualCardId: url.virtualCardId,
      targetUrl: url.targetUrl,
      name: url.name ?? null,
      options: url.options ?? null,
      kind: url.kind ?? null,
      createdAt: new Date(url.createdAt)
    }

    if (!quota) {
      await db.insert(urls).values(values)
      return
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${url.userId}, 0))`)
      const existing = await tx
        .select({ kind: urls.kind, options: urls.options })
        .from(urls)
        .where(eq(urls.userId, url.userId))
      this.assertWithinQuota([...existing, url], quota)
      await tx.insert(urls).values(values)
    })
  }

  async getByIdAndRandom(id: string, random: string) {
    const rows = await db
      .select()
      .from(urls)
      .where(and(eq(urls.id, id), eq(urls.random, random)))
      .limit(1)

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  async getById(id: string) {
    const rows = await db
      .select()
      .from(urls)
      .where(eq(urls.id, id))
      .limit(1)

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  async existsById(id: string) {
    const rows = await db
      .select({ id: urls.id })
      .from(urls)
      .where(eq(urls.id, id))
      .limit(1)

    return rows.length > 0
  }

  async getByUserId(userId: string, options?: { includeOptions?: boolean }) {
    if (options?.includeOptions === false) {
      const rows = await db
        .select({
          id: urls.id,
          random: urls.random,
          userId: urls.userId,
          virtualCardId: urls.virtualCardId,
          targetUrl: urls.targetUrl,
          name: urls.name,
          createdAt: urls.createdAt,
          kind: urls.kind
        })
        .from(urls)
        .where(eq(urls.userId, userId))
        .orderBy(desc(urls.createdAt))

      return rows.map((row) => this.toDomain(row))
    }

    const rows = await db
      .select()
      .from(urls)
      .where(eq(urls.userId, userId))
      .orderBy(desc(urls.createdAt))

    return rows.map((row) => this.toDomain(row))
  }

  async getAll() {
    const rows = await db.select().from(urls).orderBy(desc(urls.createdAt))
    return rows.map((row) => this.toDomain(row))
  }

  async deleteById(id: string) {
    await db.delete(urls).where(eq(urls.id, id))
  }

  async updateById(id: string, userId: string, updates: Partial<Url>, quota?: UrlQuota) {
    const payload: Partial<typeof urls.$inferInsert> = {}
    if (updates.targetUrl !== undefined) payload.targetUrl = updates.targetUrl
    if (updates.name !== undefined) payload.name = updates.name ?? null
    if (updates.options !== undefined) payload.options = updates.options ?? null
    if (updates.kind !== undefined) payload.kind = updates.kind ?? null

    const rows = quota
      ? await db.transaction(async (tx) => {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`)
          const existing = await tx.select().from(urls).where(eq(urls.userId, userId))
          const current = existing.find((record) => record.id === id)
          if (!current) return []
          const candidate = { ...current, ...payload }
          const after = existing.map((record) => record.id === id ? candidate : record)
          const violation = findQuotaIncreaseViolation(existing, after, quota)
          if (violation) {
            throw new UrlQuotaExceededError('QR code plan limit reached', violation.code)
          }
          return tx
            .update(urls)
            .set(payload)
            .where(and(eq(urls.id, id), eq(urls.userId, userId)))
            .returning()
        })
      : await db
          .update(urls)
          .set(payload)
          .where(and(eq(urls.id, id), eq(urls.userId, userId)))
          .returning()

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  private toDomain(row: UrlRow): Url {
    return {
      id: row.id,
      random: row.random,
      userId: row.userId,
      virtualCardId: row.virtualCardId,
      targetUrl: row.targetUrl,
      name: row.name ?? null,
      createdAt: row.createdAt.toISOString(),
      options: row.options ?? null,
      kind: row.kind ?? null
    }
  }

  private assertWithinQuota(
    records: Array<Pick<Url, 'kind' | 'options'>>,
    quota: UrlQuota
  ) {
    const violation = findQuotaViolation(records, quota)
    if (violation) {
      throw new UrlQuotaExceededError('QR code plan limit reached', violation.code)
    }
  }
}
