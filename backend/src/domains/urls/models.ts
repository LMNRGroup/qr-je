export type UrlId = string
export type UrlRandom = string

export type Url = {
  id: UrlId
  random: UrlRandom
  userId: string
  virtualCardId: string | null
  targetUrl: string
  createdAt: string
}

export type CreateUrlPayload = {
  targetUrl: string
  virtualCardId?: string | null
}

export type CreateUrlInput = CreateUrlPayload & {
  userId: string
}

export type ResolveUrlInput = {
  id: UrlId
  random: UrlRandom
}
