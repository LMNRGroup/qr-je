import { Url } from '../models'

export type UrlsStorage = {
  createUrl: (url: Url) => Promise<void>
  getByIdAndRandom: (id: string, random: string) => Promise<Url | null>
  getById: (id: string) => Promise<Url | null>
  existsById: (id: string) => Promise<boolean>
  getByUserId: (userId: string) => Promise<Url[]>
  getAll: () => Promise<Url[]>
  updateById: (id: string, userId: string, updates: Partial<Url>) => Promise<Url | null>
  deleteById: (id: string) => Promise<void>
}
