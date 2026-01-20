import { eq } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { users } from '../../../infra/db/schema'
import { User } from '../models'
import { UsersStorage } from './interface'

export class DrizzleUsersStorageAdapter implements UsersStorage {
  async upsertUser(user: User) {
    const rows = await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        timezone: user.timezone,
        language: user.language,
        theme: user.theme,
        avatarType: user.avatarType,
        avatarColor: user.avatarColor,
        usernameChangedAt: user.usernameChangedAt ? new Date(user.usernameChangedAt) : null,
        createdAt: new Date(user.createdAt)
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: user.name,
          email: user.email,
          username: user.username,
          timezone: user.timezone,
          language: user.language,
          theme: user.theme,
          avatarType: user.avatarType,
          avatarColor: user.avatarColor,
          usernameChangedAt: user.usernameChangedAt ? new Date(user.usernameChangedAt) : null
        }
      })
      .returning()

    if (!rows[0]) {
      throw new Error('Failed to upsert user')
    }

    return this.toDomain(rows[0])
  }

  async getById(id: string) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  async getByUsername(username: string) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  async updateUser(id: string, updates: Partial<User>) {
    const payload: Partial<typeof users.$inferInsert> = {}
    if ('name' in updates) payload.name = updates.name
    if ('email' in updates) payload.email = updates.email
    if ('username' in updates) payload.username = updates.username
    if ('timezone' in updates) payload.timezone = updates.timezone
    if ('language' in updates) payload.language = updates.language
    if ('theme' in updates) payload.theme = updates.theme
    if ('avatarType' in updates) payload.avatarType = updates.avatarType
    if ('avatarColor' in updates) payload.avatarColor = updates.avatarColor
    if ('usernameChangedAt' in updates) {
      payload.usernameChangedAt = updates.usernameChangedAt
        ? new Date(updates.usernameChangedAt)
        : null
    }

    const rows = await db
      .update(users)
      .set(payload)
      .where(eq(users.id, id))
      .returning()

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  private toDomain(row: typeof users.$inferSelect): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username ?? null,
      timezone: row.timezone ?? null,
      language: row.language ?? null,
      theme: row.theme ?? null,
      avatarType: row.avatarType ?? null,
      avatarColor: row.avatarColor ?? null,
      usernameChangedAt: row.usernameChangedAt ? row.usernameChangedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString()
    }
  }
}
