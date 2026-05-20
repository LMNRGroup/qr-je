import { Hono } from 'hono'

import { createVcardHandler, deleteVcardHandler, listVcardsHandler, publicVcardHandler, updateVcardHandler } from './handlers'
import type { VcardsService } from './service'
import type { UrlsService } from '../urls/service'
import type { AppBindings } from '../../shared/http/types'

export const registerVcardsRoutes = (
  app: Hono<AppBindings>,
  vcardsService: VcardsService,
  urlsService: UrlsService
) => {
  app.post('/vcards', createVcardHandler(vcardsService, urlsService))
  app.get('/vcards', listVcardsHandler(vcardsService))
  app.patch('/vcards/:id', updateVcardHandler(vcardsService, urlsService))
  app.get('/public/vcards/:slug', publicVcardHandler(vcardsService, urlsService))
  app.delete('/vcards/:id', deleteVcardHandler(vcardsService, urlsService))
}
