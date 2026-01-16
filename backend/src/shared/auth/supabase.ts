import { getSupabaseConfig } from '../../config/supabase'

type Jwk = {
  kid?: string
  kty?: string
  alg?: string
  use?: string
  n?: string
  e?: string
}

type SupabaseTokenClaims = {
  sub?: string
  aud?: string | string[]
  iss?: string
  exp?: number
  user_metadata?: {
    full_name?: string
    name?: string
  }
}

const JWKS_TTL_MS = 10 * 60 * 1000
let cachedJwks: { keys: Jwk[]; fetchedAt: number } | null = null

export type VerifiedUser = {
  userId: string
  name: string | null
}

export const verifySupabaseToken = async (token: string): Promise<VerifiedUser> => {
  const config = getSupabaseConfig()
  const { header, payload, signature, signingInput } = parseJwt(token)

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported token algorithm')
  }

  const jwk = await getJwk(config.jwksUrl, header.kid)
  const verified = await verifySignature(jwk, signingInput, signature)

  if (!verified) {
    throw new Error('Invalid token signature')
  }

  if (!payload.sub || !payload.iss) {
    throw new Error('Token missing required claims')
  }

  if (payload.iss !== config.issuer) {
    throw new Error('Token issuer mismatch')
  }

  if (!matchesAudience(payload.aud, config.audience)) {
    throw new Error('Token audience mismatch')
  }

  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error('Token expired')
  }

  const name = payload.user_metadata?.full_name ?? payload.user_metadata?.name ?? null

  return {
    userId: payload.sub,
    name
  }
}

const parseJwt = (token: string) => {
  const parts = token.split('.')

  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const header = JSON.parse(decodeBase64Url(parts[0])) as { alg?: string; kid?: string }
  const payload = JSON.parse(decodeBase64Url(parts[1])) as SupabaseTokenClaims

  return {
    header,
    payload,
    signature: decodeBase64UrlBytes(parts[2]),
    signingInput: `${parts[0]}.${parts[1]}`
  }
}

const decodeBase64Url = (value: string) => {
  return Buffer.from(value, 'base64url').toString('utf-8')
}

const decodeBase64UrlBytes = (value: string) => {
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

const matchesAudience = (aud: SupabaseTokenClaims['aud'], expected: string) => {
  if (Array.isArray(aud)) {
    return aud.includes(expected)
  }

  return aud === expected
}

const getJwk = async (jwksUrl: string, kid?: string) => {
  const jwks = await getJwks(jwksUrl, false)
  const key = jwks.find((entry) => entry.kid === kid)

  if (key) {
    return key
  }

  const refreshed = await getJwks(jwksUrl, true)
  const refreshedKey = refreshed.find((entry) => entry.kid === kid)

  if (!refreshedKey) {
    throw new Error('Matching JWK not found')
  }

  return refreshedKey
}

const getJwks = async (jwksUrl: string, force: boolean) => {
  const now = Date.now()

  if (!force && cachedJwks && now - cachedJwks.fetchedAt < JWKS_TTL_MS) {
    return cachedJwks.keys
  }

  const response = await fetch(jwksUrl)

  if (!response.ok) {
    throw new Error('Failed to fetch JWKS')
  }

  const data = (await response.json()) as { keys?: Jwk[] }

  if (!data.keys || data.keys.length === 0) {
    throw new Error('JWKS payload missing keys')
  }

  cachedJwks = { keys: data.keys, fetchedAt: now }
  return data.keys
}

const verifySignature = async (jwk: Jwk, signingInput: string, signature: Uint8Array) => {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw new Error('Unsupported JWK format')
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  )

  const encoder = new TextEncoder()

  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, encoder.encode(signingInput))
}
