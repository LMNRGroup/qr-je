import { UrlConflictError, UrlNotFoundError } from './errors'
import { CreateUrlInput, ResolveUrlInput, Url } from './models'
import { UrlsStorage } from './storage/interface'

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DEFAULT_ID_LENGTH = 8
const DEFAULT_RANDOM_LENGTH = 6
const MAX_GENERATION_ATTEMPTS = 10

export type UrlsService = {
  createUrl: (input: CreateUrlInput) => Promise<Url>
  resolveUrl: (input: ResolveUrlInput) => Promise<Url>
  getUrlsForUser: (userId: string) => Promise<Url[]>
  getAllUrls: () => Promise<Url[]>
}

export const createUrlsService = (storage: UrlsStorage): UrlsService => {
  const createUrl = async (input: CreateUrlInput) => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const id = generateBase62(DEFAULT_ID_LENGTH)
      const random = generateBase62(DEFAULT_RANDOM_LENGTH)
      const exists = await storage.existsByIdRandom(id, random)

      if (exists) {
        continue
      }

      const url: Url = {
        id,
        random,
        userId: input.userId,
        targetUrl: input.targetUrl,
        createdAt: new Date().toISOString()
      }

      await storage.createUrl(url)
      return url
    }

    throw new UrlConflictError('Unable to generate a unique short url')
  }

  const resolveUrl = async (input: ResolveUrlInput) => {
    const url = await storage.getByIdAndRandom(input.id, input.random)

    if (!url) {
      throw new UrlNotFoundError('Short url not found')
    }

    return url
  }

  const getAllUrls = async () => {
    const urls = await storage.getAll()
    return urls
  }

  const getUrlsForUser = async (userId: string) => {
    return storage.getByUserId(userId)
  }

  return {
    createUrl,
    resolveUrl,
    getUrlsForUser,
    getAllUrls
  }
}

const generateBase62 = (length: number) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  let output = ''

  for (const byte of Array.from(bytes)) {
    output += BASE62_ALPHABET[byte % BASE62_ALPHABET.length]
  }

  return output
}
