"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Add01Icon, Calendar03Icon, Home06Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { BarChart, Progress, StackedBar } from "@/components/app/charts"
import { Icon } from "@/components/app/icon"
import { PageBody, PageHeader, Section } from "@/components/app/page"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase/client"
import {
  addDays,
  ago,
  clockTime,
  diffDays,
  greeting,
  isoDay,
  longDate,
  manilaInstant,
  weekdayName,
} from "@/lib/dates"
import { useMe, useMemberMap, useMembers, useNow, useProjectMap, useProjects, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import { STATUS_META, isActive, waitsOn, type Status, type Task } from "@/domains/tasks/config"
import { HEALTH_META, LOAD_LIMIT, isOverdue, projectStats, workload } from "@/domains/tasks/selectors"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { ProjectSwatch } from "@/domains/tasks/components/glyphs"
import { DueText } from "@/domains/tasks/components/pickers"
import { TaskStatusButton } from "@/domains/tasks/components/task-properties"
import { isEventDone, useCalendar } from "@/domains/calendar/data"

/**
 * Home: your work first, then the team's. Answers, in order: what do I need
 * to do today, what's waiting on me, what's my day look like, and only then
 * how the team and the projects are doing.
 */
export function HomeDashboard() {
  const me = useMe()
  const tasks = useTasks()
  const today = useToday()
  const now = useNow()
  const { openCreateTask } = useUI()

  const mine = useMemo(() => tasks.filter((t) => t.assignee_id === me.id), [tasks, me.id])
  const myOpen = useMemo(() => mine.filter((t) => isActive(t.status) || t.status === "backlog"), [mine])

  const overdue = myOpen.filter((t) => isOverdue(t, today))
  const dueToday = myOpen.filter((t) => t.due_date === today)
  const inProgress = mine.filter((t) => t.status === "in_progress")
  const waiting = useMemo(
    () =>
      tasks.filter((t) => waitsOn(t, me.id)),
    [tasks, me.id],
  )
  const doneThisWeek = mine.filter(
    (t) => t.status === "done" && t.completed_at && diffDays(today, isoDay(t.completed_at)) < 7,
  ).length

  const summary = (() => {
    const parts: string[] = []
    if (dueToday.length) parts.push(`${dueToday.length} ${dueToday.length === 1 ? "task" : "tasks"} due today`)
    if (overdue.length) parts.push(`${overdue.length} overdue`)
    if (waiting.length) parts.push(`${waiting.length} waiting for your sign-off`)
    if (parts.length === 0) return "Nothing is due today. A good day to get ahead."
    return `You have ${parts.join(", ").replace(/, ([^,]*)$/, " and $1")}.`
  })()

  return (
    <>
      <PageHeader
        title="Home"
        icon={Home06Icon}
        actions={
          <Button size="sm" variant="outline" onClick={() => openCreateTask({ assignee_id: me.id })} className="h-7 gap-1.5 px-2.5">
            <Icon icon={Add01Icon} size={14} />
            New task
          </Button>
        }
      />
      <PageBody>
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-8 pb-16 sm:px-8">
          <div>
            <p className="text-xs font-medium text-fg-3">{longDate(today)}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">
              {greeting(now)}, {firstName(me)}
            </h2>
            <p className="mt-1 text-sm text-fg-2">{summary}</p>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-5 sm:divide-x sm:divide-line">
            <Stat label="Due today" value={dueToday.length} href="/my-tasks" tone={dueToday.length ? "warning" : undefined} />
            <Stat label="Overdue" value={overdue.length} href="/my-tasks" tone={overdue.length ? "danger" : undefined} />
            <Stat label="In progress" value={inProgress.length} href="/my-tasks" />
            <Stat label="To sign off" value={waiting.length} href="/my-tasks" />
            <Stat label="Done this week" value={doneThisWeek} href="/my-tasks" />
          </dl>

          <div className="mt-9 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <MyWork tasks={myOpen} />
            <div className="flex flex-col gap-10">
              <Today />
              <Waiting tasks={waiting} />
            </div>
          </div>

          <div className="mt-14 border-t border-line pt-9">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">The team</h2>
                <p className="mt-0.5 text-sm text-fg-3">Who has what, what's late, and how the projects are doing.</p>
              </div>
              <Link href="/people" className="text-xs font-medium text-fg-3 hover:text-fg">
                Everyone →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-2">
              <Workload />
              <Throughput />
              <ProjectsHealth />
              <LateAcrossTeam />
            </div>
            <div className="mt-12">
              <RecentActivity />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  )
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "danger" | "warning" }) {
  return (
    <Link href={href} className="group flex flex-col gap-1 px-1 sm:px-5 sm:first:pl-0">
      <dt className="text-xs text-fg-3 transition-colors group-hover:text-fg-2">{label}</dt>
      <dd
        className={cn(
          "text-xl font-semibold tracking-[-0.02em] tabular",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-fg",
        )}
      >
        {value}
      </dd>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// My work: what's assigned to me, by when it's due
// ---------------------------------------------------------------------------
function MyWork({ tasks }: { tasks: Task[] }) {
  const today = useToday()
  const { openCreateTask } = useUI()
  const me = useMe()

  const buckets = useMemo(() => {
    const sorted = tasks.slice().sort((a, b) => (a.due_date ?? "9999") < (b.due_date ?? "9999") ? -1 : 1)
    const by = (pred: (t: Task) => boolean) => sorted.filter(pred)
    return [
      { key: "overdue", label: "Overdue", tasks: by((t) => isOverdue(t, today)), tone: "danger" as const },
      { key: "today", label: "Today", tasks: by((t) => t.due_date === today) },
      { key: "week", label: "Next 7 days", tasks: by((t) => Boolean(t.due_date) && diffDays(t.due_date!, today) > 0 && diffDays(t.due_date!, today) <= 7) },
      { key: "later", label: "Later", tasks: by((t) => Boolean(t.due_date) && diffDays(t.due_date!, today) > 7) },
      { key: "none", label: "No due date", tasks: by((t) => !t.due_date && t.status !== "backlog") },
    ].filter((b) => b.tasks.length > 0)
  }, [tasks, today])

  return (
    <Section
      title="My work"
      description={`${tasks.filter((t) => isActive(t.status)).length} open tasks assigned to you`}
      actions={
        <Link href="/my-tasks" className="text-xs font-medium text-fg-3 hover:text-fg">
          All my tasks →
        </Link>
      }
    >
      {buckets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-5 py-8 text-center">
          <p className="text-sm text-fg-2">Nothing assigned to you right now.</p>
          <button type="button" onClick={() => openCreateTask({ assignee_id: me.id })} className="mt-2 text-sm font-medium text-brand hover:underline">
            Add a task for yourself
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {buckets.map((b) => (
            <Bucket key={b.key} label={b.label} tasks={b.tasks} tone={b.tone} />
          ))}
        </div>
      )}
    </Section>
  )
}

function Bucket({ label, tasks, tone }: { label: string; tasks: Task[]; tone?: "danger" }) {
  const [all, setAll] = useState(false)
  const shown = all ? tasks : tasks.slice(0, 5)
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs">
        <span className={cn("font-medium", tone === "danger" ? "text-danger" : "text-fg-2")}>{label}</span>
        <span className="text-fg-4 tabular">{tasks.length}</span>
      </div>
      <ul>
        {shown.map((t) => (
          <CompactRow key={t.id} task={t} />
        ))}
      </ul>
      {tasks.length > 5 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-1 px-2 text-xs text-fg-3 hover:text-fg">
          {all ? "Show fewer" : `Show ${tasks.length - 5} more`}
        </button>
      )}
    </div>
  )
}

function CompactRow({ task, right }: { task: Task; right?: ReactNode }) {
  const { open } = useTaskPanel()
  const projects = useProjectMap()
  const project = task.project_id ? projects.get(task.project_id) : null
  return (
    <li
      tabIndex={0}
      aria-label={task.title}
      onClick={() => open(task.number)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) open(task.number)
      }}
      className="group -mx-2 flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none hover:bg-hover focus-visible:shadow-[inset_0_0_0_2px_var(--brand)]"
    >
      <TaskStatusButton task={task} />
      <span className="min-w-0 flex-1 truncate text-fg">{task.title}</span>
      {project && (
        <span className="hidden max-w-36 shrink-0 items-center gap-1.5 text-xs text-fg-3 sm:flex">
          <ProjectSwatch color={project.color} size={8} />
          <span className="truncate">{project.name}</span>
        </span>
      )}
      {right ?? <DueText due={task.due_date} className="w-[74px] justify-end" />}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Today: my plan for the day, from the calendar
// ---------------------------------------------------------------------------
function Today() {
  const me = useMe()
  const today = useToday()
  const now = useNow()
  const { data } = useCalendar(manilaInstant(today, 0), manilaInstant(addDays(today, 1), 0))
  const mine = (data ?? [])
    .filter((e) => e.owner_id === me.id || e.attendee_ids.includes(me.id))
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))

  return (
    <Section
      title="Today"
      description={mine.length ? `${mine.length} planned` : "Nothing planned yet"}
      actions={
        <Link href="/calendar" className="text-xs font-medium text-fg-3 hover:text-fg">
          Calendar →
        </Link>
      }
    >
      {mine.length === 0 ? (
        <Link href="/calendar" className="flex items-center gap-2 rounded-lg border border-dashed border-line px-4 py-5 text-sm text-fg-3 hover:border-line-strong hover:text-fg-2">
          <Icon icon={Calendar03Icon} size={16} />
          Plan your day: block time for your tasks.
        </Link>
      ) : (
        <ol className="relative flex flex-col">
          {mine.map((e) => {
            const done = isEventDone(e, now)
            const happening = new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() > now
            return (
              <li key={e.id} className="flex gap-3 py-1.5">
                <span className={cn("w-16 shrink-0 pt-px text-xs tabular", happening ? "font-medium text-brand" : "text-fg-3")}>
                  {clockTime(e.starts_at)}
                </span>
                <span
                  className={cn(
                    "mt-1 w-[3px] shrink-0 self-stretch rounded-full",
                    e.kind === "meeting" ? "bg-status-in-review" : "bg-brand",
                    done && "opacity-35",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", done ? "text-fg-3 line-through decoration-fg-4" : "text-fg")}>{e.title}</span>
                  <span className="block text-xs text-fg-3">
                    {e.kind === "meeting" ? `Meeting · ${e.attendee_ids.length} people` : "Focus block"} · until {clockTime(e.ends_at)}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}

function Waiting({ tasks }: { tasks: Task[] }) {
  const members = useMemberMap()
  return (
    <Section title="Waiting on you" description={tasks.length ? "Tasks only you can sign off" : "No sign-offs waiting"}>
      {tasks.length > 0 && (
        <ul>
          {tasks.slice(0, 6).map((t) => {
            const who = t.assignee_id ? members.get(t.assignee_id) : null
            return (
              <CompactRow
                key={t.id}
                task={t}
                right={who ? <Avatar id={who.id} name={displayName(who)} size="sm" /> : undefined}
              />
            )
          })}
        </ul>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// The team
// ---------------------------------------------------------------------------
function Workload() {
  const tasks = useTasks()
  const members = useMembers()
  const today = useToday()
  const load = useMemo(() => workload(tasks, members, today), [tasks, members, today])
  const rows = members
    .filter((m) => !m.deactivated_at)
    .map((m) => ({ m, l: load.get(m.id)! }))
    .sort((a, b) => b.l.active - a.l.active)
  const max = Math.max(LOAD_LIMIT + 2, ...rows.map((r) => r.l.active))

  return (
    <Section
      title="Workload"
      description={`Open tasks per person. The line marks ${LOAD_LIMIT}, where it gets busy.`}
    >
      <ul className="flex flex-col gap-3.5">
        {rows.map(({ m, l }) => (
          <li key={m.id} className="grid grid-cols-[150px_minmax(0,1fr)_92px] items-center gap-3">
            <Link href={`/people/${m.id}`} className="flex min-w-0 items-center gap-2 text-sm text-fg hover:text-brand">
              <Avatar id={m.id} name={displayName(m)} size="sm" />
              <span className="truncate">{displayName(m)}</span>
            </Link>
            <StackedBar
              max={max}
              marker={LOAD_LIMIT}
              segments={[
                { key: "progress", label: "In progress", value: l.inProgress, color: "var(--status-in-progress)" },
                { key: "review", label: "In review", value: l.inReview, color: "var(--status-in-review)" },
                { key: "todo", label: "Todo", value: l.todo, color: "var(--fg-4)" },
              ]}
            />
            <span className="text-right text-xs tabular">
              <span className={cn("font-medium", l.active > LOAD_LIMIT ? "text-warning" : "text-fg")}>{l.active}</span>
              <span className="text-fg-3"> open</span>
              {l.overdue > 0 && <span className="text-danger"> · {l.overdue} late</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-4 text-xs text-fg-3">
        <Legend color="var(--status-in-progress)" label="In progress" />
        <Legend color="var(--status-in-review)" label="In review" />
        <Legend color="var(--fg-4)" label="Todo" />
      </div>
    </Section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
  )
}

function Throughput() {
  const tasks = useTasks()
  const today = useToday()
  const days = 14
  const { bars, total, previous } = useMemo(() => {
    const counts = new Map<string, number>()
    let prev = 0
    for (const t of tasks) {
      if (t.status !== "done" || !t.completed_at) continue
      const day = isoDay(t.completed_at)
      const age = diffDays(today, day)
      if (age >= 0 && age < days) counts.set(day, (counts.get(day) ?? 0) + 1)
      else if (age >= days && age < days * 2) prev++
    }
    const out = []
    for (let i = days - 1; i >= 0; i--) {
      const day = addDays(today, -i)
      out.push({
        key: day,
        label: weekdayName(day).slice(0, 2),
        value: counts.get(day) ?? 0,
        highlight: i === 0,
        title: i === 0 ? "Today" : `${weekdayName(day)} ${Number(day.slice(8))}`,
      })
    }
    return { bars: out, total: out.reduce((s, b) => s + b.value, 0), previous: prev }
  }, [tasks, today])

  const delta = total - previous
  return (
    <Section title="Finished" description="Tasks the team completed in the last 14 days">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tracking-[-0.03em] text-fg tabular">{total}</span>
        <span className={cn("text-xs tabular", delta > 0 ? "text-success" : "text-fg-3")}>
          {delta === 0 ? "Same as the two weeks before" : `${Math.abs(delta)} ${delta > 0 ? "more" : "fewer"} than the two weeks before`}
        </span>
      </div>
      <BarChart bars={bars} height={128} />
    </Section>
  )
}

function ProjectsHealth() {
  const projects = useProjects()
  const tasks = useTasks()
  const today = useToday()
  const members = useMemberMap()
  const rows = projects
    .filter((p) => p.status === "active" && !p.archived)
    .map((p) => ({ p, s: projectStats(p, tasks, today) }))
    .sort((a, b) => b.s.overdue - a.s.overdue || b.s.open - a.s.open)

  return (
    <Section
      title="Projects"
      description="Progress and health of everything active"
      actions={
        <Link href="/projects" className="text-xs font-medium text-fg-3 hover:text-fg">
          All projects →
        </Link>
      }
    >
      <ul className="flex flex-col">
        {rows.map(({ p, s }) => {
          const owner = p.owner_id ? members.get(p.owner_id) : null
          return (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="-mx-2 grid grid-cols-[minmax(0,1fr)_88px_110px] items-center gap-4 rounded-md px-2 py-2 hover:bg-hover">
                <span className="flex min-w-0 items-center gap-2.5">
                  <ProjectSwatch color={p.color} size={9} />
                  <span className="truncate text-sm text-fg">{p.name}</span>
                  {owner && <span className="hidden truncate text-xs text-fg-3 sm:inline">{firstName(owner)}</span>}
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: HEALTH_META[s.health].color }}>
                  <span className="size-1.5 rounded-full" style={{ background: HEALTH_META[s.health].color }} />
                  {HEALTH_META[s.health].label}
                </span>
                <span className="flex items-center gap-2">
                  <Progress value={s.progress} />
                  <span className="w-8 text-right text-xs text-fg-3 tabular">{Math.round(s.progress * 100)}%</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function LateAcrossTeam() {
  const tasks = useTasks()
  const today = useToday()
  const members = useMemberMap()
  const late = tasks
    .filter((t) => isOverdue(t, today))
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

  return (
    <Section title="Late across the team" description={late.length ? `${late.length} past their due date` : "Nothing is late"}>
      {late.length === 0 ? (
        <p className="text-sm text-fg-3">Everyone is on time.</p>
      ) : (
        <ul>
          {late.slice(0, 7).map((t) => {
            const who = t.assignee_id ? members.get(t.assignee_id) : null
            return (
              <CompactRow
                key={t.id}
                task={t}
                right={
                  <span className="flex w-[110px] shrink-0 items-center justify-end gap-2">
                    <DueText due={t.due_date} />
                    {who && <Avatar id={who.id} name={displayName(who)} size="sm" />}
                  </span>
                }
              />
            )
          })}
        </ul>
      )}
    </Section>
  )
}

type ActivityRow = { id: string; task_id: string | null; actor_id: string | null; type: string; to_status: string | null; meta: Record<string, unknown>; created_at: string }

function RecentActivity() {
  const members = useMemberMap()
  const tasks = useTasks()
  const now = useNow()
  const { open } = useTaskPanel()
  const { data } = useQuery({
    queryKey: ["activity", "recent"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("ppm_task_events")
        .select("id,task_id,actor_id,type,to_status,meta,created_at")
        .in("type", ["status_changed", "assigned", "created"])
        .order("created_at", { ascending: false })
        .limit(14)
      if (error) throw error
      return data as ActivityRow[]
    },
  })
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  return (
    <Section title="Recent activity" description="The latest moves across the workspace">
      <ul className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        {(data ?? []).map((e) => {
          const task = e.task_id ? byId.get(e.task_id) : null
          if (!task) return null
          const who = members.get(e.actor_id ?? "")
          let verb: ReactNode = "updated"
          if (e.type === "created") verb = "created"
          if (e.type === "assigned") {
            const to = members.get((e.meta?.assignee_id as string) ?? "")
            verb = to ? (to.id === e.actor_id ? "took" : <>assigned {firstName(to)}</>) : "unassigned"
          }
          if (e.type === "status_changed") verb = e.to_status === "done" ? "finished" : `moved to ${STATUS_META[e.to_status as Status]?.label ?? e.to_status}`
          return (
            <li key={e.id}>
              <button type="button" onClick={() => open(task.number)} className="-mx-2 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover">
                <Avatar id={who?.id ?? "x"} name={displayName(who)} size="sm" />
                <span className="min-w-0 flex-1 truncate text-fg-3">
                  <span className="font-medium text-fg-2">{firstName(who)}</span> {verb}{" "}
                  <span className="text-fg">{task.title}</span>
                </span>
                <span className="shrink-0 text-xs text-fg-4 tabular">{ago(e.created_at, now)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

