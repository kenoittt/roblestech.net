"use client"

import Link from "next/link"
import { useMemo } from "react"
import { UserGroupIcon } from "@hugeicons/core-free-icons"
import { Avatar } from "@/components/app/avatar"
import { Crumb, EmptyState, PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { addDays, ago, clockTime, longDate, manilaInstant } from "@/lib/dates"
import { useMembers, useNow, useTasks, useToday } from "@/domains/workspace/provider"
import { ROLE_META, displayName, firstName, type Role } from "@/domains/workspace/types"
import { LOAD_LIMIT, workload } from "@/domains/tasks/selectors"
import { TaskExplorer } from "@/domains/tasks/components/task-explorer"
import { isEventDone, useCalendar } from "@/domains/calendar/data"

/** One person: what they're carrying, what they're doing today, and all their tasks. */
export function PersonPage({ id }: { id: string }) {
  const members = useMembers()
  const tasks = useTasks()
  const today = useToday()
  const now = useNow()
  const person = members.find((m) => m.id === id)
  const theirs = useMemo(() => tasks.filter((t) => t.assignee_id === id), [tasks, id])
  const load = useMemo(() => workload(tasks, members, today).get(id), [tasks, members, today, id])
  const { data: events } = useCalendar(manilaInstant(today, 0), manilaInstant(addDays(today, 1), 0))
  const plan = (events ?? [])
    .filter((e) => e.owner_id === id || e.attendee_ids.includes(id))
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))

  if (!person) {
    return (
      <>
        <PageHeader title="Not found" icon={UserGroupIcon} />
        <EmptyState icon={UserGroupIcon} title="This person isn't on the team" description="They may have been removed, or the link is wrong." />
      </>
    )
  }

  const role = person.role as Role
  return (
    <>
      <PageHeader title={displayName(person)} crumbs={<Crumb href="/people">People</Crumb>} />
      <div className="shrink-0 border-b border-line px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar id={person.id} name={displayName(person)} size="2xl" muted={Boolean(person.deactivated_at)} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-[-0.015em] text-fg">{displayName(person)}</h2>
              <p className="mt-0.5 truncate text-sm text-fg-3">
                {ROLE_META[role]?.label ?? role}
                {person.title ? ` · ${person.title}` : ""} · {person.email}
              </p>
              <p className="mt-1 text-xs text-fg-4">
                {person.deactivated_at
                  ? "Deactivated"
                  : person.last_seen_at
                    ? `Active ${ago(person.last_seen_at, now)} ago`.replace("now ago", "just now")
                    : "Hasn't signed in yet"}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-4 gap-6 lg:w-[460px]">
            <Mini label="Open" value={load?.active ?? 0} tone={(load?.active ?? 0) > LOAD_LIMIT ? "warning" : undefined} />
            <Mini label="Late" value={load?.overdue ?? 0} tone={(load?.overdue ?? 0) > 0 ? "danger" : undefined} />
            <Mini label="Due this week" value={load?.dueThisWeek ?? 0} />
            <Mini label="Done this week" value={load?.doneThisWeek ?? 0} />
          </dl>
        </div>
        <div className="mt-6">
          <p className="text-xs font-medium text-fg-3">{firstName(person)}'s day · {longDate(today)}</p>
          {plan.length === 0 ? (
            <p className="mt-1.5 text-sm text-fg-4">Nothing on the calendar today.</p>
          ) : (
            <ol className="mt-2 flex flex-wrap gap-2">
              {plan.map((e) => (
                <li
                  key={e.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs",
                    e.masked && "border-dashed",
                    isEventDone(e, now) && "opacity-55",
                  )}
                >
                  <span className="text-fg-3 tabular">{clockTime(e.starts_at)}</span>
                  <span className={cn(e.masked ? "text-fg-3 italic" : "text-fg")}>{e.title}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <TaskExplorer
        tasks={theirs}
        scopeKey={`person-${id}`}
        defaultView="list"
        createDefaults={{ assignee_id: id }}
        emptyTitle={`Nothing assigned to ${firstName(person)}`}
        emptyDescription="Assign a task from any list, or create one here."
      />
      <span className="sr-only">
        <Link href="/people">Back to people</Link>
      </span>
    </>
  )
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" }) {
  return (
    <div>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className={cn("mt-0.5 text-xl font-semibold tracking-[-0.02em] tabular", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-fg")}>
        {value}
      </dd>
    </div>
  )
}
