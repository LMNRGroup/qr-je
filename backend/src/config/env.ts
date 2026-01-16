const APP_BASE_URL = process.env.APP_BASE_URL ?? ''

export const getAppBaseUrl = () => {
  if (!APP_BASE_URL) {
    throw new Error('APP_BASE_URL is required')
  }

  return APP_BASE_URL.replace(/\/+$/, '')
}

export const buildShortUrl = (id: string, random: string) => {
  const baseUrl = getAppBaseUrl()
  return `${baseUrl}/r/${id}/${random}`
}
