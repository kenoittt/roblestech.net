"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase/client"
import { explain } from "@/domains/tasks/data"
import { useUid } from "@/domains/workspace/provider"
import type { Project } from "@/domains/workspace/types"

export const PROJECT_STATUSES = ["planned", "active", "paused", "closed"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "var(--fg-3)" },
  active: { label: "Active", color: "var(--brand)" },
  paused: { label: "Paused", color: "var(--warning)" },
  closed: { label: "Closed", color: "var(--fg-4)" },
}

/** RTC's blues first; a few calm alternates for telling projects apart. */
export const PROJECT_COLORS = ["#3992FF", "#0464DD", "#5864FF", "#2F58A3", "#16305E", "#7C8CA8", "#2BA8A0", "#AEE37B"]

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

  return { create, update, setMembers }
}
