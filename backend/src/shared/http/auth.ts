import type { MiddlewareHandler } from 'hono'

import { verifySupabaseToken } from '../auth/supabase'
import type { UsersService } from '../../domains/users/service'
import type { AppBindings } from './types'

export type AuthMiddlewareOptions = {
  usersService: UsersService
  publicPaths?: string[]
}

// In-memory cache to track when users were last synced
// Key: userId, Value: timestamp of last sync
const userSyncCache = new Map<string, number>()
const USER_SYNC_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

const shouldSyncUser = (userId: string): boolean => {
  const lastSync = userSyncCache.get(userId)
  if (!lastSync) return true
  const now = Date.now()
  return now - lastSync > USER_SYNC_CACHE_TTL_MS
}

const markUserSynced = (userId: string) => {
  userSyncCache.set(userId, Date.now())
  // Cleanup old entries periodically (keep cache size reasonable)
  if (userSyncCache.size > 10000) {
    const now = Date.now()
    for (const [id, timestamp] of userSyncCache.entries()) {
      if (now - timestamp > USER_SYNC_CACHE_TTL_MS * 2) {
        userSyncCache.delete(id)
      }
    }
  }
}

export const createAuthMiddleware = ({ usersService, publicPaths = [] }: AuthMiddlewareOptions) => {
  const middleware: MiddlewareHandler<AppBindings> = async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }

    if (isPublicPath(c.req.path, publicPaths)) {
      await next()
      return
    }

    const authorization = c.req.header('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      console.error('[auth] missing or invalid Authorization header')
      return c.json({ message: 'Authorization token required' }, 401)
    }

    const token = authorization.replace('Bearer ', '').trim()

    try {
      const verified = await verifySupabaseToken(token)
      // Only upsert user if not recently synced (cache miss or expired)
      if (shouldSyncUser(verified.userId)) {
        await usersService.upsertUser({
          id: verified.userId,
          name: verified.name,
          email: verified.email
        })
        markUserSynced(verified.userId)
      }
      // Set userId for downstream handlers (no need to return full user object)
      c.set('userId', verified.userId)
      await next()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown token error'
      console.error('[auth] token verification failed', message)
      return c.json({ message: 'Invalid token', reason: message }, 401)
    }
  }

  return middleware
}

const isPublicPath = (path: string, publicPaths: string[]) => {
  return publicPaths.some((publicPath) => path.startsWith(publicPath))
}
