import { UrlValidationError } from '../urls/errors'
import { CreateVcardPayload } from './models'
import { normalizeVcardKind } from './kind'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)

export const parseCreateVcardInput = (payload: unknown): CreateVcardPayload => {
  if (!isRecord(payload)) {
    throw new UrlValidationError('Body must be a JSON object')
  }

  const publicUrl = payload.publicUrl
  const data = payload.data
  const slug = payload.slug
  const options = payload.options
  const kind = payload.kind

  if (typeof publicUrl !== 'string' || publicUrl.trim().length === 0) {
    throw new UrlValidationError('publicUrl must be a non-empty string')
  }

  try {
    new URL(publicUrl)
  } catch {
    throw new UrlValidationError('publicUrl must be a valid URL')
  }

  if (!isRecord(data)) {
    throw new UrlValidationError('data must be an object')
  }

  const parsedSlug = typeof slug === 'string' && slug.trim().length > 0
    ? slugify(slug)
    : null
  const parsedOptions = isRecord(options) ? options : null
  const parsedKind = normalizeVcardKind(
    typeof kind === 'string' && kind.trim().length > 0 ? kind.trim() : null
  )

  if (!parsedKind) {
    throw new UrlValidationError('kind must be dynamic:vcard or static:vcard')
  }

  return {
    publicUrl,
    data,
    slug: parsedSlug,
    options: parsedOptions,
    kind: parsedKind
  }
}

export const parseUpdateVcardInput = (payload: unknown) => {
  if (!isRecord(payload)) {
    throw new UrlValidationError('Body must be a JSON object')
  }

  const data = payload.data
  const options = payload.options
  const name = payload.name
  const kind = payload.kind

  if (!isRecord(data)) {
    throw new UrlValidationError('data must be an object')
  }

  if (name !== undefined && name !== null && typeof name !== 'string') {
    throw new UrlValidationError('name must be a string')
  }

  const parsedOptions = options === undefined ? undefined : isRecord(options) ? options : null
  const parsedName =
    typeof name === 'string' && name.trim().length > 0 ? name.trim().slice(0, 25) : null
  const parsedKind =
    kind === undefined
      ? undefined
      : normalizeVcardKind(typeof kind === 'string' && kind.trim().length > 0 ? kind.trim() : null)

  if (kind !== undefined && !parsedKind) {
    throw new UrlValidationError('kind must be dynamic:vcard or static:vcard')
  }

  return {
    data,
    options: parsedOptions,
    name: name === undefined ? undefined : parsedName,
    kind: parsedKind
  }
}
