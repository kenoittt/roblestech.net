import type { Database } from "@/lib/supabase/database.types"

export type TaskRow = Database["public"]["Tables"]["ppm_tasks"]["Row"]
/** A task as lists hold it: everything except the description, which the panel loads. */
export type Task = Omit<TaskRow, "description">
export type TaskPatch = Database["public"]["Tables"]["ppm_tasks"]["Update"]

export const TASK_COLUMNS =
  "id,number,title,status,priority,project_id,assignee_id,created_by,assigned_by,reviewer_id," +
  "due_date,start_date,completed_at,completed_by,created_at,updated_at,is_private,sort_order," +
  "completion_policy,completion_approvers,deleted_at,deleted_by"

// ---------------------------------------------------------------------------
// Statuses: six, each with one meaning (see the handbook's "What each status means")
// ---------------------------------------------------------------------------
export const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_META: Record<Status, { label: string; hint: string; color: string; open: boolean }> = {
  backlog:     { label: "Backlog",     hint: "Worth doing, not planned yet", color: "var(--status-backlog)",     open: true },
  todo:        { label: "Todo",        hint: "Planned and ready to start",   color: "var(--status-todo)",        open: true },
  in_progress: { label: "In progress", hint: "Someone is working on it",     color: "var(--status-in-progress)", open: true },
  in_review:   { label: "In review",   hint: "Done, waiting for a check",    color: "var(--status-in-review)",   open: true },
  done:        { label: "Done",        hint: "Finished and accepted",        color: "var(--status-done)",        open: false },
  cancelled:   { label: "Cancelled",   hint: "Not doing it",                 color: "var(--status-cancelled)",   open: false },
}

export function isOpen(status: string) {
  return STATUS_META[status as Status]?.open ?? true
}

/** Active work: what counts toward someone's load. */
export function isActive(status: string) {
  return status === "todo" || status === "in_progress" || status === "in_review"
}

// ---------------------------------------------------------------------------
// Priorities
// ---------------------------------------------------------------------------
export const PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_META: Record<Priority, { label: string; rank: number }> = {
  urgent: { label: "Urgent", rank: 4 },
  high:   { label: "High", rank: 3 },
  medium: { label: "Medium", rank: 2 },
  low:    { label: "Low", rank: 1 },
  none:   { label: "No priority", rank: 0 },
}

// ---------------------------------------------------------------------------
// Who may mark a task done (enforced by the database; mirrored here for the UI)
// ---------------------------------------------------------------------------
export const POLICIES = ["anyone", "not_assignee", "assigner", "reviewer", "specific"] as const
export type Policy = (typeof POLICIES)[number]

export const POLICY_META: Record<Policy, { label: string; hint: string }> = {
  anyone:       { label: "Anyone",           hint: "Anyone on the team, including the assignee" },
  not_assignee: { label: "Not the assignee", hint: "Anyone except the person doing the work" },
  assigner:     { label: "The assigner",     hint: "Only the person who assigned it" },
  reviewer:     { label: "The reviewer",     hint: "Only the person named as reviewer" },
  specific:     { label: "Chosen people",    hint: "Only the people you pick" },
}

export function canComplete(task: Task, uid: string, role: string): boolean {
  if (role === "admin" || role === "super_admin") return true
  switch (task.completion_policy as Policy) {
    case "not_assignee":
      return task.assignee_id !== uid
    case "assigner":
      return uid === (task.assigned_by ?? task.created_by)
    case "reviewer":
      return Boolean(task.reviewer_id) && uid === task.reviewer_id
    case "specific":
      return task.completion_approvers.includes(uid)
    default:
      return true
  }
}

/** Who the UI should name when someone can't sign a task off. */
export function signOffPeople(task: Task): string[] {
  switch (task.completion_policy as Policy) {
    case "assigner":
      return [task.assigned_by ?? task.created_by].filter(Boolean) as string[]
    case "reviewer":
      return task.reviewer_id ? [task.reviewer_id] : []
    case "specific":
      return task.completion_approvers
    default:
      return []
  }
}

export function taskKey(task: Pick<Task, "number">) {
  return `RTC-${task.number}`
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
export const VIEWS = ["list", "board", "calendar"] as const
export type ViewKind = (typeof VIEWS)[number]

export const GROUPINGS = ["status", "assignee", "project", "priority", "none"] as const
export type Grouping = (typeof GROUPINGS)[number]

export const ORDERINGS = ["priority", "due", "updated", "created"] as const
export type Ordering = (typeof ORDERINGS)[number]
