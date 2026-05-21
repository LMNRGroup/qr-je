import { beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'

import type { AppBindings } from '../../shared/http/types'
import { createScansService } from '../scans/service'
import { InMemoryScansStorageAdapter } from '../scans/storage/memory.adapter'
import { createUrlsService } from './service'
import { InMemoryUrlsStorageAdapter } from './storage/memory.adapter'
import { registerUrlsRoutes } from './routes'
import { buildPublicOwnerSlug } from './public-links'
import { createVcardsService } from '../vcards/service'
import { InMemoryVcardsStorageAdapter } from '../vcards/storage/memory.adapter'
import { registerVcardsRoutes } from '../vcards/routes'

process.env.APP_BASE_URL = 'https://qrcode.luminarapps.com'

const USER_ID = 'user-123456789'

type CreateTestAppResult = {
  app: Hono<AppBindings>
  scansService: ReturnType<typeof createScansService>
}

const createTestApp = (): CreateTestAppResult => {
  const app = new Hono<AppBindings>()
  const urlsService = createUrlsService(new InMemoryUrlsStorageAdapter())
  const vcardsService = createVcardsService(new InMemoryVcardsStorageAdapter())
  const scansService = createScansService(new InMemoryScansStorageAdapter())

  app.use('*', async (c, next) => {
    c.set('userId', USER_ID)
    await next()
  })

  registerUrlsRoutes(app, urlsService, scansService, vcardsService)
  registerVcardsRoutes(app, vcardsService, urlsService)

  return { app, scansService }
}

const flushAsyncWork = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const createVcard = async (app: Hono<AppBindings>, slug = 'ramon') => {
  const response = await app.request('/vcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      publicUrl: `https://qrcode.luminarapps.com/v/${slug}`,
      kind: 'dynamic:vcard',
      data: {
        profile: {
          name: 'Ramon Torres',
          title: 'Founder',
          company: 'Luminar',
          email: 'ramon@example.com',
          socials: {
            instagram: 'https://instagram.com/ramontorres',
          },
          favoriteSocial: 'instagram',
        },
        style: {
          coverPhotoDataUrl: 'https://cdn.example.com/cover.png',
          frontLogoDataUrl: 'https://cdn.example.com/logo.png',
        },
      },
    }),
  })

  expect(response.status).toBe(201)
  return (await response.json()) as {
    url: {
      id: string
      random: string
      targetUrl: string
      publicUrl: string
      options?: {
        legacyAliases?: Array<{ oldPath: string; canonicalPath?: string; active?: boolean }>
      } | null
    }
    vcard: {
      shortId: string
      shortRandom: string
      slug: string
      publicUrl: string
    }
  }
}

describe('public vcard compatibility routes', () => {
  let testApp: CreateTestAppResult

  beforeEach(() => {
    testApp = createTestApp()
  })

  test('new vcard creation stores canonical target URL plus legacy alias metadata', async () => {
    const payload = await createVcard(testApp.app)
    const ownerSlug = buildPublicOwnerSlug(USER_ID)

    expect(payload.url.targetUrl).toBe(`https://qrcode.luminarapps.com/${ownerSlug}/ramon`)
    expect(payload.url.publicUrl).toBe(`https://qrcode.luminarapps.com/${ownerSlug}/ramon`)
    expect(payload.vcard.publicUrl).toBe(`https://qrcode.luminarapps.com/${ownerSlug}/ramon`)
    expect(payload.url.options?.legacyAliases).toContainEqual({
      oldPath: '/v/ramon',
      type: 'vcard',
      canonicalPath: `/${ownerSlug}/ramon`,
      active: true,
    })
  })

  test('legacy vcard page route still loads the correct card and keeps media references', async () => {
    const payload = await createVcard(testApp.app)
    const response = await testApp.app.request('/public/pages/v/ramon')

    expect(response.status).toBe(200)

    const html = await response.text()
    expect(html).toContain('Ramon Torres')
    expect(html).toContain('https://cdn.example.com/cover.png')
    expect(html).toContain('https://cdn.example.com/logo.png')
    expect(html).toContain('aria-label="Instagram"')
    expect(html).not.toContain('>IG<')
    expect(html).toContain('Featured Social')
    expect(html).not.toContain('>Company<')

    await flushAsyncWork()
    expect(await testApp.scansService.getScanCount(payload.url.id, payload.url.random)).toBe(1)
  })

  test('canonical owner-scoped vcard page route loads the same card and records scans', async () => {
    const payload = await createVcard(testApp.app)
    const ownerSlug = buildPublicOwnerSlug(USER_ID)
    const response = await testApp.app.request(`/public/pages/${ownerSlug}/ramon`)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Ramon Torres')

    await flushAsyncWork()
    expect(await testApp.scansService.getScanCount(payload.url.id, payload.url.random)).toBe(1)
  })

  test('legacy public vcard API resolves through the alias path without returning 404', async () => {
    await createVcard(testApp.app)
    const response = await testApp.app.request('/public/vcards/ramon')

    expect(response.status).toBe(200)

    const payload = (await response.json()) as { slug: string; publicUrl: string }
    expect(payload.slug).toBe('ramon')
    expect(payload.publicUrl).toContain('/ramon')
  })

  test('dynamic short-link redirects still record scans and static external URLs remain untouched', async () => {
    const createResponse = await testApp.app.request('/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: 'https://facebook.com/luminarapps',
        kind: 'static:url',
        name: 'Facebook',
      }),
    })

    expect(createResponse.status).toBe(201)

    const payload = (await createResponse.json()) as {
      id: string
      random: string
      shortUrl: string
      targetUrl: string
    }

    const redirectResponse = await testApp.app.request(
      `/r/${payload.id}/${payload.random}`,
      { redirect: 'manual' }
    )

    expect(redirectResponse.status).toBe(302)
    expect(redirectResponse.headers.get('location')).toBe('https://facebook.com/luminarapps')

    await flushAsyncWork()
    expect(await testApp.scansService.getScanCount(payload.id, payload.random)).toBe(1)
  })
})
