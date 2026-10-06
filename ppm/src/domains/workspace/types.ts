import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { TASK_COLUMNS, type Grouping, type Ordering, type Task, type ViewKind } from "@/domains/tasks/config"

type Tables = Database["public"]["Tables"]
export type Supabase = SupabaseClient<Database>

export const MEMBER_COLUMNS =
  "id,full_name,email,role,title,avatar_url,deactivated_at,last_seen_at,created_at,timezone,email_opt_out,prefs"

export type Member = Pick<
  Tables["profiles"]["Row"],
  | "id" | "full_name" | "email" | "role" | "title" | "avatar_url" | "deactivated_at"
  | "last_seen_at" | "created_at" | "timezone" | "email_opt_out" | "prefs"
>

export const PROJECT_COLUMNS =
  "id,name,color,archived,created_by,created_at,description,owner_id,status,kind,client_name," +
  "start_date,target_date,default_view,updated_at,members:ppm_project_members(user_id,role)"

export type Project = Tables["ppm_projects"]["Row"] & {
  members: { user_id: string; role: string }[]
}

export type Role = "super_admin" | "admin" | "staff"
export const PPM_ROLES: Role[] = ["super_admin", "admin", "staff"]

export const ROLE_META: Record<Role, { label: string; hint: string; rank: number }> = {
  super_admin: { label: "Super admin", hint: "Everything, including making admins", rank: 3 },
  admin:       { label: "Admin",       hint: "Manages people, projects and all work", rank: 2 },
  staff:       { label: "Staff",       hint: "Works on tasks and projects", rank: 1 },
}

/** Saved per person in profiles.prefs. */
export type Prefs = {
  views?: Record<string, ViewKind>
  groupings?: Record<string, Grouping>
  orderings?: Record<string, Ordering>
  showDone?: Record<string, boolean>
  collapsedProjects?: boolean
}

export type Bootstrap = {
  uid: string
  serverNow: number
  members: Member[]
  projects: Project[]
  tasks: Task[]
}

export function displayName(member?: Pick<Member, "full_name" | "email"> | null) {
  return member?.full_name?.trim() || member?.email?.split("@")[0] || "Someone"
}

export function firstName(member?: Pick<Member, "full_name" | "email"> | null) {
  return displayName(member).split(" ")[0]
}

/** "Andrei, Christian and 3 others": a group of names, however many there are. */
export function namesLine(names: string[], max = 3) {
  if (names.length <= max) return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
  const rest = names.length - max
  return `${names.slice(0, max).join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "super_admin"
}

// Shared by the server loader and the client cache, so both read the same shape.
export async function fetchMembers(supabase: Supabase) {
  const { data, error } = await supabase
    .from("profiles")
    .select(MEMBER_COLUMNS)
    .in("role", PPM_ROLES)
    .order("full_name")
  if (error) throw error
  return data as Member[]
}

export async function fetchProjects(supabase: Supabase) {
  const { data, error } = await supabase.from("ppm_projects").select(PROJECT_COLUMNS).order("name")
  if (error) throw error
  return data as unknown as Project[]
}

export async function fetchTasks(supabase: Supabase) {
  const { data, error } = await supabase
    .from("ppm_tasks")
    .select(TASK_COLUMNS)
    .is("deleted_at", null)
    .order("sort_order")
  if (error) throw error
  return data as unknown as Task[]
}
