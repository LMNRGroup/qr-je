import { createClient } from '@supabase/supabase-js';

// Use `||` (not `??`): next.config normalizes missing public env vars to '',
// and an empty string must fall through to the next candidate key/URL.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'http://localhost:54321',
  isSupabaseConfigured ? supabaseKey : 'public-anon-key'
);

export default supabase
