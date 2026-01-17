import { InMemoryUrlsStorageAdapter } from '../../domains/urls/storage/memory.adapter'
import { DrizzleUrlsStorageAdapter } from '../../domains/urls/storage/drizzle.adapter'
import { UrlsStorage } from '../../domains/urls/storage/interface'
import { InMemoryUsersStorageAdapter } from '../../domains/users/storage/memory.adapter'
import { DrizzleUsersStorageAdapter } from '../../domains/users/storage/drizzle.adapter'
import { UsersStorage } from '../../domains/users/storage/interface'

let urlsStorage: UrlsStorage | null = null
let usersStorage: UsersStorage | null = null

const shouldUseDatabase = () => {
  return Boolean(process.env.SUPABASE_DB_URL)
}

const logStorageChoice = (name: string, provider: 'drizzle' | 'memory') => {
  console.info(`[storage] ${name} -> ${provider}`)
}

export const getUrlsStorage = () => {
  if (!urlsStorage) {
    const useDatabase = shouldUseDatabase()
    urlsStorage = useDatabase
      ? new DrizzleUrlsStorageAdapter()
      : new InMemoryUrlsStorageAdapter()
    logStorageChoice('urls', useDatabase ? 'drizzle' : 'memory')
  }

  return urlsStorage
}

export const getUsersStorage = () => {
  if (!usersStorage) {
    const useDatabase = shouldUseDatabase()
    usersStorage = useDatabase
      ? new DrizzleUsersStorageAdapter()
      : new InMemoryUsersStorageAdapter()
    logStorageChoice('users', useDatabase ? 'drizzle' : 'memory')
  }

  return usersStorage
}
