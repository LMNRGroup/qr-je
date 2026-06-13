import type { Context } from 'hono'

import { UrlValidationError } from '../urls/errors'
import type { AppBindings } from '../../shared/http/types'
import type { UrlsService } from '../urls/service'
import type { BillingService } from '../billing/service'
import { buildVcardPublicUrl, resolveLegacyVcardMatch, withStoredVcardAliases } from '../urls/public-links'
import { parseCreateVcardInput, parseUpdateVcardInput } from './validators'
import type { VcardsService } from './service'
import { Vcard } from './models'
import { buildUrlResponse } from './response'

const MAX_SLUG_ATTEMPTS = 20

export const createVcardHandler = (
  vcardsService: VcardsService,
  urlsService: UrlsService,
  billingService: BillingService
) => {
  return async (c: Context<AppBindings>) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const payload = await c.req.json()
      const input = parseCreateVcardInput(payload)

      const baseSlug = input.slug ?? `${userId}-vcard`
      const slug = await findAvailableSlug(vcardsService, userId, baseSlug)
      const [userUrls, entitlements] = await Promise.all([
        urlsService.getUrlsForUser(userId),
        billingService.getEntitlements(userId)
      ])

      if (
        entitlements.dynamicQrCodeLimit !== null &&
        userUrls.length >= entitlements.dynamicQrCodeLimit
      ) {
        return c.json({
          message: `Your ${entitlements.plan} plan supports ${entitlements.dynamicQrCodeLimit} dynamic QR code${entitlements.dynamicQrCodeLimit === 1 ? '' : 's'}. Upgrade to create more.`,
          code: 'DYNAMIC_QR_LIMIT_REACHED'
        }, 402)
      }

      const publicUrl = buildVcardPublicUrl({ userId, slug })
      const urlOptions = withStoredVcardAliases(
        {
          id: '',
          userId,
          targetUrl: input.publicUrl,
          name: null,
          kind: input.kind,
          options: input.options ?? null,
        },
        slug
      )

      const url = await urlsService.createUrl({
        userId,
        targetUrl: publicUrl,
        options: urlOptions,
        kind: input.kind
      })

      const vcard: Vcard = {
        id: crypto.randomUUID(),
        userId,
        slug,
        publicUrl,
        shortId: url.id,
        shortRandom: url.random,
        data: input.data,
        createdAt: new Date().toISOString()
      }

      try {
        const saved = await vcardsService.createVcard(vcard)
        return c.json({
          vcard: saved,
          url: buildUrlResponse(url, saved)
        }, 201)
      } catch (error) {
        await urlsService.deleteUrl(url.id)
        const message = error instanceof Error ? error.message : 'Failed to save vcard'
        console.error('[vcards] create failed', message)
        return c.json({ message: 'Failed to create vcard', reason: message }, 500)
      }
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }
      const message = error instanceof Error ? error.message : 'Failed to create vcard'
      console.error('[vcards] create failed', message)
      return c.json({ message: 'Failed to create vcard', reason: message }, 500)
    }
  }
}

export const updateVcardHandler = (vcardsService: VcardsService, urlsService: UrlsService) => {
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

      const record = await vcardsService.getById(id)
      if (!record || record.userId !== userId) {
        return c.json({ message: 'Not found' }, 404)
      }

      const payload = await c.req.json()
      const input = parseUpdateVcardInput(payload)

      const saved = await vcardsService.updateVcard(id, input.data)
      if (!saved) {
        return c.json({ message: 'Not found' }, 404)
      }

      let url = await urlsService.getById(record.shortId)
      if (!url || url.userId !== userId) {
        return c.json({ message: 'Short url not found' }, 404)
      }

      if (input.name !== undefined || input.options !== undefined || input.kind !== undefined) {
        const nextOptions = withStoredVcardAliases(
          {
            id: url.id,
            userId,
            targetUrl: url.targetUrl,
            name: input.name ?? url.name ?? null,
            kind: input.kind ?? url.kind ?? null,
            options: input.options === undefined ? url.options ?? null : input.options,
          },
          record.slug
        )
        url = await urlsService.updateUrl(record.shortId, userId, {
          name: input.name,
          options: nextOptions,
          kind: input.kind
        })
      }

      return c.json({
        vcard: saved,
        url: buildUrlResponse(url, saved)
      })
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return c.json({ message: error.message }, 400)
      }

      const message = error instanceof Error ? error.message : 'Failed to update vcard'
      console.error('[vcards] update failed', message)
      return c.json({ message: 'Failed to update vcard', reason: message }, 500)
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

export const publicVcardHandler = (vcardsService: VcardsService, urlsService: UrlsService) => {
  return async (c: Context<AppBindings>) => {
    const slug = c.req.param('slug')
    if (!slug) {
      return c.json({ message: 'slug is required' }, 400)
    }

    const match = await resolveLegacyVcardMatch(urlsService, vcardsService, slug)
    if (!match) {
      return c.json({ message: 'Not found' }, 404)
    }

    return c.json({
      ...match.vcard,
      publicUrl: buildVcardPublicUrl(match.vcard)
    })
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
