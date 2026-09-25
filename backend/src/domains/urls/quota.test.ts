import { describe, expect, test } from 'bun:test'

import { UrlQuotaExceededError } from './errors'
import type { Url, UrlQuota } from './models'
import { findQuotaViolation } from './quota'
import { InMemoryUrlsStorageAdapter } from './storage/memory.adapter'

const FREE_QUOTA: UrlQuota = {
  dynamicQrCodeLimit: 1,
  adaptiveQrCodeLimit: 1
}

const makeUrl = (id: string, kind: string, options: Record<string, unknown> | null = null): Url => ({
  id,
  random: `random-${id}`,
  userId: 'user-1',
  targetUrl: 'https://example.com',
  createdAt: new Date().toISOString(),
  kind,
  options
})

describe('URL billing quotas', () => {
  test('static menu and PDF QR codes do not consume the dynamic allowance', () => {
    const records = [
      makeUrl('menu', 'static:menu'),
      makeUrl('file', 'static:file'),
      makeUrl('dynamic', 'dynamic:url')
    ]

    expect(findQuotaViolation(records, FREE_QUOTA)).toBeNull()
  })

  test('Adaptive QRCs are counted separately from dynamic QR codes', () => {
    const records = [
      makeUrl('dynamic', 'dynamic:url'),
      makeUrl('adaptive', 'adaptive', { adaptive: { slots: [] } })
    ]

    expect(findQuotaViolation(records, FREE_QUOTA)).toBeNull()
  })

  test('legacy dynamic and vcard kinds still consume the dynamic allowance', () => {
    expect(findQuotaViolation([
      makeUrl('legacy-dynamic', 'dynamic'),
      makeUrl('legacy-vcard', 'vcard')
    ], FREE_QUOTA)).toEqual({
      code: 'DYNAMIC_QR_LIMIT_REACHED',
      limit: 1
    })
  })

  test('creation and type transitions cannot bypass Adaptive limits', async () => {
    const storage = new InMemoryUrlsStorageAdapter()
    await storage.createUrl(makeUrl('adaptive', 'adaptive', { adaptive: { slots: [] } }), FREE_QUOTA)
    await storage.createUrl(makeUrl('static', 'static:url'), FREE_QUOTA)

    await expect(
      storage.updateById(
        'static',
        'user-1',
        { kind: 'adaptive', options: { adaptive: { slots: [] } } },
        FREE_QUOTA
      )
    ).rejects.toBeInstanceOf(UrlQuotaExceededError)
  })

  test('a second dynamic QR code is rejected while static codes remain allowed', async () => {
    const storage = new InMemoryUrlsStorageAdapter()
    await storage.createUrl(makeUrl('dynamic-1', 'dynamic:url'), FREE_QUOTA)
    await storage.createUrl(makeUrl('static', 'static:menu'), FREE_QUOTA)

    await expect(
      storage.createUrl(makeUrl('dynamic-2', 'dynamic:file'), FREE_QUOTA)
    ).rejects.toMatchObject({ code: 'DYNAMIC_QR_LIMIT_REACHED' })
  })

  test('users already over a downgraded limit can still edit existing QR codes', async () => {
    const storage = new InMemoryUrlsStorageAdapter()
    await storage.createUrl(makeUrl('dynamic-1', 'dynamic:url'))
    await storage.createUrl(makeUrl('dynamic-2', 'dynamic:file'))

    const updated = await storage.updateById(
      'dynamic-1',
      'user-1',
      { name: 'Updated name' },
      FREE_QUOTA
    )

    expect(updated?.name).toBe('Updated name')
  })
})
