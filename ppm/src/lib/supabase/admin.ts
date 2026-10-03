import "server-only"
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL } from "@/lib/env"
import type { Database } from "./database.types"

/**
 * The service role skips row-level security. Use it only for what a person
 * can't do through the database rules (inviting, banning, changing roles),
 * and only after checking their role in the server action.
 */
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.")
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
