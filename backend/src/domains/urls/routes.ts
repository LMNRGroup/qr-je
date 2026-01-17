import { Hono } from 'hono'

import { createUrlHandler, deleteUrlHandler, listUrlsHandler, redirectUrlHandler } from './handlers'
import { UrlsService } from './service'
import type { AppBindings } from '../../shared/http/types'

export const registerUrlsRoutes = (app: Hono<AppBindings>, service: UrlsService) => {
  app.post('/urls', createUrlHandler(service))
  app.get('/r/:id/:random', redirectUrlHandler(service))
  app.get('/urls', listUrlsHandler(service))
  app.delete('/urls/:id', deleteUrlHandler(service))
}
