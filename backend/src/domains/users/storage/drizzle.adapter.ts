import { eq, sql } from 'drizzle-orm'

import { db } from '../../../infra/db/postgres.db'
import { users } from '../../../infra/db/schema'

let avatarColumnsEnsured = false
let avatarColumnsPromise: Promise<void> | null = null

const ensureAvatarColumns = async () => {
  if (avatarColumnsEnsured) return
  if (!avatarColumnsPromise) {
    avatarColumnsPromise = (async () => {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_type" text`)
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_color" text`)
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leftie" boolean NOT NULL DEFAULT false`)
      avatarColumnsEnsured = true
    })().catch((error) => {
      avatarColumnsPromise = null
      throw error
    })
  }
  await avatarColumnsPromise
}

const isMissingAvatarColumn = (error: unknown) => {
  const message = error instanceof Error ? error.message : ''
  return message.includes('avatar_type') || message.includes('avatar_color') || message.includes('leftie')
}

const withAvatarColumns = async <T>(task: () => Promise<T>) => {
  try {
    return await task()
  } catch (error) {
    if (isMissingAvatarColumn(error)) {
      await ensureAvatarColumns()
      return await task()
    }
    throw error
  }
}
import { User } from '../models'
import { UsersStorage } from './interface'

export class DrizzleUsersStorageAdapter implements UsersStorage {
  async upsertUser(user: User) {
    const rows = await withAvatarColumns(() =>
      db
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
          leftie: user.leftie,
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
            leftie: user.leftie,
            usernameChangedAt: user.usernameChangedAt ? new Date(user.usernameChangedAt) : null
          }
        })
        .returning()
    )

    if (!rows[0]) {
      throw new Error('Failed to upsert user')
    }

    return this.toDomain(rows[0])
  }

  async getById(id: string) {
    const rows = await withAvatarColumns(() =>
      db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
    )

    if (!rows[0]) {
      return null
    }

    return this.toDomain(rows[0])
  }

  async getByUsername(username: string) {
    const rows = await withAvatarColumns(() =>
      db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
    )

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
    if ('leftie' in updates) payload.leftie = updates.leftie
    if ('usernameChangedAt' in updates) {
      payload.usernameChangedAt = updates.usernameChangedAt
        ? new Date(updates.usernameChangedAt)
        : null
    }

    const rows = await withAvatarColumns(() =>
      db
        .update(users)
        .set(payload)
        .where(eq(users.id, id))
        .returning()
    )

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
      leftie: row.leftie ?? false,
      usernameChangedAt: row.usernameChangedAt ? row.usernameChangedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString()
    }
  }
}
