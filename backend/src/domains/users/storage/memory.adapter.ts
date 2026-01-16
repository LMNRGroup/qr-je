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
}
