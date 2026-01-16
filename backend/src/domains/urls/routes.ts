import { Hono } from 'hono'

import { createUrlHandler, listUrlsHandler, redirectUrlHandler } from './handlers'
import { UrlsService } from './service'

export const registerUrlsRoutes = (app: Hono, service: UrlsService) => {
  app.post('/urls', createUrlHandler(service))
  app.get('/r/:id/:random', redirectUrlHandler(service))
  app.get('/urls', listUrlsHandler(service))
}
