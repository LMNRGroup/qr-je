const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL ?? ''

export const getDatabaseConfig = () => {
  if (!SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required')
  }

  return {
    databaseUrl: SUPABASE_DB_URL
  }
}
