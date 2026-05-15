import { buildShortUrl } from '../../config/env'
import { Url } from '../urls/models'
import { Vcard } from './models'
import { isVcardKind, normalizeVcardKind } from './kind'

export const decorateVcardOptions = (
  options: Record<string, unknown> | null | undefined,
  vcard?: Vcard | null
) => {
  if (!vcard) {
    return options ?? null
  }

  return {
    ...(options ?? {}),
    vcardId: vcard.id,
    vcardSlug: vcard.slug,
    vcardPublicUrl: vcard.publicUrl,
    vcardData: vcard.data
  }
}

export const buildUrlResponse = (url: Url, vcard?: Vcard | null) => ({
  id: url.id,
  random: url.random,
  targetUrl: url.targetUrl,
  name: url.name ?? null,
  shortUrl: buildShortUrl(url.id, url.random),
  createdAt: url.createdAt,
  options: decorateVcardOptions(url.options ?? null, vcard),
  kind: isVcardKind(url.kind) ? normalizeVcardKind(url.kind) : url.kind ?? null
})
