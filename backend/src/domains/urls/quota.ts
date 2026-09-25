import type { Url, UrlQuota, UrlQuotaViolation } from './models'

export const isAdaptiveUrl = (url: Pick<Url, 'kind' | 'options'>) => {
  if (url.kind === 'adaptive') return true
  const adaptive = url.options?.adaptive
  return adaptive !== null && adaptive !== undefined
}

export const isDynamicUrl = (url: Pick<Url, 'kind' | 'options'>) => {
  if (isAdaptiveUrl(url)) return false
  return url.kind === 'dynamic' || url.kind === 'vcard' || Boolean(url.kind?.startsWith('dynamic:'))
}

export const findQuotaViolation = (
  records: Array<Pick<Url, 'kind' | 'options'>>,
  quota: UrlQuota
): UrlQuotaViolation | null => {
  const adaptiveCount = records.filter(isAdaptiveUrl).length
  if (adaptiveCount > quota.adaptiveQrCodeLimit) {
    return { code: 'ADAPTIVE_QR_LIMIT_REACHED', limit: quota.adaptiveQrCodeLimit }
  }

  if (quota.dynamicQrCodeLimit !== null) {
    const dynamicCount = records.filter(isDynamicUrl).length
    if (dynamicCount > quota.dynamicQrCodeLimit) {
      return { code: 'DYNAMIC_QR_LIMIT_REACHED', limit: quota.dynamicQrCodeLimit }
    }
  }

  return null
}

export const findQuotaIncreaseViolation = (
  before: Array<Pick<Url, 'kind' | 'options'>>,
  after: Array<Pick<Url, 'kind' | 'options'>>,
  quota: UrlQuota
): UrlQuotaViolation | null => {
  const adaptiveBefore = before.filter(isAdaptiveUrl).length
  const adaptiveAfter = after.filter(isAdaptiveUrl).length
  if (adaptiveAfter > quota.adaptiveQrCodeLimit && adaptiveAfter > adaptiveBefore) {
    return { code: 'ADAPTIVE_QR_LIMIT_REACHED', limit: quota.adaptiveQrCodeLimit }
  }

  if (quota.dynamicQrCodeLimit !== null) {
    const dynamicBefore = before.filter(isDynamicUrl).length
    const dynamicAfter = after.filter(isDynamicUrl).length
    if (dynamicAfter > quota.dynamicQrCodeLimit && dynamicAfter > dynamicBefore) {
      return { code: 'DYNAMIC_QR_LIMIT_REACHED', limit: quota.dynamicQrCodeLimit }
    }
  }

  return null
}
