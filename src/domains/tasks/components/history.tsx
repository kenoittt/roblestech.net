import type { ReactNode } from "react"
import { shortDate } from "@/lib/dates"
import { displayName, type Member } from "@/domains/workspace/types"
import { POLICY_META, PRIORITY_META, STATUS_META, type Policy, type Priority, type Status } from "../config"
import type { TaskEvent } from "../data"

// A task's history, in sentences: used by the task panel and the activity log.

function statusLabel(s: string | null) {
  return s ? STATUS_META[s as Status]?.label ?? s : "nothing"
}

export function describeEvent(e: TaskEvent, members: Map<string, Member>, projects: Map<string, { name: string }>): ReactNode {
  const meta = e.meta ?? {}
  const strong = (s: ReactNode) => <span className="text-fg-2">{s}</span>
  switch (e.type) {
    case "created":
      return "created the task"
    case "assigned": {
      const to = meta.assignee_id as string | null
      if (!to) return "removed the assignee"
      if (to === e.actor_id) return "took the task"
      return <>assigned it to {strong(displayName(members.get(to)))}</>
    }
    case "status_changed":
      if (e.to_status === "done") return "marked it done"
      if (e.from_status === "done") return <>reopened it as {strong(statusLabel(e.to_status))}</>
      if (e.to_status === "in_review") return "sent it for sign-off"
      return (
        <>
          moved it from {strong(statusLabel(e.from_status))} to {strong(statusLabel(e.to_status))}
        </>
      )
    case "updated": {
      const field = meta.field as string
      const to = meta.to as string | null
      if (field === "title") return <>renamed it to {strong(`“${to}”`)}</>
      if (field === "priority") return <>set priority to {strong(PRIORITY_META[to as Priority]?.label ?? to)}</>
      if (field === "due_date") return to ? <>set the due date to {strong(shortDate(to, to))}</> : "removed the due date"
      if (field === "start_date") return to ? <>set the start date to {strong(shortDate(to, to))}</> : "removed the start date"
      if (field === "project_id") return to ? <>moved it to {strong(projects.get(to)?.name ?? "a project")}</> : "removed it from its project"
      if (field === "reviewer_id") return to ? <>asked {strong(displayName(members.get(to)))} to review</> : "removed the reviewer"
      if (field === "completion_policy") return <>changed sign-off to {strong(POLICY_META[to as Policy]?.label ?? to)}</>
      if (field === "is_private") return String(to) === "true" ? "made it private" : "showed it to the team"
      if (field === "description") return "edited the description"
      return "updated the task"
    }
    case "attached":
      return <>attached {strong(String(meta.name ?? "a file"))}</>
    case "deleted":
      return "deleted the task"
    case "restored":
      return "restored the task"
    default:
      return e.type.replace(/_/g, " ")
  }
}
