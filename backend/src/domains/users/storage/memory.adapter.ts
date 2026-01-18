import { User } from '../models'
import { UsersStorage } from './interface'

export class InMemoryUsersStorageAdapter implements UsersStorage {
  private readonly records = new Map<string, User>()

  async upsertUser(user: User) {
    this.records.set(user.id, user)
    return user
  }

  async getById(id: string) {
    return this.records.get(id) ?? null
  }

  async getByUsername(username: string) {
    for (const user of this.records.values()) {
      if ((user.username ?? '') === username) {
        return user
      }
    }
    return null
  }

  async updateUser(id: string, updates: Partial<User>) {
    const current = this.records.get(id)
    if (!current) {
      return null
    }
    const next: User = { ...current, ...updates }
    this.records.set(id, next)
    return next
  }
}
