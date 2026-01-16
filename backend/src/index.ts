import { Hono } from 'hono'

import { registerUrlsRoutes } from './domains/urls/routes'
import { createUrlsService } from './domains/urls/service'
import { getUrlsStorage } from './infra/storage/factory'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const urlsService = createUrlsService(getUrlsStorage())
registerUrlsRoutes(app, urlsService)

export default app
