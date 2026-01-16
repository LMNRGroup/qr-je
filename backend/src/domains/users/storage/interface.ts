import { User } from '../models'

export type UsersStorage = {
  upsertUser: (user: User) => Promise<User>
  getById: (id: string) => Promise<User | null>
}
