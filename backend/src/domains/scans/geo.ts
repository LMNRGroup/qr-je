export type GeoLookupResult = {
  city: string | null
  region: string | null
  countryCode: string | null
  lat: number | null
  lon: number | null
}

const parseNumber = (value?: string) => {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const lookupGeo = async (ip: string | null): Promise<GeoLookupResult> => {
  if (!ip) {
    return { city: null, region: null, countryCode: null, lat: null, lon: null }
  }

  if (process.env.DEV_MOCK_GEO === 'true') {
    return {
      city: process.env.DEV_MOCK_GEO_CITY ?? 'San Juan',
      region: process.env.DEV_MOCK_GEO_REGION ?? 'PR',
      countryCode: (process.env.DEV_MOCK_GEO_COUNTRY ?? 'PR').toUpperCase(),
      lat: parseNumber(process.env.DEV_MOCK_GEO_LAT) ?? 18.4655,
      lon: parseNumber(process.env.DEV_MOCK_GEO_LON) ?? -66.1057
    }
  }

  const providerUrlTemplate = process.env.GEO_PROVIDER_URL ?? 'https://ipapi.co/{ip}/json/'
  const providerUrl = providerUrlTemplate.replace('{ip}', ip)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  try {
    const response = await fetch(providerUrl, { signal: controller.signal })
    if (!response.ok) {
      return { city: null, region: null, countryCode: null, lat: null, lon: null }
    }
    const data = (await response.json()) as {
      city?: string
      region?: string
      country_code?: string
      latitude?: number
      longitude?: number
    }
    return {
      city: data.city ?? null,
      region: data.region ?? null,
      countryCode: data.country_code ? data.country_code.toUpperCase() : null,
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lon: typeof data.longitude === 'number' ? data.longitude : null
    }
  } catch {
    return { city: null, region: null, countryCode: null, lat: null, lon: null }
  } finally {
    clearTimeout(timeout)
  }
}
