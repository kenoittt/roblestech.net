"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase/client"
import type { Task } from "@/domains/tasks/config"
import { explain } from "@/domains/tasks/data"
import { useUid } from "@/domains/workspace/provider"
import { isAdminRole, type Member, type Project } from "@/domains/workspace/types"

export const PROJECT_STATUSES = ["planned", "active", "paused", "closed"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "var(--fg-3)" },
  active: { label: "Active", color: "var(--brand)" },
  paused: { label: "Paused", color: "var(--warning)" },
  closed: { label: "Closed", color: "var(--fg-4)" },
}

/** Who can edit, archive and restore a project. Mirrors ppm_can_manage_project in the database. */
export function canManageProject(project: Project, me: Pick<Member, "id" | "role">) {
  return (
    isAdminRole(me.role) ||
    project.owner_id === me.id ||
    project.members.some((m) => m.user_id === me.id && m.role === "owner")
  )
}

/** Deleting is for admins only (the ppm_projects_delete rule); everyone else archives. */
export function canDeleteProject(me: Pick<Member, "role">) {
  return isAdminRole(me.role)
}

/** RTC's blues first; a few calm alternates for telling projects apart. */
export const PROJECT_COLORS = ["#3992FF", "#0464DD", "#5864FF", "#2F58A3", "#16305E", "#7C8CA8", "#2BA8A0", "#AEE37B"]

/** What each project colour is called, for screen readers and tooltips. */
export const PROJECT_COLOR_NAMES: Record<string, string> = {
  "#3992FF": "Sky", "#0464DD": "Blue", "#5864FF": "Indigo", "#2F58A3": "Steel",
  "#16305E": "Navy", "#7C8CA8": "Slate", "#2BA8A0": "Teal", "#AEE37B": "Lime",
}

export type ProjectInput = {
  name: string
  description?: string | null
  kind: "client" | "internal"
  client_name?: string | null
  owner_id: string
  color: string
  status: ProjectStatus
  start_date?: string | null
  target_date?: string | null
  default_view: "list" | "board" | "calendar"
  memberIds: string[]
}

export function useProjectActions() {
  const qc = useQueryClient()
  const uid = useUid()
  const refresh = () => qc.invalidateQueries({ queryKey: ["projects"] })

  const create = useMutation({
    mutationFn: async ({ memberIds, ...row }: ProjectInput) => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("ppm_projects")
        .insert({ ...row, created_by: uid })
        .select("id")
        .single()
      if (error) throw error
      const others = memberIds.filter((m) => m !== row.owner_id)
      if (others.length) {
        const { error: mErr } = await supabase
          .from("ppm_project_members")
          .insert(others.map((user_id) => ({ project_id: data.id, user_id, role: "member" })))
        if (mErr) throw mErr
      }
      return data.id as string
    },
    onSuccess: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<ProjectInput, "memberIds">> }) => {
      const { error } = await getSupabase().from("ppm_projects").update(patch).eq("id", id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["projects"] })
      const previous = qc.getQueryData<Project[]>(["projects"])
      qc.setQueryData<Project[]>(["projects"], (old) => old?.map((p) => (p.id === id ? ({ ...p, ...patch } as Project) : p)))
      return { previous }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["projects"], ctx.previous)
      toast.error(explain(e))
    },
    onSettled: refresh,
  })

  const setMembers = useMutation({
    mutationFn: async ({ project, memberIds }: { project: Project; memberIds: string[] }) => {
      const supabase = getSupabase()
      const current = new Set(project.members.map((m) => m.user_id))
      const wanted = new Set([...memberIds, ...(project.owner_id ? [project.owner_id] : [])])
      const add = [...wanted].filter((id) => !current.has(id))
      const remove = [...current].filter((id) => !wanted.has(id))
      if (add.length) {
        const { error } = await supabase
          .from("ppm_project_members")
          .insert(add.map((user_id) => ({ project_id: project.id, user_id, role: "member" })))
        if (error) throw error
      }
      if (remove.length) {
        const { error } = await supabase
          .from("ppm_project_members")
          .delete()
          .eq("project_id", project.id)
          .in("user_id", remove)
        if (error) throw error
      }
    },
    onSuccess: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  // Archiving hides a project everywhere but its own page and the Archived tab;
  // nothing is lost, and Undo (or Restore) brings it back. Its tasks stay where they are.
  const writeArchived = async (id: string, archived: boolean) => {
    const { data, error } = await getSupabase().from("ppm_projects").update({ archived }).eq("id", id).select("id")
    if (error) throw error
    // The database skips rows you may not change instead of failing, so check.
    if (!data?.length) throw new Error("Only the project's owner or an admin can archive it.")
  }
  const setCached = (id: string, archived: boolean) =>
    qc.setQueryData<Project[]>(["projects"], (old) => old?.map((p) => (p.id === id ? { ...p, archived } : p)))

  const setArchived = useMutation({
    mutationFn: async ({ project, archived }: { project: Project; archived: boolean }) => writeArchived(project.id, archived),
    onMutate: async ({ project, archived }) => {
      await qc.cancelQueries({ queryKey: ["projects"] })
      const previous = qc.getQueryData<Project[]>(["projects"])
      setCached(project.id, archived)
      return { previous }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["projects"], ctx.previous)
      toast.error(explain(e))
    },
    onSuccess: (_d, { project, archived }) => {
      const open = (qc.getQueryData<Task[]>(["tasks"]) ?? []).filter(
        (t) => t.project_id === project.id && t.status !== "done" && t.status !== "cancelled",
      ).length
      if (!archived) return void toast(`Restored ${project.name}`)
      toast(`Archived ${project.name}`, {
        description: open
          ? `Its ${open} open ${open === 1 ? "task stays" : "tasks stay"} in All tasks. Find the project under Projects, Archived.`
          : "Find it under Projects, Archived.",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              setCached(project.id, false)
              await writeArchived(project.id, false)
            } catch (e) {
              setCached(project.id, true)
              toast.error(explain(e))
            }
          },
        },
      })
    },
    onSettled: refresh,
  })

  // Deleting can't be undone, so it asks first (DeleteProjectDialog). Its tasks
  // either stay, with no project, or are deleted with it (hidden, with history).
  const remove = useMutation({
    mutationFn: async ({ project, deleteTasks }: { project: Project; deleteTasks: boolean }) => {
      const { data, error } = await getSupabase().rpc("ppm_delete_project", { pid: project.id, delete_tasks: deleteTasks })
      if (error) throw error
      return data ?? 0
    },
    onSuccess: (hidden, { project, deleteTasks }) => {
      qc.setQueryData<Project[]>(["projects"], (old) => old?.filter((p) => p.id !== project.id))
      qc.setQueryData<Task[]>(["tasks"], (old) =>
        deleteTasks
          ? old?.filter((t) => t.project_id !== project.id)
          : old?.map((t) => (t.project_id === project.id ? { ...t, project_id: null } : t)),
      )
      toast(`Deleted ${project.name}`, {
        description: deleteTasks
          ? `${hidden} ${hidden === 1 ? "task was" : "tasks were"} deleted with it.`
          : "Its tasks are still in All tasks, with no project.",
      })
      qc.invalidateQueries({ queryKey: ["tasks"] })
      refresh()
    },
    onError: (e) => toast.error(explain(e)),
  })

  return { create, update, setMembers, setArchived, remove }
}
