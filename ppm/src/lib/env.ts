// Public settings, read once. Server-only secrets live in lib/supabase/admin.ts.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/** Local demos only: the account switcher and the "sample data" note. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

/** The team works in Manila; every "today" and every date on screen uses it. */
export const TIMEZONE = "Asia/Manila"
