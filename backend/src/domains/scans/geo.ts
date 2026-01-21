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

  return { city: null, region: null, countryCode: null, lat: null, lon: null }
}
