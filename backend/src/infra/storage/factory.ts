import { InMemoryUrlsStorageAdapter } from '../../domains/urls/storage/memory.adapter'
import { DrizzleUrlsStorageAdapter } from '../../domains/urls/storage/drizzle.adapter'
import { SupabaseUrlsStorageAdapter } from '../../domains/urls/storage/supabase.adapter'
import { UrlsStorage } from '../../domains/urls/storage/interface'
import { InMemoryUsersStorageAdapter } from '../../domains/users/storage/memory.adapter'
import { DrizzleUsersStorageAdapter } from '../../domains/users/storage/drizzle.adapter'
import { UsersStorage } from '../../domains/users/storage/interface'
import { InMemoryVcardsStorageAdapter } from '../../domains/vcards/storage/memory.adapter'
import { SupabaseVcardsStorageAdapter } from '../../domains/vcards/storage/supabase.adapter'
import { VcardsStorage } from '../../domains/vcards/storage/interface'

let urlsStorage: UrlsStorage | null = null
let usersStorage: UsersStorage | null = null
let vcardsStorage: VcardsStorage | null = null

const shouldUseSupabase = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const shouldUseDatabase = () => {
  return Boolean(process.env.SUPABASE_DB_URL)
}

const logStorageChoice = (name: string, provider: 'drizzle' | 'memory' | 'supabase') => {
  console.info(`[storage] ${name} -> ${provider}`)
}

export const getUrlsStorage = () => {
  if (!urlsStorage) {
    const useDatabase = shouldUseDatabase()
    const useSupabase = shouldUseSupabase()
    if (useDatabase) {
      urlsStorage = new DrizzleUrlsStorageAdapter()
      logStorageChoice('urls', 'drizzle')
    } else if (useSupabase) {
      urlsStorage = new SupabaseUrlsStorageAdapter()
      logStorageChoice('urls', 'supabase')
    } else {
      urlsStorage = new InMemoryUrlsStorageAdapter()
      logStorageChoice('urls', 'memory')
    }
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

export const getVcardsStorage = () => {
  if (!vcardsStorage) {
    vcardsStorage = shouldUseSupabase()
      ? new SupabaseVcardsStorageAdapter()
      : new InMemoryVcardsStorageAdapter()
  }

  return vcardsStorage
}
