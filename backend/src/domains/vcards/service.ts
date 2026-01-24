import { VcardsStorage } from './storage/interface'
import { Vcard } from './models'

export type VcardsService = {
  createVcard: (vcard: Vcard) => Promise<Vcard>
  getById: (id: string) => Promise<Vcard | null>
  getByUserId: (userId: string) => Promise<Vcard[]>
  getByUserIdAndSlug: (userId: string, slug: string) => Promise<Vcard | null>
  getBySlug: (slug: string) => Promise<Vcard | null>
  getByShortId: (shortId: string) => Promise<Vcard | null>
  deleteById: (id: string) => Promise<void>
}

export const createVcardsService = (storage: VcardsStorage): VcardsService => {
  const createVcard = async (vcard: Vcard) => {
    await storage.createVcard(vcard)
    return vcard
  }

  const getById = async (id: string) => {
    return storage.getById(id)
  }

  const getByUserId = async (userId: string) => {
    return storage.getByUserId(userId)
  }

  const getByUserIdAndSlug = async (userId: string, slug: string) => {
    return storage.getByUserIdAndSlug(userId, slug)
  }

  const getBySlug = async (slug: string) => {
    return storage.getBySlug(slug)
  }

  const getByShortId = async (shortId: string) => {
    return storage.getByShortId(shortId)
  }

  const deleteById = async (id: string) => {
    await storage.deleteById(id)
  }

  return {
    createVcard,
    getById,
    getByUserId,
    getByUserIdAndSlug,
    getBySlug,
    getByShortId,
    deleteById
  }
}
