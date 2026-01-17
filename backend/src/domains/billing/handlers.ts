import type { Context } from 'hono'
import { createHmac, timingSafeEqual } from 'crypto'

import { BillingStripeError, BillingValidationError } from './errors'
import type { BillingService } from './service'
import { parseCreateCheckoutSessionInput, parseCreatePortalSessionInput } from './validators'
import type { UsersService } from '../users/service'
import type { AppBindings } from '../../shared/http/types'
import { getStripeWebhookSecret } from '../../config/stripe'

const SIGNATURE_TOLERANCE_SECONDS = 300

export const createCheckoutSessionHandler = (service: BillingService, usersService: UsersService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const payload = await c.req.json()
      const input = parseCreateCheckoutSessionInput(payload)
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const user = await usersService.getById(userId)
      const url = await service.createCheckoutSession(userId, user?.email ?? null, input.priceId)

      return c.json({ url })
    } catch (error) {
      if (error instanceof BillingValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof BillingStripeError) {
        return c.json({ message: error.message }, 502)
      }

      throw error
    }
  }
}

export const createPortalSessionHandler = (service: BillingService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const payload = await c.req.json()
      const input = parseCreatePortalSessionInput(payload)
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const url = await service.createPortalSession(userId, input.returnUrl)
      return c.json({ url })
    } catch (error) {
      if (error instanceof BillingValidationError) {
        return c.json({ message: error.message }, 400)
      }

      if (error instanceof BillingStripeError) {
        return c.json({ message: error.message }, 502)
      }

      throw error
    }
  }
}

export const syncSubscriptionHandler = (service: BillingService, usersService: UsersService) => {
  return async (c: Context<AppBindings>) => {
    try {
      const userId = c.get('userId')

      if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401)
      }

      const user = await usersService.getById(userId)
      const customer = await service.getOrCreateCustomer(userId, user?.email ?? null)
      const cache = await service.syncSubscriptionData(customer.stripeCustomerId)
      return c.json({ subscription: cache })
    } catch (error) {
      if (error instanceof BillingStripeError) {
        return c.json({ message: error.message }, 502)
      }

      throw error
    }
  }
}

export const getSubscriptionHandler = (service: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const cache = await service.getSubscriptionForUser(userId)
    return c.json({ subscription: cache })
  }
}

export const stripeWebhookHandler = (service: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const signature = c.req.header('Stripe-Signature')
    if (!signature) {
      return c.json({ message: 'Missing Stripe-Signature header' }, 400)
    }

    const payload = await c.req.text()
    const webhookSecret = getStripeWebhookSecret()
    const verified = await verifyStripeSignature(payload, signature, webhookSecret)

    if (!verified) {
      return c.json({ message: 'Invalid Stripe signature' }, 400)
    }

    const event = JSON.parse(payload) as { id: string; type: string; data?: { object?: { customer?: string } } }
    await service.recordStripeEvent(event)

    return c.json({ received: true })
  }
}

const verifyStripeSignature = async (payload: string, header: string, secret: string) => {
  const elements = header.split(',').map((part) => part.trim())
  const timestampPart = elements.find((part) => part.startsWith('t='))
  const signatureParts = elements.filter((part) => part.startsWith('v1='))

  if (!timestampPart || signatureParts.length === 0) {
    return false
  }

  const timestamp = Number.parseInt(timestampPart.replace('t=', ''), 10)
  if (!Number.isFinite(timestamp)) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex')

  return signatureParts.some((part) => {
    const signature = part.replace('v1=', '')
    if (signature.length !== expected.length) {
      return false
    }

    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  })
}
