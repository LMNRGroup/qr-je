import { Url } from '../models'
import { UrlsStorage } from './interface'

export class InMemoryUrlsStorageAdapter implements UrlsStorage {
  private readonly records = new Map<string, Url>()

  async createUrl(url: Url) {
    this.records.set(this.keyFor(url.id, url.random), url)
  }

  async getByIdAndRandom(id: string, random: string) {
    return this.records.get(this.keyFor(id, random)) ?? null
  }

  async existsByIdRandom(id: string, random: string) {
    return this.records.has(this.keyFor(id, random))
  }

  async getAll() {
    return Array.from(this.records.values())
  }

  private keyFor(id: string, random: string) {
    return `${id}:${random}`
  }
}
