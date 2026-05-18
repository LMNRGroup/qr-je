import { buildShortUrl } from '../../config/env'
import { Url } from '../urls/models'
import { buildPublicUrlForUrl, buildVcardPublicUrl } from '../urls/public-links'
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
    vcardPublicUrl: buildVcardPublicUrl(vcard),
    vcardData: vcard.data
  }
}

export const buildUrlResponse = (url: Url, vcard?: Vcard | null) => ({
  id: url.id,
  random: url.random,
  targetUrl: url.targetUrl,
  name: url.name ?? null,
  shortUrl: buildShortUrl(url.id, url.random),
  publicUrl: vcard ? buildVcardPublicUrl(vcard) : buildPublicUrlForUrl(url),
  createdAt: url.createdAt,
  options: decorateVcardOptions(url.options ?? null, vcard),
  kind: isVcardKind(url.kind) ? normalizeVcardKind(url.kind) : url.kind ?? null
})
