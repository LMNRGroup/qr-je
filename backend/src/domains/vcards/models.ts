export type Vcard = {
  id: string
  userId: string
  slug: string
  publicUrl: string
  shortId: string
  shortRandom: string
  data: Record<string, unknown>
  createdAt: string
}

export type CreateVcardPayload = {
  slug?: string | null
  publicUrl: string
  data: Record<string, unknown>
  options?: Record<string, unknown> | null
}

export type CreateVcardInput = CreateVcardPayload & {
  userId: string
}
