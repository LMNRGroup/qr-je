import { Vcard } from '../models'
import { VcardsStorage } from './interface'

export class InMemoryVcardsStorageAdapter implements VcardsStorage {
  private readonly records = new Map<string, Vcard>()

  async createVcard(vcard: Vcard) {
    this.records.set(vcard.id, vcard)
  }

  async getById(id: string) {
    return this.records.get(id) ?? null
  }

  async getByUserId(userId: string) {
    return Array.from(this.records.values()).filter((vcard) => vcard.userId === userId)
  }

  async getByUserIdAndSlug(userId: string, slug: string) {
    return Array.from(this.records.values()).find(
      (vcard) => vcard.userId === userId && vcard.slug === slug
    ) ?? null
  }

  async deleteById(id: string) {
    this.records.delete(id)
  }
}
