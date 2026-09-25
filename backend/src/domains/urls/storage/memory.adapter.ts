import { Url, UrlQuota } from '../models'
import { UrlQuotaExceededError } from '../errors'
import { findQuotaIncreaseViolation, findQuotaViolation } from '../quota'
import { UrlsStorage } from './interface'

export class InMemoryUrlsStorageAdapter implements UrlsStorage {
  private readonly records = new Map<string, Url>()

  async createUrl(url: Url, quota?: UrlQuota) {
    if (quota) this.assertWithinQuota([...this.records.values(), url], quota)
    this.records.set(this.keyFor(url.id, url.random), url)
  }

  async getByIdAndRandom(id: string, random: string) {
    return this.records.get(this.keyFor(id, random)) ?? null
  }

  async getById(id: string) {
    return Array.from(this.records.values()).find((url) => url.id === id) ?? null
  }

  async existsById(id: string) {
    return Array.from(this.records.values()).some((url) => url.id === id)
  }

  async getByUserId(userId: string, options?: { includeOptions?: boolean }) {
    const rows = Array.from(this.records.values()).filter((url) => url.userId === userId)
    if (options?.includeOptions === false) {
      return rows.map((url) => ({ ...url, options: null }))
    }
    return rows
  }

  async getAll() {
    return Array.from(this.records.values())
  }

  async updateById(id: string, userId: string, updates: Partial<Url>, quota?: UrlQuota) {
    const entry = Array.from(this.records.values()).find(
      (url) => url.id === id && url.userId === userId
    )
    if (!entry) {
      return null
    }
    const updated: Url = {
      ...entry,
      ...updates
    }
    if (quota) {
      const before = Array.from(this.records.values())
      const after = before.map((record) =>
        record.id === id && record.userId === userId ? updated : record
      )
      const violation = findQuotaIncreaseViolation(before, after, quota)
      if (violation) {
        throw new UrlQuotaExceededError('QR code plan limit reached', violation.code)
      }
    }
    this.records.set(this.keyFor(updated.id, updated.random), updated)
    return updated
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

  private assertWithinQuota(records: Url[], quota: UrlQuota) {
    const violation = findQuotaViolation(records, quota)
    if (violation) {
      throw new UrlQuotaExceededError('QR code plan limit reached', violation.code)
    }
  }
}
