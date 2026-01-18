import { Hono } from 'hono'

import {
  createUrlHandler,
  deleteUrlHandler,
  publicUrlDetailsHandler,
  listUrlsHandler,
  redirectUrlHandler,
  updateUrlHandler
} from './handlers'
import { getScanCountHandler, listScansHandler } from '../scans/handlers'
import { UrlsService } from './service'
import type { ScansService } from '../scans/service'
import type { AppBindings } from '../../shared/http/types'

export const registerUrlsRoutes = (
  app: Hono<AppBindings>,
  service: UrlsService,
  scansService: ScansService
) => {
  app.post('/urls', createUrlHandler(service))
  app.get('/r/:id/:random', redirectUrlHandler(service, scansService))
  app.get('/public/urls/:id/:random', publicUrlDetailsHandler(service))
  app.get('/urls/:id/:random/scans/count', getScanCountHandler(scansService, service))
  app.get('/urls/:id/:random/scans', listScansHandler(scansService, service))
  app.get('/urls', listUrlsHandler(service))
  app.patch('/urls/:id', updateUrlHandler(service))
  app.delete('/urls/:id', deleteUrlHandler(service))
}
