export type UrlId = string
export type UrlRandom = string

export type Url = {
  id: UrlId
  random: UrlRandom
  userId: string
  targetUrl: string
  createdAt: string
  virtualCardId?: string | null
  options?: Record<string, unknown> | null
  kind?: string | null
}

export type CreateUrlPayload = {
  targetUrl: string
  virtualCardId?: string | null
  options?: Record<string, unknown> | null
  kind?: string | null
}

export type CreateUrlInput = CreateUrlPayload & {
  userId: string
}

export type ResolveUrlInput = {
  id: UrlId
  random: UrlRandom
}
