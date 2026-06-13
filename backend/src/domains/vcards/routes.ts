import { Hono } from 'hono'

import { createVcardHandler, deleteVcardHandler, listVcardsHandler, publicVcardHandler } from './handlers'
import type { VcardsService } from './service'
import type { UrlsService } from '../urls/service'
import type { BillingService } from '../billing/service'
import type { AppBindings } from '../../shared/http/types'

export const registerVcardsRoutes = (
  app: Hono<AppBindings>,
  vcardsService: VcardsService,
  urlsService: UrlsService,
  billingService: BillingService
) => {
  app.post('/vcards', createVcardHandler(vcardsService, urlsService, billingService))
  app.get('/vcards', listVcardsHandler(vcardsService))
  app.get('/public/vcards/:slug', publicVcardHandler(vcardsService))
  app.delete('/vcards/:id', deleteVcardHandler(vcardsService, urlsService))
}
