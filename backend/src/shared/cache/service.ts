export type CacheService<T> = {
  get: (key: string) => Promise<T | null>
  set: (key: string, value: T) => Promise<void>
  deletePrefix: (prefix: string) => Promise<void>
}

type CacheOptions = {
  ttlMs: number
  maxEntries: number
  redisUrl?: string
  redisToken?: string
}

export const createCacheService = <T>(options: CacheOptions): CacheService<T> => {
  if (options.redisUrl && options.redisToken) {
    return createRedisCacheService<T>(options.redisUrl, options.redisToken, Math.ceil(options.ttlMs / 1000))
  }

  return createMemoryCacheService<T>(options.ttlMs, options.maxEntries)
}

export const createMemoryCacheService = <T>(ttlMs: number, maxEntries: number): CacheService<T> => {
  const entries = new Map<string, { expiresAt: number; value: T }>()

  const get = async (key: string) => {
    const entry = entries.get(key)
    if (!entry) return null

    if (entry.expiresAt <= Date.now()) {
      entries.delete(key)
      return null
    }

    return entry.value
  }

  const set = async (key: string, value: T) => {
    if (!entries.has(key) && entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value
      if (oldestKey !== undefined) entries.delete(oldestKey)
    }

    entries.set(key, {
      // ponytail: per-process TTL cache; use Redis if cross-instance coherence matters.
      expiresAt: Date.now() + ttlMs,
      value
    })
  }

  const deletePrefix = async (prefix: string) => {
    for (const key of entries.keys()) {
      if (key.startsWith(prefix)) {
        entries.delete(key)
      }
    }
  }

  return { get, set, deletePrefix }
}

const createRedisCacheService = <T>(url: string, token: string, ttlSeconds: number): CacheService<T> => {
  const command = async <R>(args: Array<string | number>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    })

    const payload = (await response.json()) as { result?: R; error?: string }
    if (!response.ok || payload.error) {
      throw new Error(payload.error ?? `Redis request failed (${response.status})`)
    }

    return payload.result as R
  }

  const get = async (key: string) => {
    try {
      const cached = await command<string | null>(['GET', key])
      return cached ? (JSON.parse(cached) as T) : null
    } catch (error) {
      console.warn('[cache] get failed', error)
      return null
    }
  }

  const set = async (key: string, value: T) => {
    try {
      await command<string>(['SET', key, JSON.stringify(value), 'EX', ttlSeconds])
    } catch (error) {
      console.warn('[cache] set failed', error)
    }
  }

  const deletePrefix = async (prefix: string) => {
    try {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await command<[string, string[]]>(['SCAN', cursor, 'MATCH', `${prefix}*`, 'COUNT', 100])
        cursor = String(nextCursor)
        if (keys.length > 0) {
          await command<number>(['DEL', ...keys])
        }
      } while (cursor !== '0')
    } catch (error) {
      console.warn('[cache] deletePrefix failed', error)
    }
  }

  return { get, set, deletePrefix }
}
