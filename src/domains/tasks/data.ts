"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase/client"
import { useUid } from "@/domains/workspace/provider"
import { nudgeDelivery } from "@/domains/inbox/deliver"
import { TASK_COLUMNS, taskKey, type Task, type TaskPatch, type TaskRow } from "./config"

// Every write is optimistic: the screen changes at once, the database decides,
// and if it says no (a rule, a permission) the change rolls back with the reason.

type PgError = { message?: string; code?: string; details?: string }

export function explain(error: unknown): string {
  const e = error as PgError
  if (e?.code === "42501" && e.message && !e.message.includes("row-level security")) return e.message
  if (e?.code === "42501" || e?.message?.includes("row-level security")) {
    return "You don't have permission to do that."
  }
  return e?.message ?? "Something went wrong. Try again."
}

function applyPatch(task: Task, patch: TaskPatch, uid: string): Task {
  const next = { ...task, ...patch, updated_at: new Date().toISOString() } as Task
  if (patch.status && patch.status !== task.status) {
    if (patch.status === "done") {
      next.completed_at = new Date().toISOString()
      next.completed_by = uid
    } else if (task.status === "done") {
      next.completed_at = null
      next.completed_by = null
    }
  }
  if ("assignee_id" in patch && patch.assignee_id !== task.assignee_id) next.assigned_by = uid
  return next
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const uid = useUid()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskPatch }) => {
      const { data, error } = await getSupabase()
        .from("ppm_tasks")
        .update(patch)
        .eq("id", id)
        .select(TASK_COLUMNS)
        .single()
      if (error) throw error
      return data as unknown as Task
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const previous = qc.getQueryData<Task[]>(["tasks"])
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => (t.id === id ? applyPatch(t, patch, uid) : t)))
      return { previous }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tasks"], ctx.previous)
      toast.error(explain(error))
    },
    onSuccess: (row) => {
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => (t.id === row.id ? row : t)))
      qc.invalidateQueries({ queryKey: ["task", row.id] })
      nudgeDelivery()
    },
  })
}

export function useBulkUpdate() {
  const qc = useQueryClient()
  const uid = useUid()
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: TaskPatch }) => {
      const { data, error } = await getSupabase().from("ppm_tasks").update(patch).in("id", ids).select(TASK_COLUMNS)
      if (error) throw error
      return data as unknown as Task[]
    },
    onMutate: async ({ ids, patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const previous = qc.getQueryData<Task[]>(["tasks"])
      const set = new Set(ids)
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => (set.has(t.id) ? applyPatch(t, patch, uid) : t)))
      return { previous }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tasks"], ctx.previous)
      toast.error(explain(error))
    },
    onSuccess: (rows) => {
      const byId = new Map(rows.map((r) => [r.id, r]))
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => byId.get(t.id) ?? t))
      nudgeDelivery()
    },
  })
}

export type NewTask = {
  title: string
  description?: string | null
  status?: string
  priority?: string
  assignee_id?: string | null
  project_id?: string | null
  due_date?: string | null
  is_private?: boolean
  reviewer_id?: string | null
  completion_policy?: string
}

export function useCreateTask() {
  const qc = useQueryClient()
  const uid = useUid()
  return useMutation({
    mutationFn: async (input: NewTask) => {
      const { data, error } = await getSupabase()
        .from("ppm_tasks")
        .insert({ ...input, created_by: uid })
        .select(TASK_COLUMNS)
        .single()
      if (error) throw error
      return data as unknown as Task
    },
    onSuccess: (row) => {
      qc.setQueryData<Task[]>(["tasks"], (old = []) => (old.some((t) => t.id === row.id) ? old : [...old, row]))
      nudgeDelivery()
    },
    onError: (error) => toast.error(explain(error)),
  })
}

/** Deleting is reversible: the task is hidden, and Undo brings it back. */
export function useDeleteTask() {
  const qc = useQueryClient()
  const update = async (id: string, deleted: boolean) => {
    const { error } = await getSupabase()
      .from("ppm_tasks")
      .update({ deleted_at: deleted ? new Date().toISOString() : null })
      .eq("id", id)
    if (error) throw error
  }
  return useMutation({
    mutationFn: async (task: Task) => update(task.id, true),
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const previous = qc.getQueryData<Task[]>(["tasks"])
      qc.setQueryData<Task[]>(["tasks"], (old) => old?.filter((t) => t.id !== task.id))
      return { previous }
    },
    onError: (error, _task, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tasks"], ctx.previous)
      toast.error(explain(error))
    },
    onSuccess: (_data, task) => {
      toast(`Deleted ${taskKey(task)}`, {
        description: task.title,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await update(task.id, false)
              qc.setQueryData<Task[]>(["tasks"], (old = []) => [...old, { ...task, deleted_at: null }])
            } catch (error) {
              toast.error(explain(error))
            }
          },
        },
      })
    },
  })
}

// ---------------------------------------------------------------------------
// The task panel's own data: description, history, comments, checklist
// ---------------------------------------------------------------------------
export type TaskEvent = {
  id: string
  task_id: string | null
  actor_id: string | null
  type: string
  from_status: string | null
  to_status: string | null
  meta: Record<string, unknown>
  created_at: string
}

export type Comment = {
  id: string
  task_id: string
  author_id: string | null
  body: string
  created_at: string
  edited_at: string | null
}

export type ChecklistItem = {
  id: string
  task_id: string
  title: string
  done: boolean
  sort: number
}

export type TaskDetail = {
  task: TaskRow
  events: TaskEvent[]
  comments: Comment[]
  checklist: ChecklistItem[]
}

export function useTaskDetail(id: string | null) {
  return useQuery({
    queryKey: ["task", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<TaskDetail> => {
      const supabase = getSupabase()
      const [task, events, comments, checklist] = await Promise.all([
        supabase.from("ppm_tasks").select("*").eq("id", id!).single(),
        supabase.from("ppm_task_events").select("*").eq("task_id", id!).order("created_at"),
        supabase.from("ppm_task_comments").select("*").eq("task_id", id!).order("created_at"),
        supabase.from("ppm_task_checklist").select("id,task_id,title,done,sort").eq("task_id", id!).order("sort"),
      ])
      if (task.error) throw task.error
      return {
        task: task.data as TaskRow,
        events: (events.data ?? []) as TaskEvent[],
        comments: (comments.data ?? []) as Comment[],
        checklist: (checklist.data ?? []) as ChecklistItem[],
      }
    },
  })
}

export function useSaveDescription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await getSupabase().from("ppm_tasks").update({ description }).eq("id", id)
      if (error) throw error
    },
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ["task", id] }),
    onError: (error) => toast.error(explain(error)),
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  const uid = useUid()
  return useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: string }) => {
      const { error } = await getSupabase()
        .from("ppm_task_comments")
        .insert({ task_id: taskId, body, author_id: uid })
      if (error) throw error
    },
    onSuccess: (_d, { taskId }) => {
      qc.invalidateQueries({ queryKey: ["task", taskId] })
      nudgeDelivery()
    },
    onError: (error) => toast.error(explain(error)),
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; taskId: string }) => {
      const { error } = await getSupabase().from("ppm_task_comments").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: (_d, { taskId }) => qc.invalidateQueries({ queryKey: ["task", taskId] }),
    onError: (error) => toast.error(explain(error)),
  })
}

export function useChecklistActions(taskId: string) {
  const qc = useQueryClient()
  const key = ["task", taskId]
  const patchList = (fn: (items: ChecklistItem[]) => ChecklistItem[]) =>
    qc.setQueryData<TaskDetail>(key, (old) => (old ? { ...old, checklist: fn(old.checklist) } : old))

  const add = useMutation({
    mutationFn: async (title: string) => {
      const current = qc.getQueryData<TaskDetail>(key)?.checklist ?? []
      const sort = (current.at(-1)?.sort ?? 0) + 1
      const { data, error } = await getSupabase()
        .from("ppm_task_checklist")
        .insert({ task_id: taskId, title, sort })
        .select("id,task_id,title,done,sort")
        .single()
      if (error) throw error
      return data as ChecklistItem
    },
    onSuccess: (item) => patchList((items) => [...items, item]),
    onError: (error) => toast.error(explain(error)),
  })

  const toggle = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const { error } = await getSupabase().from("ppm_task_checklist").update({ done: !item.done }).eq("id", item.id)
      if (error) throw error
    },
    onMutate: (item) => patchList((items) => items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))),
    onError: (error, item) => {
      patchList((items) => items.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)))
      toast.error(explain(error))
    },
  })

  const remove = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const { error } = await getSupabase().from("ppm_task_checklist").delete().eq("id", item.id)
      if (error) throw error
    },
    onMutate: (item) => patchList((items) => items.filter((i) => i.id !== item.id)),
    onError: (error) => {
      qc.invalidateQueries({ queryKey: key })
      toast.error(explain(error))
    },
  })

  return { add, toggle, remove }
}
