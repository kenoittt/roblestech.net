import { diffDays, dueState, isoDay } from "@/lib/dates"
import type { Member, Project } from "@/domains/workspace/types"
import {
  PRIORITY_META,
  STATUS_META,
  isActive,
  type Grouping,
  type Ordering,
  type Priority,
  type Status,
  type Task,
} from "./config"

// Pure functions over the task list. Every view (list, board, calendar,
// dashboard) is a different reading of the same array, so they all agree.

export type DueFilter = "overdue" | "today" | "week" | "none"

export type TaskFilters = {
  text?: string
  statuses?: Status[]
  assignees?: (string | "none")[]
  projects?: (string | "none")[]
  priorities?: Priority[]
  due?: DueFilter[]
}

export function filterTasks(tasks: Task[], f: TaskFilters, today: string) {
  const text = f.text?.trim().toLowerCase()
  return tasks.filter((t) => {
    if (text && !t.title.toLowerCase().includes(text) && !`rtc-${t.number}`.includes(text)) return false
    if (f.statuses?.length && !f.statuses.includes(t.status as Status)) return false
    if (f.assignees?.length && !f.assignees.includes(t.assignee_id ?? "none")) return false
    if (f.projects?.length && !f.projects.includes(t.project_id ?? "none")) return false
    if (f.priorities?.length && !f.priorities.includes(t.priority as Priority)) return false
    if (f.due?.length) {
      const state = dueState(t.due_date, today)
      const ok = f.due.some((d) => {
        if (d === "none") return !t.due_date
        if (d === "overdue") return state === "overdue" && STATUS_META[t.status as Status]?.open
        if (d === "today") return state === "today"
        if (d === "week") return Boolean(t.due_date) && diffDays(t.due_date!, today) >= 0 && diffDays(t.due_date!, today) < 7
        return true
      })
      if (!ok) return false
    }
    return true
  })
}

export function countFilters(f: TaskFilters) {
  return (
    (f.statuses?.length ?? 0) +
    (f.assignees?.length ?? 0) +
    (f.projects?.length ?? 0) +
    (f.priorities?.length ?? 0) +
    (f.due?.length ?? 0)
  )
}

function compareDue(a: Task, b: Task) {
  if (a.due_date === b.due_date) return 0
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return a.due_date < b.due_date ? -1 : 1
}

function rank(t: Task) {
  return PRIORITY_META[t.priority as Priority]?.rank ?? 0
}

export function sortTasks(tasks: Task[], ordering: Ordering) {
  const list = tasks.slice()
  switch (ordering) {
    case "priority":
      return list.sort((a, b) => rank(b) - rank(a) || compareDue(a, b) || b.number - a.number)
    case "due":
      return list.sort((a, b) => compareDue(a, b) || rank(b) - rank(a) || b.number - a.number)
    case "updated":
      return list.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    case "created":
      return list.sort((a, b) => b.number - a.number)
  }
}

export type TaskGroup = {
  key: string
  label: string
  kind: Grouping
  tasks: Task[]
}

export function groupTasks(
  tasks: Task[],
  grouping: Grouping,
  ctx: { members: Member[]; projects: Project[]; showEmpty?: boolean },
): TaskGroup[] {
  if (grouping === "none") return [{ key: "all", label: "All tasks", kind: "none", tasks }]

  const buckets = new Map<string, Task[]>()
  const push = (key: string, t: Task) => {
    const list = buckets.get(key)
    if (list) list.push(t)
    else buckets.set(key, [t])
  }

  for (const t of tasks) {
    if (grouping === "status") push(t.status, t)
    else if (grouping === "assignee") push(t.assignee_id ?? "none", t)
    else if (grouping === "project") push(t.project_id ?? "none", t)
    else push(t.priority, t)
  }

  let order: { key: string; label: string }[] = []
  if (grouping === "status") {
    // Work that needs attention first: sign-offs, then what's moving, then what's next.
    const STATUS_GROUP_ORDER: Status[] = ["in_review", "in_progress", "todo", "backlog", "done", "cancelled"]
    order = STATUS_GROUP_ORDER.map((s) => ({ key: s, label: STATUS_META[s].label }))
  } else if (grouping === "priority") {
    order = (["urgent", "high", "medium", "low", "none"] as Priority[]).map((p) => ({ key: p, label: PRIORITY_META[p].label }))
  } else if (grouping === "assignee") {
    order = ctx.members
      .filter((m) => buckets.has(m.id) || (!m.deactivated_at && ctx.showEmpty))
      .map((m) => ({ key: m.id, label: m.full_name ?? m.email ?? "Someone" }))
    order.push({ key: "none", label: "No assignee" })
  } else if (grouping === "project") {
    order = ctx.projects
      .filter((p) => buckets.has(p.id) || (p.status === "active" && ctx.showEmpty))
      .map((p) => ({ key: p.id, label: p.name }))
    order.push({ key: "none", label: "No project" })
  }

  return order
    .map(({ key, label }) => ({ key, label, kind: grouping, tasks: buckets.get(key) ?? [] }))
    .filter((g) => ctx.showEmpty || g.tasks.length > 0)
}

// ---------------------------------------------------------------------------
// Workload: who has what, and who is overloaded
// ---------------------------------------------------------------------------
export type Load = {
  memberId: string
  todo: number
  inProgress: number
  inReview: number
  backlog: number
  overdue: number
  dueToday: number
  dueThisWeek: number
  active: number
  doneThisWeek: number
}

/** A soft line: more active tasks than this and someone is probably overloaded. */
export const LOAD_LIMIT = 8

export function workload(tasks: Task[], members: Member[], today: string): Map<string, Load> {
  const map = new Map<string, Load>()
  for (const m of members) {
    map.set(m.id, {
      memberId: m.id, todo: 0, inProgress: 0, inReview: 0, backlog: 0,
      overdue: 0, dueToday: 0, dueThisWeek: 0, active: 0, doneThisWeek: 0,
    })
  }
  for (const t of tasks) {
    if (!t.assignee_id) continue
    const l = map.get(t.assignee_id)
    if (!l) continue
    if (t.status === "todo") l.todo++
    if (t.status === "in_progress") l.inProgress++
    if (t.status === "in_review") l.inReview++
    if (t.status === "backlog") l.backlog++
    if (isActive(t.status)) {
      l.active++
      const state = dueState(t.due_date, today)
      if (state === "overdue") l.overdue++
      if (state === "today") l.dueToday++
      if (t.due_date && diffDays(t.due_date, today) >= 0 && diffDays(t.due_date, today) < 7) l.dueThisWeek++
    }
    if (t.status === "done" && t.completed_at && diffDays(today, isoDay(t.completed_at)) < 7) l.doneThisWeek++
  }
  return map
}

export function isOverdue(t: Task, today: string) {
  return STATUS_META[t.status as Status]?.open && dueState(t.due_date, today) === "overdue"
}

// ---------------------------------------------------------------------------
// Project health: on track, at risk or off track, from the tasks themselves
// ---------------------------------------------------------------------------
export type Health = "on_track" | "at_risk" | "off_track" | "no_data"

export const HEALTH_META: Record<Health, { label: string; color: string }> = {
  on_track:  { label: "On track",  color: "var(--status-done)" },
  at_risk:   { label: "At risk",   color: "var(--warning)" },
  off_track: { label: "Off track", color: "var(--danger)" },
  no_data:   { label: "No tasks",  color: "var(--fg-4)" },
}

export type ProjectStats = {
  total: number
  done: number
  open: number
  overdue: number
  progress: number
  health: Health
}

export function projectStats(project: Project, tasks: Task[], today: string): ProjectStats {
  const mine = tasks.filter((t) => t.project_id === project.id && t.status !== "cancelled")
  const total = mine.length
  const done = mine.filter((t) => t.status === "done").length
  const open = total - done
  const overdue = mine.filter((t) => isOverdue(t, today)).length
  const progress = total ? done / total : 0

  let health: Health = total === 0 ? "no_data" : "on_track"
  if (total > 0 && open > 0) {
    const share = overdue / open
    const daysLeft = project.target_date ? diffDays(project.target_date, today) : null
    const behind = daysLeft !== null && daysLeft < 7 && progress < 0.75
    if (share >= 0.25 || overdue >= 3 || (daysLeft !== null && daysLeft < 0)) health = "off_track"
    else if (overdue > 0 || behind) health = "at_risk"
  }
  return { total, done, open, overdue, progress, health }
}
