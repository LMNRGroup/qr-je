const SUPABASE_PROJECT_URL = process.env.SUPABASE_PROJECT_URL ?? ''
const SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER
const SUPABASE_JWT_AUD = process.env.SUPABASE_JWT_AUD ?? 'authenticated'

const ensureProjectUrl = () => {
  if (!SUPABASE_PROJECT_URL) {
    throw new Error('SUPABASE_PROJECT_URL is required')
  }

  return SUPABASE_PROJECT_URL.replace(/\/+$/, '')
}

export const getSupabaseAuthConfig = () => {
  const projectUrl = ensureProjectUrl()
  const issuer = SUPABASE_JWT_ISSUER ?? `${projectUrl}/auth/v1`

  return {
    projectUrl,
    issuer,
    audience: SUPABASE_JWT_AUD,
    jwksUrl: `${projectUrl}/auth/v1/.well-known/jwks.json`
  }
}
