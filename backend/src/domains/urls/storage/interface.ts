import { Url } from '../models'

export type UrlsStorage = {
  createUrl: (url: Url) => Promise<void>
  getByIdAndRandom: (id: string, random: string) => Promise<Url | null>
  existsByIdRandom: (id: string, random: string) => Promise<boolean>
  getByUserId: (userId: string) => Promise<Url[]>
  getAll: () => Promise<Url[]>
}
