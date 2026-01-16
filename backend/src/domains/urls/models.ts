export type UrlId = string
export type UrlRandom = string

export type Url = {
  id: UrlId
  random: UrlRandom
  targetUrl: string
  createdAt: string
}

export type CreateUrlInput = {
  targetUrl: string
}

export type ResolveUrlInput = {
  id: UrlId
  random: UrlRandom
}
