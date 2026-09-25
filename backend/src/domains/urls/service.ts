import { UrlConflictError, UrlNotFoundError } from './errors'
import { CreateUrlInput, ResolveUrlInput, UpdateUrlPayload, Url, UrlQuota } from './models'
import { UrlsStorage } from './storage/interface'
import { CacheService, createCacheService } from '../../shared/cache/service'

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DEFAULT_ID_LENGTH = 8
const DEFAULT_RANDOM_LENGTH = 6
const MAX_GENERATION_ATTEMPTS = 10
const RESOLVE_CACHE_TTL_MS = 5 * 60 * 1000
const RESOLVE_CACHE_MAX_ENTRIES = 1000

export type UrlsService = {
  createUrl: (input: CreateUrlInput, quota?: UrlQuota) => Promise<Url>
  resolveUrl: (input: ResolveUrlInput) => Promise<Url>
  getById: (id: string) => Promise<Url | null>
  getUrlsForUser: (userId: string, options?: { includeOptions?: boolean }) => Promise<Url[]>
  getAllUrls: () => Promise<Url[]>
  updateUrl: (id: string, userId: string, updates: UpdateUrlPayload, quota?: UrlQuota) => Promise<Url>
  deleteUrl: (id: string) => Promise<void>
}

export const createUrlResolveCache = () =>
  createCacheService<Url>({
    ttlMs: RESOLVE_CACHE_TTL_MS,
    maxEntries: RESOLVE_CACHE_MAX_ENTRIES,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN
  })

export const createUrlsService = (storage: UrlsStorage, resolveCache: CacheService<Url> = createUrlResolveCache()): UrlsService => {
  const createUrl = async (input: CreateUrlInput, quota?: UrlQuota) => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const id = generateBase62(DEFAULT_ID_LENGTH)
      const random = generateBase62(DEFAULT_RANDOM_LENGTH)
      const exists = await storage.existsById(id)

      if (exists) {
        continue
      }

      const url: Url = {
        id,
        random,
        userId: input.userId,
        virtualCardId: input.virtualCardId ?? null,
        targetUrl: input.targetUrl,
        name: input.name ?? null,
        createdAt: new Date().toISOString(),
        options: input.options ?? null,
        kind: input.kind ?? null
      }

      await storage.createUrl(url, quota)
      await resolveCache.set(resolveCacheKey(url.id, url.random), url)
      return url
    }

    throw new UrlConflictError('Unable to generate a unique short url')
  }

  const resolveUrl = async (input: ResolveUrlInput) => {
    const cacheKey = resolveCacheKey(input.id, input.random)
    const cached = await resolveCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const url = await storage.getByIdAndRandom(input.id, input.random)

    if (!url) {
      throw new UrlNotFoundError('Short url not found')
    }

    await resolveCache.set(cacheKey, url)
    return url
  }

  const getById = async (id: string) => {
    return storage.getById(id)
  }

  const getUrlsForUser = async (userId: string, options?: { includeOptions?: boolean }) => {
    return storage.getByUserId(userId, options)
  }

  const getAllUrls = async () => {
    return storage.getAll()
  }

  const updateUrl = async (id: string, userId: string, updates: UpdateUrlPayload, quota?: UrlQuota) => {
    const updated = await storage.updateById(id, userId, updates, quota)

    if (!updated) {
      throw new UrlNotFoundError('Short url not found')
    }

    await resolveCache.deletePrefix(resolveCachePrefix(id))
    await resolveCache.set(resolveCacheKey(updated.id, updated.random), updated)
    return updated
  }

  const deleteUrl = async (id: string) => {
    await storage.deleteById(id)
    await resolveCache.deletePrefix(resolveCachePrefix(id))
  }

  return {
    createUrl,
    resolveUrl,
    getById,
    getUrlsForUser,
    getAllUrls,
    updateUrl,
    deleteUrl
  }
}

const resolveCacheKey = (id: string, random: string) => `${id}:${random}`
const resolveCachePrefix = (id: string) => `${id}:`

const generateBase62 = (length: number) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  let output = ''

  for (const byte of Array.from(bytes)) {
    output += BASE62_ALPHABET[byte % BASE62_ALPHABET.length]
  }

  return output
}
