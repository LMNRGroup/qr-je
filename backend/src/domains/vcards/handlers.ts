import type { Context } from 'hono'

import { buildShortUrl } from '../../config/env'
import type { AppBindings } from '../../shared/http/types'
import type { UrlsService } from '../urls/service'
import { parseCreateVcardInput } from './validators'
import type { VcardsService } from './service'
import { Vcard } from './models'

const MAX_SLUG_ATTEMPTS = 20

export const createVcardHandler = (vcardsService: VcardsService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const payload = await c.req.json()
    const input = parseCreateVcardInput(payload)

    const baseSlug = input.slug ?? `${userId}-vcard`
    const slug = await findAvailableSlug(vcardsService, userId, baseSlug)

    const url = await urlsService.createUrl({
      userId,
      targetUrl: input.publicUrl,
      options: input.options ?? null,
      kind: 'vcard'
    })

    const vcard: Vcard = {
      id: crypto.randomUUID(),
      userId,
      slug,
      publicUrl: input.publicUrl,
      shortId: url.id,
      shortRandom: url.random,
      data: input.data,
      createdAt: new Date().toISOString()
    }

    try {
      const saved = await vcardsService.createVcard(vcard)
      return c.json({
        vcard: saved,
        url: {
          id: url.id,
          random: url.random,
          targetUrl: url.targetUrl,
          name: url.name ?? null,
          shortUrl: buildShortUrl(url.id, url.random),
          createdAt: url.createdAt,
          options: url.options ?? null,
          kind: url.kind ?? null
        }
      }, 201)
    } catch (error) {
      await urlsService.deleteUrl(url.id)
      const message = error instanceof Error ? error.message : 'Failed to save vcard'
      console.error('[vcards] create failed', message)
      return c.json({ message: 'Failed to create vcard', reason: message }, 500)
    }
  }
}

export const listVcardsHandler = (vcardsService: VcardsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const vcards = await vcardsService.getByUserId(userId)
    return c.json(vcards)
  }
}

export const publicVcardHandler = (vcardsService: VcardsService) => {
  return async (c: Context<AppBindings>) => {
    const slug = c.req.param('slug')
    if (!slug) {
      return c.json({ message: 'slug is required' }, 400)
    }

    const vcard = await vcardsService.getBySlug(slug)
    if (!vcard) {
      return c.json({ message: 'Not found' }, 404)
    }

    return c.json(vcard)
  }
}

export const deleteVcardHandler = (vcardsService: VcardsService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const id = c.req.param('id')
    if (!id) {
      return c.json({ message: 'id is required' }, 400)
    }

    const record = await vcardsService.getById(id)
    if (!record || record.userId !== userId) {
      return c.json({ message: 'Not found' }, 404)
    }

    await vcardsService.deleteById(id)
    await urlsService.deleteUrl(record.shortId)
    return c.json({ success: true })
  }
}

const findAvailableSlug = async (service: VcardsService, userId: string, baseSlug: string) => {
  let attempt = 0
  let candidate = baseSlug

  while (attempt < MAX_SLUG_ATTEMPTS) {
    const existing = await service.getByUserIdAndSlug(userId, candidate)
    if (!existing) {
      return candidate
    }
    attempt += 1
    candidate = `${baseSlug}-${attempt + 1}`
  }

  return `${baseSlug}-${Date.now()}`
}
