import type { Context } from 'hono'

import type { ScansService } from './service'
import type { UrlsService } from '../urls/service'
import type { AppBindings } from '../../shared/http/types'
import { parseResolveParams } from '../urls/validators'
import { UrlValidationError, UrlNotFoundError } from '../urls/errors'

export const getScanCountHandler = (scansService: ScansService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      const params = parseResolveParams(c.req.param())
      const url = await urlsService.resolveUrl(params)

      if (url.userId !== userId) {
        return c.json({ message: 'Not found' }, 404)
      }

      const count = await scansService.getScanCount(url.id, url.random)
      return c.json({ count })
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

export const listScansHandler = (scansService: ScansService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      const params = parseResolveParams(c.req.param())
      const url = await urlsService.resolveUrl(params)

      if (url.userId !== userId) {
        return c.json({ message: 'Not found' }, 404)
      }

      const scans = await scansService.getScansForUrl(url.id, url.random, 100)
      return c.json(scans)
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
