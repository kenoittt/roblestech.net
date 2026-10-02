import type { Database } from "@/lib/supabase/database.types"
import { addDays, weekday } from "@/lib/dates"

export type TaskRow = Database["public"]["Tables"]["ppm_tasks"]["Row"]
/** A task as lists hold it: everything except the description, which the panel loads. */
export type Task = Omit<TaskRow, "description">
export type TaskPatch = Database["public"]["Tables"]["ppm_tasks"]["Update"]

export const TASK_COLUMNS =
  "id,number,title,status,priority,project_id,assignee_id,created_by,assigned_by,reviewer_id," +
  "due_date,start_date,completed_at,completed_by,created_at,updated_at,is_private,sort_order," +
  "completion_policy,completion_approvers,deleted_at,deleted_by,repeat"

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
// ---------------------------------------------------------------------------
// Repeating: when a repeating task is done, the database makes the next one
// (see the recurring_tasks migration).

export const REPEATS = ["daily", "weekdays", "weekly", "biweekly", "monthly"] as const
export type Repeat = (typeof REPEATS)[number]

export const REPEAT_META: Record<Repeat, { label: string }> = {
  daily:    { label: "Every day" },
  weekdays: { label: "Every weekday" },
  weekly:   { label: "Every week" },
  biweekly: { label: "Every two weeks" },
  monthly:  { label: "Every month" },
}

/** The next date after `day` in a pattern. Mirrors ppm_next_due in the database. */
export function nextDue(day: string, repeat: Repeat): string {
  switch (repeat) {
    case "daily":
      return addDays(day, 1)
    case "weekdays": {
      const w = weekday(day) // 0 is Monday
      return addDays(day, w === 4 ? 3 : w === 5 ? 2 : 1)
    }
    case "weekly":
      return addDays(day, 7)
    case "biweekly":
      return addDays(day, 14)
    case "monthly": {
      // Same day next month, or its last day when it's shorter (Jan 31 to Feb 28).
      const [y, m, d] = day.split("-").map(Number)
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
      return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10)
    }
  }
}

/** When the next one would be due if this task were finished today. */
export function upcomingDue(task: Pick<Task, "due_date" | "repeat">, today: string): string | null {
  if (!task.repeat) return null
  let due = nextDue(task.due_date ?? today, task.repeat as Repeat)
  while (due < today) due = nextDue(due, task.repeat as Repeat)
  return due
}

export const POLICIES = ["anyone", "not_assignee", "assigner", "reviewer", "specific"] as const
export type Policy = (typeof POLICIES)[number]

export const POLICY_META: Record<Policy, { label: string; hint: string }> = {
  anyone:       { label: "Anyone",           hint: "Anyone on the team, including the assignee" },
  not_assignee: { label: "Not the assignee", hint: "Anyone except the person doing the work" },
  assigner:     { label: "The assigner",     hint: "Only the person who assigned it" },
  reviewer:     { label: "The reviewer",     hint: "Only the person named as reviewer" },
  specific:     { label: "Chosen people",    hint: "Only the people you pick" },
}

/** Whether the task's own sign-off rule lets this person mark it done, admins aside. Mirrors ppm_rule_allows. */
export function ruleAllows(task: Task, uid: string): boolean {
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

/** Admins can mark any task done, in place of the person its rule names; the history notes it. */
export function canComplete(task: Task, uid: string, role: string): boolean {
  return role === "admin" || role === "super_admin" || ruleAllows(task, uid)
}

/** An admin marking done a task whose rule names someone else. */
export function signsOffAsAdmin(task: Task, uid: string, role: string): boolean {
  return (role === "admin" || role === "super_admin") && !ruleAllows(task, uid)
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

/** A task in review that's waiting on this person: its sign-off rule names them. Home, My tasks and the board all use this. */
export function waitsOn(task: Task, uid: string): boolean {
  return task.status === "in_review" && signOffPeople(task).includes(uid)
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
