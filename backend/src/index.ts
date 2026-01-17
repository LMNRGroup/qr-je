import { Hono } from 'hono'

import { registerUrlsRoutes } from './domains/urls/routes'
import { createUrlsService } from './domains/urls/service'
import { createUsersService } from './domains/users/service'
import { registerVcardsRoutes } from './domains/vcards/routes'
import { createVcardsService } from './domains/vcards/service'
import { registerBillingRoutes } from './domains/billing/routes'
import { createBillingService } from './domains/billing/service'
import { getBillingStorage, getUrlsStorage, getUsersStorage, getVcardsStorage } from './infra/storage/factory'
import { createAuthMiddleware } from './shared/http/auth'
import type { AppBindings } from './shared/http/types'

const app = new Hono<AppBindings>()

const usersService = createUsersService(getUsersStorage())
const authMiddleware = createAuthMiddleware({
  usersService,
  publicPaths: ['/r/', '/billing/webhooks/stripe']
})
app.use('*', authMiddleware)

app.get('/health', (c) => c.json({ message: 'Healthy!' }))
const urlsService = createUrlsService(getUrlsStorage())
registerUrlsRoutes(app, urlsService)

const vcardsService = createVcardsService(getVcardsStorage())
registerVcardsRoutes(app, vcardsService, urlsService)

const billingService = createBillingService(getBillingStorage())
registerBillingRoutes(app, billingService, usersService)

export default app
