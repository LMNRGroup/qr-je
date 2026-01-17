import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { registerUrlsRoutes } from './domains/urls/routes'
import { createUrlsService } from './domains/urls/service'
import { createUsersService } from './domains/users/service'
import { registerVcardsRoutes } from './domains/vcards/routes'
import { createVcardsService } from './domains/vcards/service'
import { getUrlsStorage, getUsersStorage, getVcardsStorage } from './infra/storage/factory'
import { createAuthMiddleware } from './shared/http/auth'
import type { AppBindings } from './shared/http/types'

const app = new Hono<AppBindings>()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
)
app.options('*', (c) => c.text('', 204))

const usersService = createUsersService(getUsersStorage())
const authMiddleware = createAuthMiddleware({
  usersService,
  publicPaths: ['/health', '/r/']
})
app.use('*', authMiddleware)

app.get('/health', (c) => c.json({ message: 'Healthy!' }))
const urlsService = createUrlsService(getUrlsStorage())
registerUrlsRoutes(app, urlsService)

const vcardsService = createVcardsService(getVcardsStorage())
registerVcardsRoutes(app, vcardsService, urlsService)

export default app
