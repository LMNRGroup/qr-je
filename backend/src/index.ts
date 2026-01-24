import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { registerUrlsRoutes } from './domains/urls/routes'
import { createUrlsService } from './domains/urls/service'
import { createUsersService } from './domains/users/service'
import { registerUsersRoutes } from './domains/users/routes'
import { registerVcardsRoutes } from './domains/vcards/routes'
import { createVcardsService } from './domains/vcards/service'
import { createScansService } from './domains/scans/service'
import { getScansStorage, getUrlsStorage, getUsersStorage, getVcardsStorage } from './infra/storage/factory'
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
app.options('*', (c) => c.text(''))

const usersService = createUsersService(getUsersStorage())
const authMiddleware = createAuthMiddleware({
  usersService,
  publicPaths: ['/health', '/r/', '/public/', '/adaptive/', '/debug/auth', '/users/username/check', '/favicon.ico', '/favicon.png']
})
app.use('*', authMiddleware)

app.get('/health', (c) => c.json({ message: 'Healthy!' }))
app.get('/debug/auth', (c) => {
  const auth = c.req.header('Authorization') ?? ''
  return c.json({
    hasAuth: auth.length > 0,
    startsWithBearer: auth.startsWith('Bearer '),
    length: auth.length
  })
})
registerUsersRoutes(app, usersService)
const urlsService = createUrlsService(getUrlsStorage())
const scansService = createScansService(getScansStorage())
const vcardsService = createVcardsService(getVcardsStorage())
registerUrlsRoutes(app, urlsService, scansService, vcardsService)

registerVcardsRoutes(app, vcardsService, urlsService)

export default app
