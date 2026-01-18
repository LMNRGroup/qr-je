import { User } from '../models'

export type UsersStorage = {
  upsertUser: (user: User) => Promise<User>
  getById: (id: string) => Promise<User | null>
  getByUsername: (username: string) => Promise<User | null>
  updateUser: (id: string, updates: Partial<User>) => Promise<User | null>
}
