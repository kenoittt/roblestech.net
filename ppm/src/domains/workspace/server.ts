import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { fetchMembers, fetchProjects, fetchTasks, type Bootstrap } from "./types"

/** The signed-in person's id, or a trip to the sign-in page. */
export const requireUserId = cache(async () => {
  const supabase = await createSupabaseServer()
  const { data } = await supabase.auth.getClaims()
  const uid = data?.claims?.sub
  if (!uid) redirect("/login")
  return uid
})

/**
 * Everything the app needs to draw its first screen, in one round of parallel
 * queries: the team, the projects and every live task. After this the browser
 * keeps them in its cache and every view switches instantly.
 */
export const getBootstrap = cache(async (): Promise<Bootstrap> => {
  const uid = await requireUserId()
  const supabase = await createSupabaseServer()
  const [members, projects, tasks] = await Promise.all([
    fetchMembers(supabase),
    fetchProjects(supabase),
    fetchTasks(supabase),
  ])
  const me = members.find((m) => m.id === uid)
  // Clients, and people whose access was turned off, have no PPM.
  if (!me || me.deactivated_at) redirect("/auth/no-access")
  // "Last active" on the People page: refreshed at most every five minutes,
  // after the page has been sent, so it never slows anything down.
  if (!me.last_seen_at || Date.now() - new Date(me.last_seen_at).getTime() > 5 * 60_000) {
    after(async () => {
      await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid)
    })
  }
  return { uid, serverNow: Date.now(), members, projects, tasks }
})
