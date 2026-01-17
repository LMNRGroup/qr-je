import { and, desc, eq } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { urls } from '../../../infra/db/schema'
import { Url } from '../models'
import { UrlsStorage } from './interface'

export class DrizzleUrlsStorageAdapter implements UrlsStorage {
  async createUrl(url: Url) {
    await db.insert(urls).values({
      id: url.id,
      random: url.random,
      userId: url.userId,
      virtualCardId: url.virtualCardId,
      targetUrl: url.targetUrl,
      name: url.name ?? null,
      options: url.options ?? null,
      kind: url.kind ?? null,
      createdAt: new Date(url.createdAt)
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

  async getByUserId(userId: string) {
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

  async updateById(id: string, userId: string, updates: Partial<Url>) {
    const payload: Partial<typeof urls.$inferInsert> = {}
    if (updates.targetUrl !== undefined) payload.targetUrl = updates.targetUrl
    if (updates.name !== undefined) payload.name = updates.name ?? null
    if (updates.options !== undefined) payload.options = updates.options ?? null
    if (updates.kind !== undefined) payload.kind = updates.kind ?? null

    const rows = await db
      .update(urls)
      .set(payload)
      .where(and(eq(urls.id, id), eq(urls.userId, userId)))
      .returning()

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  private toDomain(row: typeof urls.$inferSelect): Url {
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
}
