import { UpsertUserInput, UpdateUserInput, User } from './models'
import { UsersStorage } from './storage/interface'

export type UsersService = {
  upsertUser: (input: UpsertUserInput) => Promise<User>
  getById: (id: string) => Promise<User | null>
  updateUser: (id: string, updates: UpdateUserInput) => Promise<User | null>
  getByUsername: (username: string) => Promise<User | null>
}

export const createUsersService = (storage: UsersStorage): UsersService => {
  const upsertUser = async (input: UpsertUserInput) => {
    const existing = await storage.getById(input.id)

    const user: User = {
      id: input.id,
      name: input.name ?? existing?.name ?? null,
      email: input.email ?? existing?.email ?? null,
      username: existing?.username ?? null,
      timezone: existing?.timezone ?? null,
      language: existing?.language ?? null,
      theme: existing?.theme ?? null,
      usernameChangedAt: existing?.usernameChangedAt ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    }

    return storage.upsertUser(user)
  }

  const getById = (id: string) => {
    return storage.getById(id)
  }

  const updateUser = (id: string, updates: UpdateUserInput) => {
    return storage.updateUser(id, updates)
  }

  const getByUsername = (username: string) => {
    return storage.getByUsername(username)
  }

  return {
    upsertUser,
    getById,
    updateUser,
    getByUsername
  }
}
