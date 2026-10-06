"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { addDays, diffDays, isoDay } from "@/lib/dates"
import { useUid } from "@/domains/workspace/provider"
import { isAdminRole, type Member, type Project } from "@/domains/workspace/types"
import { explain, type NewTask } from "@/domains/tasks/data"
import { withoutMissingColour } from "@/domains/calendar/data"
import type { Task } from "@/domains/tasks/config"

// Templates keep the details of a task or a calendar entry that people make
// again and again, so the next one is a couple of clicks away. They're starting
// points, not schedules: nothing is made until someone uses one. (Repeat is
// the schedule.) See migration 20261004000200 for who sees and changes what.

type Tables = Database["public"]["Tables"]
export type TaskTemplate = Tables["ppm_task_templates"]["Row"]
export type EventTemplate = Tables["cal_event_templates"]["Row"]
export type TaskTemplateInput = Omit<Tables["ppm_task_templates"]["Insert"], "id" | "created_at" | "updated_at" | "created_by">
export type EventTemplateInput = Omit<Tables["cal_event_templates"]["Insert"], "id" | "created_at" | "updated_at" | "created_by">
type Kind = "task" | "event"

const TABLE = { task: "ppm_task_templates", event: "cal_event_templates" } as const
const KEY = { task: ["templates", "tasks"], event: ["templates", "events"] } as const

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
export function useTaskTemplates() {
  return useQuery({
    queryKey: KEY.task,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("ppm_task_templates").select("*").order("name")
      if (error) throw error
      return data as TaskTemplate[]
    },
  })
}

export function useEventTemplates() {
  return useQuery({
    queryKey: KEY.event,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase().from("cal_event_templates").select("*").order("name")
      if (error) throw error
      return data as EventTemplate[]
    },
  })
}

/**
 * The database has no templates yet: its 2026-10-04 update isn't applied.
 * The app then says so, rather than offering templates that can't be saved.
 */
export function isMissingTable(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  return code === "PGRST205" || code === "42P01"
}

export const TEMPLATES_MISSING = "Templates aren't available yet: the database needs an update first. Let an admin know."

/** A template starts work, so it can't start in review, done or cancelled. Mirrors the table's check. */
export const STARTING_STATUSES: readonly string[] = ["backlog", "todo", "in_progress"]

/** Yours first, then the ones the team shares; each by name. */
export function sortTemplates<T extends { created_by: string | null; name: string }>(list: T[], uid: string): T[] {
  return [...list].sort(
    (a, b) => Number(b.created_by === uid) - Number(a.created_by === uid) || a.name.localeCompare(b.name),
  )
}

/** The owner can change a template; an admin can also rename or delete a shared one. */
export function canEditTemplate(t: { created_by: string | null; shared: boolean }, me: Pick<Member, "id" | "role">) {
  return t.created_by === me.id || (t.shared && isAdminRole(me.role))
}

// ---------------------------------------------------------------------------
// From a task to a template, and back
// ---------------------------------------------------------------------------
/** The days between a task being made and being due, in Manila: what "due" means in a template. */
export function dueOffset(task: Pick<Task, "due_date" | "created_at">): number | null {
  if (!task.due_date) return null
  return Math.min(365, Math.max(0, diffDays(task.due_date, isoDay(task.created_at))))
}

export type AssignMode = "user" | "person" | "nobody"

/** A new task, filled in from a template, for the person using it today. */
export function taskFromTemplate(
  t: TaskTemplate,
  ctx: { uid: string; today: string; members: Map<string, Member>; projects: Map<string, Project> },
): { draft: Partial<NewTask> & { title: string }; checklist: string[] } {
  // Leave out people who have left, and projects nobody can pick any more.
  const active = (id: string | null) => (id && ctx.members.get(id) && !ctx.members.get(id)!.deactivated_at ? id : null)
  const project = t.project_id ? ctx.projects.get(t.project_id) : null
  return {
    draft: {
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      project_id: project && !project.archived && project.status !== "closed" ? project.id : null,
      assignee_id: t.assign_to_user ? ctx.uid : active(t.assignee_id),
      reviewer_id: active(t.reviewer_id),
      completion_policy: t.completion_policy,
      completion_approvers: t.completion_approvers.filter((id) => active(id)),
      is_private: t.is_private,
      due_date: t.due_in_days === null ? null : addDays(ctx.today, t.due_in_days),
      repeat: null,
    },
    checklist: t.checklist,
  }
}

/**
 * Opening the new-task dialog on an existing template, to change it: its
 * fields as the dialog's starting point, as they are (dates stay relative).
 */
export function editTemplateArgs(t: TaskTemplate): [Partial<NewTask>, { asTemplate: { edit: TaskTemplate; checklist: string[]; dueInDays: number | null; assign: AssignMode } }] {
  return [
    {
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      project_id: t.project_id,
      assignee_id: t.assignee_id,
      reviewer_id: t.reviewer_id,
      completion_policy: t.completion_policy,
      completion_approvers: t.completion_approvers,
      is_private: t.is_private,
    },
    {
      asTemplate: {
        edit: t,
        checklist: t.checklist,
        dueInDays: t.due_in_days,
        assign: t.assign_to_user ? "user" : t.assignee_id ? "person" : "nobody",
      },
    },
  ]
}

/** One line on what a task template keeps, for Settings. */
export function describeTaskTemplate(
  t: Pick<TaskTemplate, "checklist" | "due_in_days" | "assign_to_user" | "assignee_id" | "project_id">,
  names: { person?: string; project?: string },
) {
  const parts: string[] = []
  if (names.project) parts.push(names.project)
  parts.push(t.assign_to_user ? "for whoever uses it" : t.assignee_id ? `for ${names.person ?? "someone"}` : "unassigned")
  if (t.due_in_days !== null) parts.push(dueInLabel(t.due_in_days).toLowerCase())
  if (t.checklist.length) parts.push(`${t.checklist.length}-step checklist`)
  return parts.join(" · ")
}

export const DUE_CHOICES = [null, 0, 1, 2, 3, 7, 14] as const

/** A template's due date, which is always relative: "Due the next day". */
export function dueInLabel(days: number | null) {
  if (days === null) return "No due date"
  if (days === 0) return "Due the day it's made"
  if (days === 1) return "Due the next day"
  if (days === 7) return "Due a week later"
  if (days === 14) return "Due two weeks later"
  return `Due ${days} days later`
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------
export function useTemplateActions() {
  const qc = useQueryClient()
  const uid = useUid()
  const refresh = (kind: Kind) => qc.invalidateQueries({ queryKey: KEY[kind] })

  /** Saves a new template, or replaces one (same id) with new details. */
  const saveTask = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TaskTemplateInput }) => {
      const supabase = getSupabase()
      const { data, error } = id
        ? await supabase.from("ppm_task_templates").update(input).eq("id", id).select("*").single()
        : await supabase.from("ppm_task_templates").insert({ ...input, created_by: uid }).select("*").single()
      if (error) throw error
      return data as TaskTemplate
    },
    onSuccess: () => refresh("task"),
    onError: (e) => toast.error(explain(e)),
  })

  const saveEvent = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: EventTemplateInput }) => {
      const supabase = getSupabase()
      return withoutMissingColour(input, async (row) => {
        const { data, error } = id
          ? await supabase.from("cal_event_templates").update(row).eq("id", id).select("*").single()
          : await supabase.from("cal_event_templates").insert({ ...row, created_by: uid }).select("*").single()
        if (error) throw error
        return data as EventTemplate
      })
    },
    onSuccess: () => refresh("event"),
    onError: (e) => toast.error(explain(e)),
  })

  /** Rename or share; the database refuses what you may not change. */
  const update = useMutation({
    mutationFn: async ({ kind, id, patch }: { kind: Kind; id: string; patch: { name?: string; shared?: boolean } }) => {
      const { data, error } = await getSupabase().from(TABLE[kind]).update(patch).eq("id", id).select("id")
      if (error) throw error
      if (!data?.length) throw new Error("Only its owner, or an admin for a shared one, can change this template.")
    },
    onMutate: async ({ kind, id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY[kind] })
      const previous = qc.getQueryData(KEY[kind])
      qc.setQueryData<(TaskTemplate | EventTemplate)[]>(KEY[kind], (old) => old?.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      return { previous }
    },
    onError: (e, { kind }, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY[kind], ctx.previous)
      toast.error(explain(e))
    },
    onSettled: (_d, _e, { kind }) => refresh(kind),
  })

  const remove = useMutation({
    mutationFn: async ({ kind, id }: { kind: Kind; id: string; name: string }) => {
      const { data, error } = await getSupabase().from(TABLE[kind]).delete().eq("id", id).select("id")
      if (error) throw error
      if (!data?.length) throw new Error("Only its owner, or an admin for a shared one, can delete this template.")
    },
    onSuccess: (_d, { kind, name }) => {
      toast(`Deleted the template "${name}"`, { description: "Tasks and entries made from it stay as they are." })
      refresh(kind)
    },
    onError: (e) => toast.error(explain(e)),
  })

  return { saveTask, saveEvent, update, remove }
}
