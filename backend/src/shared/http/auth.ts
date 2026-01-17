import type { MiddlewareHandler } from 'hono'

import { verifySupabaseToken } from '../auth/supabase'
import type { UsersService } from '../../domains/users/service'
import type { AppBindings } from './types'

export type AuthMiddlewareOptions = {
  usersService: UsersService
  publicPaths?: string[]
}

export const createAuthMiddleware = ({ usersService, publicPaths = [] }: AuthMiddlewareOptions) => {
  const middleware: MiddlewareHandler<AppBindings> = async (c, next) => {
    if (isPublicPath(c.req.path, publicPaths)) {
      await next()
      return
    }

    const authorization = c.req.header('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ message: 'Authorization token required' }, 401)
    }

    const token = authorization.replace('Bearer ', '').trim()

    try {
      const verified = await verifySupabaseToken(token)
      await usersService.upsertUser({
        id: verified.userId,
        name: verified.name,
        email: verified.email
      })
      c.set('userId', verified.userId)
      await next()
    } catch (error) {
      return c.json({ message: 'Invalid token' }, 401)
    }
  }

  return middleware
}

const isPublicPath = (path: string, publicPaths: string[]) => {
  return publicPaths.some((publicPath) => path.startsWith(publicPath))
}
