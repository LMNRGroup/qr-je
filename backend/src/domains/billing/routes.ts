import { Hono } from 'hono'

import type { AppBindings } from '../../shared/http/types'
import type { BillingService } from './service'
import {
  createCheckoutHandler,
  createPortalHandler,
  getBillingStatusHandler,
  syncBillingHandler,
  stripeWebhookHandler
} from './handlers'

export const registerBillingRoutes = (app: Hono<AppBindings>, service: BillingService) => {
  app.get('/billing/status', getBillingStatusHandler(service))
  app.post('/billing/sync', syncBillingHandler(service))
  app.post('/billing/checkout', createCheckoutHandler(service))
  app.post('/billing/portal', createPortalHandler(service))
  app.post('/billing/webhook', stripeWebhookHandler(service))
}
