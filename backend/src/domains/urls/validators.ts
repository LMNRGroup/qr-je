import { UrlValidationError } from './errors'
import { CreateUrlPayload, ResolveUrlInput, UpdateUrlPayload } from './models'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const parseCreateUrlInput = (payload: unknown): CreateUrlPayload => {
  if (!isRecord(payload)) {
    throw new UrlValidationError('Body must be a JSON object')
  }

  const targetUrl = payload.targetUrl
  const virtualCardId = payload.virtualCardId
  const options = payload.options
  const kind = payload.kind
  const name = payload.name

  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    throw new UrlValidationError('targetUrl must be a non-empty string')
  }

  if (virtualCardId !== undefined && virtualCardId !== null && typeof virtualCardId !== 'string') {
    throw new UrlValidationError('virtualCardId must be a string')
  }

  if (name !== undefined && name !== null && typeof name !== 'string') {
    throw new UrlValidationError('name must be a string')
  }

  try {
    new URL(targetUrl)
  } catch {
    throw new UrlValidationError('targetUrl must be a valid URL')
  }

  const parsedOptions = isRecord(options) ? options : null
  const parsedKind = typeof kind === 'string' && kind.trim().length > 0 ? kind.trim() : null
  const parsedVirtualCardId =
    typeof virtualCardId === 'string' && virtualCardId.trim().length > 0
      ? virtualCardId
      : null
  const parsedName =
    typeof name === 'string' && name.trim().length > 0 ? name.trim().slice(0, 25) : null

  return {
    targetUrl,
    virtualCardId: parsedVirtualCardId,
    name: parsedName,
    options: parsedOptions,
    kind: parsedKind
  }
}

export const parseResolveParams = (params: Record<string, string | undefined>): ResolveUrlInput => {
  const id = params.id
  const random = params.random

  if (!id || !random) {
    throw new UrlValidationError('id and random are required')
  }

  return { id, random }
}

export const parseUpdateUrlInput = (payload: unknown): UpdateUrlPayload => {
  if (!isRecord(payload)) {
    throw new UrlValidationError('Body must be a JSON object')
  }

  const targetUrl = payload.targetUrl
  const options = payload.options
  const kind = payload.kind
  const name = payload.name

  if (targetUrl !== undefined) {
    if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
      throw new UrlValidationError('targetUrl must be a non-empty string')
    }
    try {
      new URL(targetUrl)
    } catch {
      throw new UrlValidationError('targetUrl must be a valid URL')
    }
  }

  if (name !== undefined && name !== null && typeof name !== 'string') {
    throw new UrlValidationError('name must be a string')
  }

  const parsedOptions = isRecord(options) ? options : null
  const parsedKind = typeof kind === 'string' && kind.trim().length > 0 ? kind.trim() : null
  const parsedName =
    typeof name === 'string' && name.trim().length > 0 ? name.trim().slice(0, 25) : null

  return {
    targetUrl: typeof targetUrl === 'string' ? targetUrl : undefined,
    options: parsedOptions,
    kind: parsedKind,
    name: name === undefined ? undefined : parsedName
  }
}
