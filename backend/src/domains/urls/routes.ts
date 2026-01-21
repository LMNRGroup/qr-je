import { Hono } from 'hono'

import {
  adaptiveResolveHandler,
  createUrlHandler,
  deleteUrlHandler,
  publicUrlDetailsHandler,
  listUrlsHandler,
  redirectUrlHandler,
  updateUrlHandler
} from './handlers'
import {
  getScanAreasHandler,
  getScanCountHandler,
  getUserScanSummaryHandler,
  getUserScanTrendsHandler,
  listScansHandler
} from '../scans/handlers'
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
  app.get('/adaptive/:id/:random', adaptiveResolveHandler(service, scansService))
  app.get('/public/urls/:id/:random', publicUrlDetailsHandler(service))
  app.get('/urls/:id/:random/scans/count', getScanCountHandler(scansService, service))
  app.get('/urls/:id/:random/scans', listScansHandler(scansService, service))
  app.get('/scans/summary', getUserScanSummaryHandler(scansService))
  app.get('/scans/trends', getUserScanTrendsHandler(scansService))
  app.get('/scans/areas', getScanAreasHandler())
  app.get('/urls', listUrlsHandler(service))
  app.patch('/urls/:id', updateUrlHandler(service))
  app.delete('/urls/:id', deleteUrlHandler(service, scansService))
}
