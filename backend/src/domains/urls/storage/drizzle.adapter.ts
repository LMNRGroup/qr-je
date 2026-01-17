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

  async existsByIdRandom(id: string, random: string) {
    const rows = await db
      .select({ id: urls.id })
      .from(urls)
      .where(and(eq(urls.id, id), eq(urls.random, random)))
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

  private toDomain(row: typeof urls.$inferSelect): Url {
    return {
      id: row.id,
      random: row.random,
      userId: row.userId,
      virtualCardId: row.virtualCardId,
      targetUrl: row.targetUrl,
      createdAt: row.createdAt.toISOString()
    }
  }
}
