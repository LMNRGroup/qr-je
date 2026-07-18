import { describe, expect, test } from 'bun:test'

import type { Url } from './models'
import { createUrlsService } from './service'
import { InMemoryUrlsStorageAdapter } from './storage/memory.adapter'
import { createMemoryCacheService } from '../../shared/cache/service'

class CountingUrlsStorageAdapter extends InMemoryUrlsStorageAdapter {
  getByIdAndRandomCalls = 0

  async getByIdAndRandom(id: string, random: string) {
    this.getByIdAndRandomCalls += 1
    return super.getByIdAndRandom(id, random)
  }
}

describe('urls service resolve cache', () => {
  test('caches public menu/file lookups and refreshes after writes', async () => {
    const storage = new CountingUrlsStorageAdapter()
    const service = createUrlsService(storage, createMemoryCacheService<Url>(5 * 60 * 1000, 1000))
    const url: Url = {
      id: 'menu1234',
      random: 'abc123',
      userId: 'user-1',
      targetUrl: 'https://qrcode.luminarapps.com/menu/menu1234/abc123',
      name: 'Menu',
      createdAt: new Date().toISOString(),
      kind: 'dynamic:menu',
      options: {
        menuFiles: [{ url: 'https://cdn.example.com/menu.png', type: 'image' }]
      }
    }

    await storage.createUrl(url)

    expect(await service.resolveUrl({ id: url.id, random: url.random })).toEqual(url)
    expect(await service.resolveUrl({ id: url.id, random: url.random })).toEqual(url)
    expect(storage.getByIdAndRandomCalls).toBe(1)

    const updated = await service.updateUrl(url.id, url.userId, {
      options: {
        menuFiles: [{ url: 'https://cdn.example.com/menu-v2.png', type: 'image' }]
      }
    })
    expect(await service.resolveUrl({ id: url.id, random: url.random })).toEqual(updated)
    expect(storage.getByIdAndRandomCalls).toBe(1)

    await service.deleteUrl(url.id)

    let message = ''
    try {
      await service.resolveUrl({ id: url.id, random: url.random })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toBe('Short url not found')
    expect(storage.getByIdAndRandomCalls).toBe(2)
  })
})
