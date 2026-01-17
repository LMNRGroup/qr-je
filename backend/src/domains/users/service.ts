import { UpsertUserInput, User } from './models'
import { UsersStorage } from './storage/interface'

export type UsersService = {
  upsertUser: (input: UpsertUserInput) => Promise<User>
  getById: (id: string) => Promise<User | null>
}

export const createUsersService = (storage: UsersStorage): UsersService => {
  const upsertUser = async (input: UpsertUserInput) => {
    const existing = await storage.getById(input.id)

    const user: User = {
      id: input.id,
      name: input.name ?? existing?.name ?? null,
      email: input.email ?? existing?.email ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    }

    return storage.upsertUser(user)
  }

  const getById = (id: string) => {
    return storage.getById(id)
  }

  return {
    upsertUser,
    getById
  }
}
