import { InMemoryUrlsStorageAdapter } from '../../domains/urls/storage/memory.adapter'
import { UrlsStorage } from '../../domains/urls/storage/interface'
import { InMemoryUsersStorageAdapter } from '../../domains/users/storage/memory.adapter'
import { UsersStorage } from '../../domains/users/storage/interface'

let urlsStorage: UrlsStorage | null = null
let usersStorage: UsersStorage | null = null

export const getUrlsStorage = () => {
  if (!urlsStorage) {
    urlsStorage = new InMemoryUrlsStorageAdapter()
  }

  return urlsStorage
}

export const getUsersStorage = () => {
  if (!usersStorage) {
    usersStorage = new InMemoryUsersStorageAdapter()
  }

  return usersStorage
}
