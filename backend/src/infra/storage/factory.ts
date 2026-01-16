import { InMemoryUrlsStorageAdapter } from '../../domains/urls/storage/memory.adapter'
import { UrlsStorage } from '../../domains/urls/storage/interface'

let urlsStorage: UrlsStorage | null = null

export const getUrlsStorage = () => {
  if (!urlsStorage) {
    urlsStorage = new InMemoryUrlsStorageAdapter()
  }

  return urlsStorage
}
