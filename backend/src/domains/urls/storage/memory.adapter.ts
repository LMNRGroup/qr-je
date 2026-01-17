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

  async existsById(id: string) {
    return Array.from(this.records.values()).some((url) => url.id === id)
  }

  async getByUserId(userId: string) {
    return Array.from(this.records.values()).filter((url) => url.userId === userId)
  }

  async getAll() {
    return Array.from(this.records.values())
  }

  async deleteById(id: string) {
    for (const [key, value] of this.records.entries()) {
      if (value.id === id) {
        this.records.delete(key)
        return
      }
    }
  }

  private keyFor(id: string, random: string) {
    return `${id}:${random}`
  }
}
