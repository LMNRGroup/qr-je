import type { Context } from 'hono'

import { buildShortUrl } from '../../config/env'
import { UrlConflictError, UrlNotFoundError, UrlValidationError } from './errors'
import { UrlsService } from './service'
import { parseCreateUrlInput, parseResolveParams } from './validators'
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
          virtualCardId: url.virtualCardId,
          shortUrl: buildShortUrl(url.id, url.random)
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

export const redirectUrlHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const params = parseResolveParams(c.req.param())
      const url = await service.resolveUrl(params)

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

export const listUrlsHandler = (service: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const urls = await service.getUrlsForUser(userId)
    return c.json(urls)
  }
}
