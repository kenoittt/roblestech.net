"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Add01Icon,
  Copy01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  LockKeyIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { PageHeader } from "@/components/app/page"
import { Progress } from "@/components/app/charts"
import { cn } from "@/lib/utils"
import { useIsNarrow } from "@/lib/use-narrow"
import {
  addDays,
  clockTime,
  diffDays,
  isoDay,
  longDate,
  manilaInstant,
  minutesOfDay,
  monthName,
  startOfWeek,
  weekdayName,
} from "@/lib/dates"
import { useMe, useMembers, useNow, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import { isOpen, taskKey, type Task } from "@/domains/tasks/config"
import { DueText } from "@/domains/tasks/components/pickers"
import { StatusIcon } from "@/domains/tasks/components/glyphs"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { isEventDone, useCalendar, useCalendarActions, usePrivacyRanges, type CalEvent } from "../data"
import { durationLabel } from "../layout"
import { EventDialog, type EventDraft } from "./event-dialog"
import { TimeGrid, type GridColumn } from "./time-grid"

type Mode = "week" | "team"

/**
 * The team calendar (goal 1c). "My week" is where you plan your own time;
 * "Team" shows everyone's day side by side, each person's privacy applied,
 * which replaces posting the day's schedule in the group chat.
 */
export function CalendarPage() {
  const me = useMe()
  const members = useMembers()
  const tasks = useTasks()
  const today = useToday()
  const now = useNow()
  const [mode, setMode] = useState<Mode>("week")
  const [anchor, setAnchor] = useState(today)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [editing, setEditing] = useState<CalEvent | null>(null)
  const { setRange } = useCalendarActions()
  const { data: ranges } = usePrivacyRanges()

  // On a phone, "my week" becomes one day at a time: seven columns don't fit.
  const narrow = useIsNarrow()
  const weekStart = startOfWeek(anchor)
  const days = useMemo(
    () => (narrow ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))),
    [weekStart, narrow, anchor],
  )
  const rangeStart = mode === "week" ? weekStart : anchor
  const rangeEnd = mode === "week" ? addDays(weekStart, 7) : addDays(anchor, 1)
  const { data: events = [] } = useCalendar(manilaInstant(rangeStart, 0), manilaInstant(rangeEnd, 0))

  const active = useMemo(
    () => members.filter((m) => !m.deactivated_at).sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : displayName(a).localeCompare(displayName(b)))),
    [members, me.id],
  )

  const dueBy = (day: string, person: string) =>
    tasks.filter((t) => t.due_date === day && t.assignee_id === person && isOpen(t.status))

  const modeFor = (day: string) => ranges?.find((r) => r.starts_on <= day && r.ends_on >= day)?.mode ?? "public"

  const columns: GridColumn[] =
    mode === "week"
      ? days.map((day) => {
          const mine = events.filter((e) => e.owner_id === me.id || e.attendee_ids.includes(me.id))
          const ofDay = mine.filter((e) => isoDay(e.starts_at) === day)
          const length = (e: CalEvent) => minutesOfDay(e.ends_at) - minutesOfDay(e.starts_at)
          const planned = ofDay.reduce((s, e) => s + length(e), 0)
          const done = ofDay.filter((e) => isEventDone(e, now)).reduce((s, e) => s + length(e), 0)
          const hidden = modeFor(day)
          return {
            key: day,
            day,
            ownerId: me.id,
            events: mine,
            due: dueBy(day, me.id),
            header: (
              <DayHeader
                day={day}
                today={today}
                planned={planned}
                done={done}
                hidden={hidden}
                onHide={(m) => setRange.mutate({ startsOn: day, endsOn: day, mode: m })}
              />
            ),
          }
        })
      : active.map((m) => {
          const theirs = events.filter((e) => e.owner_id === m.id || e.attendee_ids.includes(m.id))
          const planned = theirs.reduce((s, e) => s + Math.max(0, minutesOfDay(e.ends_at) - minutesOfDay(e.starts_at)), 0)
          const done = theirs.filter((e) => isEventDone(e, now)).length
          return {
            key: m.id,
            day: anchor,
            ownerId: m.id,
            events: theirs,
            due: dueBy(anchor, m.id),
            header: (
              <div className="flex min-w-0 items-center gap-2">
                <Avatar id={m.id} name={displayName(m)} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-fg">{m.id === me.id ? "You" : firstName(m)}</span>
                  <span className="block truncate text-[11px] text-fg-3 tabular">
                    {theirs.length ? `${durationLabel(planned)} planned · ${done}/${theirs.length} done` : "Nothing shared"}
                  </span>
                </span>
              </div>
            ),
          }
        })

  const step = (dir: number) => setAnchor((a) => addDays(a, mode === "week" && !narrow ? 7 * dir : dir))
  const label =
    mode === "week" && !narrow
      ? `${monthName(days[0])} ${Number(days[0].slice(8))} to ${monthName(days[6]) === monthName(days[0]) ? "" : monthName(days[6]) + " "}${Number(days[6].slice(8))}, ${days[6].slice(0, 4)}`
      : `${weekdayName(anchor, true)}, ${monthName(anchor)} ${Number(anchor.slice(8))}`

  const weekMode = (() => {
    const set = new Set(days.map(modeFor))
    return set.size === 1 ? [...set][0] : "mixed"
  })()

  // The team posts each day's plan in the group chat. This writes it for them:
  // public entries by name, busy-only ones as "Busy", private ones left out.
  const copyPlan = async () => {
    const day = mode === "week" ? (days.includes(today) ? today : days[0]) : anchor
    const mine = events
      .filter((e) => (e.owner_id === me.id || e.attendee_ids.includes(me.id)) && isoDay(e.starts_at) === day)
      .filter((e) => e.visibility !== "private" || e.kind === "meeting")
      .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
    const linked = new Map(tasks.map((t) => [t.id, t]))
    const lines = mine.map((e) => {
      const t = e.task_id ? linked.get(e.task_id) : null
      const what = e.visibility === "busy" && e.kind !== "meeting" ? "Busy" : `${e.title}${t ? ` (${taskKey(t)})` : ""}`
      return `${clockTime(e.starts_at)} to ${clockTime(e.ends_at)}: ${what}`
    })
    const due = dueBy(day, me.id).map((t) => `${t.title} (${taskKey(t)})`)
    const text = [
      `${firstName(me)}'s plan for ${longDate(day)}`,
      ...(lines.length ? lines : ["Nothing blocked yet"]),
      ...(due.length ? ["", `Due: ${due.join(", ")}`] : []),
    ].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast("Your plan is copied", { description: "Paste it in the group chat." })
    } catch {
      toast.error("Couldn't reach the clipboard. Try again.")
    }
  }

  const newBlock = (taskId?: string) => {
    const base = mode === "week" ? (days.includes(today) ? today : days[0]) : anchor
    const start = base === today ? Math.min(20 * 60, Math.ceil(minutesOfDay(now) / 30) * 30 + 30) : 9 * 60
    setDraft({ day: base, start, end: start + 60, taskId: taskId ?? null })
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        icon={Calendar03Icon}
        actions={
          <Button size="sm" onClick={() => newBlock()} className="h-7 gap-1.5 px-2.5">
            <Icon icon={Add01Icon} size={14} />
            Plan time
          </Button>
        }
      />
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-1.5 sm:px-4">
        <div role="radiogroup" aria-label="View" className="flex items-center gap-0.5 rounded-md bg-hover p-0.5">
          {(["week", "team"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "pressable inline-flex h-6 items-center rounded-[5px] px-2.5 text-xs font-medium",
                mode === m ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg",
              )}
            >
              {m === "week" ? "My week" : "Team day"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAnchor(today)}
          className="pressable h-7 rounded-md border border-line px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg"
        >
          Today
        </button>
        <div className="flex items-center">
          <button type="button" aria-label="Previous" onClick={() => step(-1)} className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
            <Icon icon={ArrowLeft01Icon} size={14} />
          </button>
          <button type="button" aria-label="Next" onClick={() => step(1)} className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
            <Icon icon={ArrowRight01Icon} size={14} />
          </button>
        </div>
        <h2 className="text-sm font-medium whitespace-nowrap text-fg tabular">{label}</h2>

        <button
          type="button"
          onClick={copyPlan}
          className={cn(
            "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg",
            mode === "team" ? "" : "ml-auto",
          )}
        >
          <Icon icon={Copy01Icon} size={14} />
          <span className="hidden sm:inline">Copy my plan</span>
        </button>
        {mode === "week" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="pressable inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg data-popup-open:bg-hover">
              <Icon icon={weekMode === "private" ? LockKeyIcon : weekMode === "busy" ? ViewOffIcon : ViewIcon} size={14} />
              <span className="hidden sm:inline">
                {weekMode === "private" ? "Week hidden" : weekMode === "busy" ? "Week shows busy only" : weekMode === "mixed" ? "Some days hidden" : "Week shared"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>What the team sees this week</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={weekMode === "mixed" ? "" : weekMode}
                onValueChange={(v) => setRange.mutate({ startsOn: days[0], endsOn: days[6], mode: v as "public" | "busy" | "private" })}
              >
                <DropdownMenuRadioItem value="public" className="items-start py-1.5">
                  <span className="flex flex-col"><span className="text-fg">Everything</span><span className="text-xs text-fg-3">Each entry's own setting applies</span></span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="busy" className="items-start py-1.5">
                  <span className="flex flex-col"><span className="text-fg">Only that I'm busy</span><span className="text-xs text-fg-3">Times show; titles and details don't</span></span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="private" className="items-start py-1.5">
                  <span className="flex flex-col"><span className="text-fg">Nothing</span><span className="text-xs text-fg-3">Your week is hidden from the team</span></span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {mode === "team" && (
          <p className="ml-auto hidden text-xs text-fg-3 md:block">Each person decides what you see. Dashed blocks show only that they're busy.</p>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <TimeGrid
          columns={columns}
          today={today}
          onCreate={(day, start, end) => setDraft({ day, start, end })}
          onEdit={(e) => setEditing(e)}
        />
        {mode === "week" && <PlanRail days={days} events={events} onPlan={(taskId) => newBlock(taskId)} />}
      </div>

      <EventDialog
        draft={draft}
        event={editing}
        onClose={() => {
          setDraft(null)
          setEditing(null)
        }}
      />
    </>
  )
}

function DayHeader({
  day,
  today,
  planned,
  done,
  hidden,
  onHide,
}: {
  day: string
  today: string
  planned: number
  /** Minutes of the planned time already done. */
  done: number
  hidden: "public" | "busy" | "private"
  onHide: (mode: "public" | "busy" | "private") => void
}) {
  const isToday = day === today
  const past = diffDays(day, today) < 0
  const summary = `${durationLabel(done)} of ${durationLabel(planned)} done`
  return (
    <div className="group">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className={cn("text-[11px] font-medium", isToday ? "text-brand" : "text-fg-3")}>{weekdayName(day)}</p>
          <p className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-sm font-semibold tabular",
                isToday ? "bg-brand-solid text-white" : past ? "text-fg-3" : "text-fg",
              )}
            >
              {Number(day.slice(8))}
            </span>
            {planned > 0 && <span className="truncate text-[11px] text-fg-3 tabular">{durationLabel(planned)}</span>}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Who sees ${weekdayName(day, true)}`}
            className={cn(
              "pressable inline-flex size-6 items-center justify-center rounded-md hover:bg-hover hover:text-fg data-popup-open:bg-hover",
              hidden === "public" ? "text-fg-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100" : "text-fg-2",
            )}
          >
            <Icon icon={hidden === "private" ? LockKeyIcon : hidden === "busy" ? ViewOffIcon : ViewIcon} size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{weekdayName(day, true)}: what the team sees</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={hidden} onValueChange={(v) => onHide(v as "public" | "busy" | "private")}>
              <DropdownMenuRadioItem value="public">Everything</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="busy">Only that I'm busy</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="private">Nothing</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Done against planned, for days that have started. */}
      {planned > 0 && (past || isToday) && (
        <div role="img" aria-label={summary} title={summary} className="mt-1.5">
          <Progress value={done / planned} />
        </div>
      )}
    </div>
  )
}

/** Your open tasks due this week that have no time set aside yet. */
function PlanRail({ days, events, onPlan }: { days: string[]; events: CalEvent[]; onPlan: (taskId: string) => void }) {
  const me = useMe()
  const tasks = useTasks()
  const { open } = useTaskPanel()
  const planned = new Set(events.filter((e) => e.task_id).map((e) => e.task_id))
  const toPlan: Task[] = tasks
    .filter(
      (t) =>
        t.assignee_id === me.id &&
        isOpen(t.status) &&
        t.status !== "backlog" &&
        t.due_date !== null &&
        t.due_date <= days[6] &&
        !planned.has(t.id),
    )
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-l border-line xl:flex">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-xs font-medium text-fg-2">To plan this week</h3>
        <p className="mt-0.5 text-xs text-fg-3">
          {toPlan.length ? "Your tasks due by Sunday with no time set aside." : "Every task due this week has time set aside."}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {toPlan.map((t) => (
          <li key={t.id} className="group flex items-start gap-2 rounded-md px-2 py-2 hover:bg-hover">
            <StatusIcon status={t.status} className="mt-0.5" />
            <button type="button" onClick={() => open(t.number)} className="min-w-0 flex-1 text-left">
              <span className="line-clamp-2 text-xs leading-4 text-fg">{t.title}</span>
              <DueText due={t.due_date} className="mt-1" />
            </button>
            <button
              type="button"
              onClick={() => onPlan(t.id)}
              className="pressable shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-fg-2 hover:border-line-strong hover:bg-raised hover:text-fg"
            >
              Plan
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-3 text-[11px] leading-4 text-fg-4">
        Drag down an empty part of a day to block time. Tasks show here once they have a due date.
      </p>
    </aside>
  )
}

