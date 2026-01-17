import { Url } from '../models'

export type UrlsStorage = {
  createUrl: (url: Url) => Promise<void>
  getByIdAndRandom: (id: string, random: string) => Promise<Url | null>
  existsById: (id: string) => Promise<boolean>
  getByUserId: (userId: string) => Promise<Url[]>
  getAll: () => Promise<Url[]>
  deleteById: (id: string) => Promise<void>
}
