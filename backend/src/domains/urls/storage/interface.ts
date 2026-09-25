import { Url, UrlQuota } from '../models'

export type UrlsStorage = {
  createUrl: (url: Url, quota?: UrlQuota) => Promise<void>
  getByIdAndRandom: (id: string, random: string) => Promise<Url | null>
  getById: (id: string) => Promise<Url | null>
  existsById: (id: string) => Promise<boolean>
  getByUserId: (userId: string, options?: { includeOptions?: boolean }) => Promise<Url[]>
  getAll: () => Promise<Url[]>
  updateById: (id: string, userId: string, updates: Partial<Url>, quota?: UrlQuota) => Promise<Url | null>
  deleteById: (id: string) => Promise<void>
}
