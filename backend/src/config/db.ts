export const getDatabaseConfig = () => {
  const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL ?? ''
  if (!SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required')
  }

  return {
    databaseUrl: SUPABASE_DB_URL
  }
}
