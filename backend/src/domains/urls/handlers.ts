import type { Context } from 'hono'

import { buildShortUrl } from '../../config/env'
import { UrlConflictError, UrlNotFoundError, UrlValidationError } from './errors'
import { UrlsService } from './service'
import type { ScansService } from '../scans/service'
import { parseCreateUrlInput, parseResolveParams, parseUpdateUrlInput } from './validators'
import type { AppBindings } from '../../shared/http/types'

export const createUrlHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const payload = await c.req.json()
      const input = parseCreateUrlInput(payload)
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const url = await service.createUrl({ ...input, userId })

      return c.json(
        {
          id: url.id,
          random: url.random,
          targetUrl: url.targetUrl,
          name: url.name ?? null,
          virtualCardId: url.virtualCardId ?? null,
          shortUrl: buildShortUrl(url.id, url.random),
          createdAt: url.createdAt,
          options: url.options ?? null,
          kind: url.kind ?? null
        },
        201
      )
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlConflictError) {
        return c.json({ message: error.message }, 409)
      }

      throw error
    }
  }
}

const getClientIp = (c: Context<AppBindings>) => {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  return c.req.header('x-real-ip') ?? c.req.header('cf-connecting-ip') ?? null
}

export const redirectUrlHandler = (service: UrlsService, scansService?: ScansService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)
      if (scansService) {
        try {
          await scansService.recordScan({
            urlId: url.id,
            urlRandom: url.random,
            userId: url.userId,
            ip: getClientIp(c),
            userAgent: c.req.header('user-agent') ?? null
          })
        } catch (scanError) {
          console.error('[scan] failed to record scan', scanError)
        }
      }

      return c.redirect(url.targetUrl, 302)
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}

export const publicUrlDetailsHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)
      return c.json({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        createdAt: url.createdAt,
        options: url.options ?? null,
        kind: url.kind ?? null
      })
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}

export const listUrlsHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const urls = await service.getUrlsForUser(userId)
    return c.json(
      urls.map((url) => ({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        createdAt: url.createdAt,
        options: url.options ?? null,
        kind: url.kind ?? null
      }))
    )
  }
}

export const updateUrlHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const id = c.req.param('id')
      if (!id) {
        return c.json({ message: 'id is required' }, 400)
      }

      const payload = await c.req.json()
      const updates = parseUpdateUrlInput(payload)
      const url = await service.updateUrl(id, userId, updates)

      return c.json({
        id: url.id,
        random: url.random,
        targetUrl: url.targetUrl,
        name: url.name ?? null,
        shortUrl: buildShortUrl(url.id, url.random),
        createdAt: url.createdAt,
        options: url.options ?? null,
        kind: url.kind ?? null
      })
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof UrlNotFoundError) {
        return c.json({ message: error.message }, 404)
      }

      throw error
    }
  }
}

export const deleteUrlHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const id = c.req.param('id')
    if (!id) {
      return c.json({ message: 'id is required' }, 400)
    }

    await service.deleteUrl(id)
    return c.json({ success: true })
  }
}
