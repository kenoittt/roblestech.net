import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env"
import type { Database } from "./database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/** One browser client for the whole app; it carries the signed-in session. */
export function getSupabase() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}
