import { Hono } from 'hono'

import type { UsersService } from './service'
import type { AppBindings } from '../../shared/http/types'
import { checkUsernameHandler, getMeHandler, updateMeHandler } from './handlers'

export const registerUsersRoutes = (app: Hono<AppBindings>, service: UsersService) => {
  app.get('/users/me', getMeHandler(service))
  app.patch('/users/me', updateMeHandler(service))
  app.post('/users/username/check', checkUsernameHandler(service))
}
