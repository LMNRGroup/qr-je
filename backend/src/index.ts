import { Hono } from 'hono'

import { createAuthMiddleware } from './shared/http/auth'
import { registerUrlsRoutes } from './domains/urls/routes'
import { createUrlsService } from './domains/urls/service'
import { createUsersService } from './domains/users/service'
import { registerVcardsRoutes } from './domains/vcards/routes'
import { createVcardsService } from './domains/vcards/service'
import { getUrlsStorage, getUsersStorage, getVcardsStorage } from './infra/storage/factory'
import type { AppBindings } from './shared/http/types'

const app = new Hono<AppBindings>()

const usersService = createUsersService(getUsersStorage())
const authMiddleware = createAuthMiddleware({
  usersService,
  publicPaths: ['/r/']
})
app.use('*', authMiddleware)

const urlsService = createUrlsService(getUrlsStorage())
registerUrlsRoutes(app, urlsService)

const vcardsService = createVcardsService(getVcardsStorage())
registerVcardsRoutes(app, vcardsService, urlsService)

export default app
