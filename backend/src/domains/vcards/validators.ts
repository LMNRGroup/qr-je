import { UrlValidationError } from '../urls/errors'
import { CreateVcardPayload } from './models'

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

  return {
    publicUrl,
    data,
    slug: parsedSlug,
    options: parsedOptions
  }
}
