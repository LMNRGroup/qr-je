import { Hono } from 'hono'

import { registerUrlsRoutes } from './domains/urls/routes'
import { createUrlsService } from './domains/urls/service'
import { getUrlsStorage } from './infra/storage/factory'
import type { AppBindings } from './shared/http/types'

const app = new Hono<AppBindings>()

// const usersService = createUsersService(getUsersStorage())
// const authMiddleware = createAuthMiddleware({
//   usersService,
//   publicPaths: ['/r/']
// })

// app.use('*', authMiddleware)

const urlsService = createUrlsService(getUrlsStorage())
registerUrlsRoutes(app, urlsService)

export default app
