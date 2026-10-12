export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
// without keys the app runs on demo data
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
