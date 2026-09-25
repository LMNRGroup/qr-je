export type UrlId = string
export type UrlRandom = string

export type Url = {
  id: UrlId
  random: UrlRandom
  userId: string
  targetUrl: string
  name?: string | null
  createdAt: string
  virtualCardId?: string | null
  options?: Record<string, unknown> | null
  kind?: string | null
}

export type CreateUrlPayload = {
  targetUrl: string
  virtualCardId?: string | null
  name?: string | null
  options?: Record<string, unknown> | null
  kind?: string | null
}

export type UpdateUrlPayload = {
  targetUrl?: string
  name?: string | null
  options?: Record<string, unknown> | null
  kind?: string | null
}

export type UrlQuota = {
  dynamicQrCodeLimit: number | null
  adaptiveQrCodeLimit: number
}

export type UrlQuotaViolation = {
  code: 'DYNAMIC_QR_LIMIT_REACHED' | 'ADAPTIVE_QR_LIMIT_REACHED'
  limit: number
}

export type CreateUrlInput = CreateUrlPayload & {
  userId: string
}

export type ResolveUrlInput = {
  id: UrlId
  random: UrlRandom
}
