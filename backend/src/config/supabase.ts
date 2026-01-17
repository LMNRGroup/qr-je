const SUPABASE_PROJECT_URL = process.env.SUPABASE_PROJECT_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SUPABASE_REST_URL = process.env.SUPABASE_REST_URL
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

export const getSupabaseAdminConfig = () => {
  const projectUrl = ensureProjectUrl()
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }

  return {
    restUrl: (SUPABASE_REST_URL ?? `${projectUrl}/rest/v1`).replace(/\/+$/, ''),
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
  }
}
