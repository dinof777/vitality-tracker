import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy, crash-safe Supabase access. The anon key is safe in the browser
// (gated by Row Level Security). Until .env.local is filled in,
// isSupabaseConfigured is false and getSupabase() returns null so the app
// still runs (logger works in local-only mode) instead of throwing at import.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(url as string, anonKey as string);
  return client;
}
