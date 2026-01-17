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
        createdAt: new Date(user.createdAt)
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: user.name,
          email: user.email
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

  private toDomain(row: typeof users.$inferSelect): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt.toISOString()
    }
  }
}
