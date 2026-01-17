import { Hono } from 'hono'

import {
  createCheckoutSessionHandler,
  createPortalSessionHandler,
  getSubscriptionHandler,
  stripeWebhookHandler,
  syncSubscriptionHandler
} from './handlers'
import type { BillingService } from './service'
import type { UsersService } from '../users/service'
import type { AppBindings } from '../../shared/http/types'

export const registerBillingRoutes = (
  app: Hono<AppBindings>,
  billingService: BillingService,
  usersService: UsersService
) => {
  app.post('/billing/checkout-session', createCheckoutSessionHandler(billingService, usersService))
  app.post('/billing/portal-session', createPortalSessionHandler(billingService))
  app.post('/billing/webhooks/stripe', stripeWebhookHandler(billingService))
  app.get('/billing/sync', syncSubscriptionHandler(billingService, usersService))
  app.get('/billing/subscription', getSubscriptionHandler(billingService))
}

