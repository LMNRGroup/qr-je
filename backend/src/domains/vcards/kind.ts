export const DEFAULT_VCARD_KIND = 'dynamic:vcard'

export const isVcardKind = (kind?: string | null) => {
  if (!kind) return false
  return kind === 'vcard' || kind === 'dynamic:vcard' || kind === 'static:vcard'
}

export const normalizeVcardKind = (kind?: string | null) => {
  if (!kind || kind === 'vcard') {
    return DEFAULT_VCARD_KIND
  }

  if (kind === 'dynamic' || kind === 'static') {
    return `${kind}:vcard`
  }

  if (kind === 'dynamic:vcard' || kind === 'static:vcard') {
    return kind
  }

  return null
}
