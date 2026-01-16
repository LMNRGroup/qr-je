import { UrlValidationError } from './errors'
import { CreateUrlPayload, ResolveUrlInput } from './models'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const parseCreateUrlInput = (payload: unknown): CreateUrlPayload => {
  if (!isRecord(payload)) {
    throw new UrlValidationError('Body must be a JSON object')
  }

  const targetUrl = payload.targetUrl

  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    throw new UrlValidationError('targetUrl must be a non-empty string')
  }

  try {
    new URL(targetUrl)
  } catch {
    throw new UrlValidationError('targetUrl must be a valid URL')
  }

  return { targetUrl }
}

export const parseResolveParams = (params: Record<string, string | undefined>): ResolveUrlInput => {
  const id = params.id
  const random = params.random

  if (!id || !random) {
    throw new UrlValidationError('id and random are required')
  }

  return { id, random }
}
