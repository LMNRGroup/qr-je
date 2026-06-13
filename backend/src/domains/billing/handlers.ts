import type { Context } from 'hono'

import type { AppBindings } from '../../shared/http/types'
import {
  BillingConfigurationError,
  BillingConflictError,
  BillingNotFoundError,
  BillingService,
  isPaidBillingPlan
} from './service'

export const getBillingStatusHandler = (billingService: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      return c.json(await billingService.getStatus(userId))
    } catch (error) {
      return handleBillingError(c, error)
    }
  }
}

export const syncBillingHandler = (billingService: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      return c.json(await billingService.syncUser(userId))
    } catch (error) {
      return handleBillingError(c, error)
    }
  }
}

export const createCheckoutHandler = (billingService: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const payload = await c.req.json().catch(() => null)
    if (!isPaidBillingPlan(payload?.plan)) {
      return c.json({ message: 'plan must be pro or command' }, 400)
    }

    try {
      return c.json({ url: await billingService.createCheckoutSession(userId, payload.plan) })
    } catch (error) {
      return handleBillingError(c, error)
    }
  }
}

export const createPortalHandler = (billingService: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      return c.json({ url: await billingService.createPortalSession(userId) })
    } catch (error) {
      return handleBillingError(c, error)
    }
  }
}

export const stripeWebhookHandler = (billingService: BillingService) => {
  return async (c: Context<AppBindings>) => {
    const signature = c.req.header('stripe-signature')
    if (!signature) {
      return c.json({ message: 'Stripe signature is required' }, 400)
    }

    try {
      await billingService.processWebhook(await c.req.text(), signature)
      return c.json({ received: true })
    } catch (error) {
      if (error instanceof BillingConfigurationError) {
        return c.json({ message: error.message }, 503)
      }

      const message = error instanceof Error ? error.message : 'Webhook verification failed'
      console.warn('[billing] webhook rejected', message)
      return c.json({ message: 'Invalid Stripe webhook' }, 400)
    }
  }
}

const handleBillingError = (c: Context<AppBindings>, error: unknown) => {
  if (error instanceof BillingNotFoundError) {
    return c.json({ message: error.message }, 404)
  }

  if (error instanceof BillingConflictError) {
    return c.json({ message: error.message }, 409)
  }

  if (error instanceof BillingConfigurationError) {
    return c.json({ message: error.message }, 503)
  }

  throw error
}
