import { Vcard } from '../models'

export type VcardsStorage = {
  createVcard: (vcard: Vcard) => Promise<void>
  getById: (id: string) => Promise<Vcard | null>
  getByUserId: (userId: string) => Promise<Vcard[]>
  getByUserIdAndSlug: (userId: string, slug: string) => Promise<Vcard | null>
  getBySlug: (slug: string) => Promise<Vcard | null>
  deleteById: (id: string) => Promise<void>
}
