import type { Context } from 'hono'

import type { UsersService } from './service'
import type { UpdateUserInput } from './models'
import { normalizeUsername, validateUsername } from './validators'
import type { AppBindings } from '../../shared/http/types'

const USERNAME_CHANGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const AVATAR_TYPES = new Set(['neutral', 'cap', 'bun', 'letter'])
const AVATAR_COLORS = new Set(['purple', 'graphite', 'blue', 'gold'])

export const getMeHandler = (usersService: UsersService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const user = await usersService.getById(userId)
    if (!user) {
      return c.json({ message: 'User not found' }, 404)
    }

    return c.json(user)
  }
}

export const updateMeHandler = (usersService: UsersService) => {
  return async (c: Context<AppBindings>) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const payload = await c.req.json()
    const updates: UpdateUserInput = {}

    if (typeof payload.name === 'string') {
      updates.name = payload.name.trim() || null
    }
    if (typeof payload.timezone === 'string') {
      updates.timezone = payload.timezone.trim() || null
    }
    if (typeof payload.language === 'string') {
      updates.language = payload.language.trim() || null
    }
    if (typeof payload.theme === 'string') {
      updates.theme = payload.theme.trim() || null
    }
    if (typeof payload.avatarType === 'string') {
      const normalized = payload.avatarType.trim()
      if (!AVATAR_TYPES.has(normalized)) {
        return c.json({ message: 'Invalid avatar type.' }, 400)
      }
      updates.avatarType = normalized
    }
    if (typeof payload.avatarColor === 'string') {
      const normalized = payload.avatarColor.trim()
      if (!AVATAR_COLORS.has(normalized)) {
        return c.json({ message: 'Invalid avatar color.' }, 400)
      }
      updates.avatarColor = normalized
    }

    if (typeof payload.username === 'string') {
      const validation = validateUsername(payload.username)
      if (!validation.ok) {
        return c.json({ message: validation.message, code: 'USERNAME_INVALID' }, 400)
      }

      const normalized = validation.value
      const existing = await usersService.getById(userId)
      const currentNormalized = existing?.username ? normalizeUsername(existing.username) : null
      const lastChangedAt = existing?.usernameChangedAt
      if (currentNormalized && currentNormalized === normalized) {
        // No change requested.
      } else if (existing?.username && lastChangedAt) {
        const lastDate = new Date(lastChangedAt)
        if (!Number.isNaN(lastDate.getTime())) {
          const elapsed = Date.now() - lastDate.getTime()
          if (elapsed < USERNAME_CHANGE_WINDOW_MS) {
            const retryAt = new Date(lastDate.getTime() + USERNAME_CHANGE_WINDOW_MS).toISOString()
            return c.json(
              { message: 'Username can only be changed every 30 days.', retryAt },
              409
            )
          }
        }
      }

      if (!currentNormalized || currentNormalized !== normalized) {
        const existingUser = await usersService.getByUsername(normalized)
        if (existingUser && existingUser.id !== userId) {
          return c.json({ message: 'Username is already taken.', code: 'USERNAME_TAKEN' }, 409)
        }

        updates.username = normalized
        updates.usernameChangedAt = new Date().toISOString()
      }
    }

    const updated = await usersService.updateUser(userId, updates)
    if (!updated) {
      return c.json({ message: 'User not found' }, 404)
    }

    return c.json(updated)
  }
}

export const checkUsernameHandler = (usersService: UsersService) => {
  return async (c: Context<AppBindings>) => {
    const payload = await c.req.json()
    if (!payload?.username || typeof payload.username !== 'string') {
      return c.json({ message: 'username is required' }, 400)
    }

    const validation = validateUsername(payload.username)
    if (!validation.ok) {
      return c.json({ available: false, message: validation.message }, 200)
    }

    const normalized = validation.value
    const user = await usersService.getByUsername(normalized)
    return c.json({ available: !user, username: normalized })
  }
}
