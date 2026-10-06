"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Edit02Icon, LockKeyIcon, ViewOffIcon, Delete02Icon, Task01Icon } from "@hugeicons/core-free-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AvatarStack } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { isoDay, longDate, manilaInstant, minutesOfDay } from "@/lib/dates"
import { useMe, useMemberMap, useNow, useTasks } from "@/domains/workspace/provider"
import { displayName, firstName, namesLine } from "@/domains/workspace/types"
import { taskKey, type Task } from "@/domains/tasks/config"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { StatusIcon } from "@/domains/tasks/components/glyphs"
import { blockColor, isEventDone, useCalendarActions, type CalEvent } from "../data"
import {
  DAY_END,
  DAY_START,
  MIN_LANE_PX,
  PX_PER_MIN,
  SNAP,
  durationLabel,
  entryMinutes,
  entryTimes,
  formatMinute,
  minuteToY,
  placeEvents,
  yToMinute,
  type Overflow,
  type Placed,
} from "../layout"

/** Due tasks shown above a day's hours before the rest fold into "N more". */
const DUE_SHOWN = 3

type MoveState = {
  id: string
  mode: "move" | "resize"
  col: number
  newCol: number
  start: number
  end: number
  newStart: number
  newEnd: number
  moved: boolean
  kind: "block" | "meeting"
  title: string
  color: string | null
}

export type GridColumn = {
  key: string
  day: string
  header: ReactNode
  /** Whose time this column shows: drag-to-create only works on your own. */
  ownerId?: string
  events: CalEvent[]
  /** Tasks due this day, shown in the strip above the hours. */
  due: Task[]
  muted?: boolean
}

/**
 * The hours of a day, side by side: days of your week, or people on one day.
 * Drag down an empty part of your own column to block time.
 */
export function TimeGrid({
  columns,
  today,
  onCreate,
  onEdit,
}: {
  columns: GridColumn[]
  today: string
  onCreate: (day: string, start: number, end: number) => void
  onEdit: (event: CalEvent) => void
}) {
  const me = useMe()
  const now = useNow(30_000)
  const scroller = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const { update } = useCalendarActions()
  // How many entries fit side by side depends on how wide a column is.
  const [columnWidth, setColumnWidth] = useState(0)
  useEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => setColumnWidth((el.clientWidth - 56) / columns.length)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [columns.length])
  const maxLanes = columnWidth ? Math.max(2, Math.floor(columnWidth / MIN_LANE_PX)) : 3
  // Drawing a new block. On a phone the outline waits for the finger to lift, so a scroll shows nothing.
  const [drag, setDrag] = useState<{ col: string; from: number; to: number; touch: boolean } | null>(null)
  // Moving or resizing one of your own entries.
  const [move, setMove] = useState<MoveState | null>(null)
  const justMoved = useRef<string | null>(null)
  // Days side by side (your week) let an entry move between columns; people side by side don't.
  const crossColumns = new Set(columns.map((c) => c.day)).size === columns.length && columns.length > 1

  const beginMove = (e: React.PointerEvent, placed: Placed, col: number, mode: "move" | "resize") => {
    e.stopPropagation()
    // A finger scrolls the day instead; a tap still opens the details, where Edit changes the times.
    if (e.button !== 0 || e.pointerType === "touch") return
    const pointer = e.pointerId
    const startX = e.clientX
    const startY = e.clientY
    const length = placed.end - placed.start
    let state: MoveState = {
      id: placed.event.id, mode, col, newCol: col,
      start: placed.start, end: placed.end, newStart: placed.start, newEnd: placed.end, moved: false,
      kind: placed.event.kind, title: placed.event.title, color: placed.event.color,
    }
    setMove(state)

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return
      const dy = ev.clientY - startY
      const dx = ev.clientX - startX
      const delta = Math.round(dy / PX_PER_MIN / SNAP) * SNAP
      const moved = state.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4
      let { newStart, newEnd, newCol } = state
      if (mode === "move") {
        newStart = Math.max(DAY_START, Math.min(DAY_END - length, state.start + delta))
        newEnd = newStart + length
        const rect = grid.current?.getBoundingClientRect()
        if (crossColumns && rect) {
          const width = (rect.width - 56) / columns.length
          newCol = Math.max(0, Math.min(columns.length - 1, Math.floor((ev.clientX - rect.left - 56) / width)))
        }
      } else {
        newEnd = Math.max(state.start + SNAP, Math.min(DAY_END, state.end + delta))
      }
      state = { ...state, newStart, newEnd, newCol, moved }
      setMove(state)
    }
    const stop = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
      setMove(null)
    }
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId === pointer) stop()
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return
      stop()
      const changed = state.newStart !== state.start || state.newEnd !== state.end || state.newCol !== state.col
      if (state.moved) justMoved.current = state.id
      if (!changed) return
      const day = columns[state.newCol].day
      update.mutate({
        id: state.id,
        patch: { starts_at: manilaInstant(day, state.newStart), ends_at: manilaInstant(day, state.newEnd) },
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onCancel)
  }

  const nowMinute = minutesOfDay(now)
  const showsToday = columns.some((c) => c.day === today)
  // The day has all 24 hours, so open where it matters: just before now when
  // today is on screen, otherwise at 8 AM.
  const [opening] = useState(() => (showsToday ? Math.max(DAY_START, nowMinute - 90) : 8 * 60))
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = minuteToY(opening) - 12
  }, [opening])

  const hours: number[] = []
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m)
  const height = (DAY_END - DAY_START) * PX_PER_MIN
  const hasDue = columns.some((c) => c.due.length > 0)

  const pointerMinute = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return yToMinute(e.clientY - rect.top)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto">
      {/* Columns keep a readable width; on a phone the team's day scrolls sideways. */}
      <div className="flex min-h-0 flex-1 flex-col" style={{ minWidth: columns.length * 112 + 56 }}>
      <div className="flex shrink-0 border-b border-line">
        <div className="w-14 shrink-0" />
        {columns.map((c) => (
          <div key={c.key} className={cn("min-w-0 flex-1 border-l border-line px-2 py-2", c.muted && "opacity-60")}>
            {c.header}
          </div>
        ))}
      </div>

      {hasDue && (
        <div className="flex shrink-0 border-b border-line">
          <div className="flex w-14 shrink-0 items-start justify-end pt-1.5 pr-2 text-[10px] text-fg-4">Due</div>
          {columns.map((c) => (
            <div key={c.key} className="flex min-w-0 flex-1 flex-col gap-0.5 border-l border-line p-1">
              {c.due.slice(0, DUE_SHOWN).map((t) => (
                <DueChip key={t.id} task={t} />
              ))}
              {c.due.length > DUE_SHOWN && <DueMore tasks={c.due} day={c.day} />}
            </div>
          ))}
        </div>
      )}

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
        <div ref={grid} className="relative flex" style={{ height }}>
          <div className="relative w-14 shrink-0">
            {hours.map((m) => (
              <span key={m} className="absolute right-2 -translate-y-1/2 text-[10px] text-fg-4 tabular" style={{ top: minuteToY(m) }}>
                {m === DAY_START || m === DAY_END ? "" : formatMinute(m)}
              </span>
            ))}
          </div>
          {columns.map((c, colIndex) => {
            const { placed, overflow } = placeEvents(c.events, c.day, maxLanes)
            const mine = c.ownerId === me.id
            return (
              <div
                key={c.key}
                className={cn("relative min-w-0 flex-1 border-l border-line", mine && "cursor-cell", c.day === today && columns.length > 1 && c.ownerId === undefined && "bg-hover/40")}
                onPointerDown={(e) => {
                  // Presses inside an entry's details (Tick off, Edit, delete) reach this column
                  // through React, though the details float outside it: they mustn't start a drag.
                  if (!e.currentTarget.contains(e.target as Node)) return
                  if (!mine || e.button !== 0 || (e.target as HTMLElement).closest("[data-event]")) return
                  const m = pointerMinute(e)
                  e.currentTarget.setPointerCapture(e.pointerId)
                  setDrag({ col: c.key, from: m, to: m + 60, touch: e.pointerType === "touch" })
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.col !== c.key) return
                  const m = pointerMinute(e)
                  setDrag((d) => (d ? { ...d, to: Math.max(d.from + 15, m) } : d))
                }}
                onPointerUp={() => {
                  if (!drag || drag.col !== c.key) return
                  const { from, to } = drag
                  setDrag(null)
                  onCreate(c.day, from, Math.max(to, from + 30))
                }}
                // The browser took over (a phone scroll, say): drop the drawing.
                onPointerCancel={() => setDrag(null)}
              >
                {hours.map((m) => (
                  <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: minuteToY(m) }} />
                ))}
                {hours.slice(0, -1).map((m) => (
                  <div key={`h${m}`} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/40" style={{ top: minuteToY(m + 30) }} />
                ))}

                {placed.map((p) => (
                  <EventBlock
                    key={p.event.id}
                    placed={p}
                    onEdit={onEdit}
                    moving={move?.id === p.event.id && move.moved}
                    onBeginMove={(e, mode) => beginMove(e, p, colIndex, mode)}
                    justMovedRef={justMoved}
                  />
                ))}
                {overflow.map((o) => (
                  <OverflowChip key={o.key} overflow={o} onEdit={onEdit} />
                ))}

                {move?.moved && move.newCol === colIndex && (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-1 z-20 rounded-md border-l-2 px-1.5 py-1 text-[11px] leading-4 shadow-popover",
                      move.kind === "meeting"
                        ? "border-status-in-review bg-[color-mix(in_oklab,var(--status-in-review)_22%,var(--surface))]"
                        : blockColor(move.color).tone,
                    )}
                    style={{ top: minuteToY(move.newStart), height: Math.max(20, minuteToY(move.newEnd) - minuteToY(move.newStart) - 2) }}
                  >
                    <span className="block truncate font-medium text-fg">{move.title}</span>
                    <span className="block truncate text-fg-2 tabular">
                      {formatMinute(move.newStart)} to {formatMinute(move.newEnd)}
                    </span>
                  </div>
                )}

                {drag?.col === c.key && !drag.touch && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-md border border-brand/60 bg-brand-soft px-2 py-1 text-xs text-fg"
                    style={{ top: minuteToY(drag.from), height: Math.max(14, minuteToY(drag.to) - minuteToY(drag.from)) }}
                  >
                    {formatMinute(drag.from)} to {formatMinute(drag.to)}
                  </div>
                )}

                {c.day === today && nowMinute >= DAY_START && nowMinute <= DAY_END && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: minuteToY(nowMinute) }}>
                    <div className="h-px bg-danger" />
                    <div className="absolute -top-[3.5px] -left-[3.5px] size-2 rounded-full bg-danger" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}

function DueChip({ task }: { task: Task }) {
  const { open } = useTaskPanel()
  return (
    <button
      type="button"
      onClick={() => open(task.number)}
      className="flex h-6 min-w-0 items-center gap-1.5 rounded-[5px] px-1.5 text-left text-[11px] text-fg-2 hover:bg-hover"
      title={`${taskKey(task)} · ${task.title}`}
    >
      <StatusIcon status={task.status} size={11} />
      <span className="truncate">{task.title}</span>
    </button>
  )
}

function EventBlock({
  placed,
  onEdit,
  moving,
  onBeginMove,
  justMovedRef,
}: {
  placed: Placed
  onEdit: (e: CalEvent) => void
  moving: boolean
  onBeginMove: (e: React.PointerEvent, mode: "move" | "resize") => void
  justMovedRef: React.RefObject<string | null>
}) {
  const { event, top, height, lane, lanes, before, after } = placed
  const [detailsOpen, setDetailsOpen] = useState(false)
  const me = useMe()
  const now = useNow()
  const done = isEventDone(event, now)
  const mine = event.owner_id === me.id
  const short = height < 36
  const { width, left } = laneBox(lane, lanes)

  const body = (
    <>
      <span className={cn("flex min-w-0 items-center gap-1 font-medium", done && "line-through decoration-fg-4")}>
        {done && <Icon icon={CheckmarkCircle02Icon} size={12} className="shrink-0 text-status-done" />}
        {mine && event.visibility === "private" && <Icon icon={LockKeyIcon} size={11} className="shrink-0 text-fg-3" />}
        {mine && event.visibility === "busy" && <Icon icon={ViewOffIcon} size={11} className="shrink-0 text-fg-3" />}
        <span className="truncate">{event.title}</span>
      </span>
      {!short && <span className="block truncate text-fg-3 tabular">{entryTimes(event, { compact: true })}</span>}
    </>
  )

  // An entry that runs over midnight changes in its details (Edit), not by dragging one piece of it.
  const draggable = mine && !event.masked && !before && !after
  return (
    <Popover
      open={detailsOpen}
      onOpenChange={(next) => {
        // A drag ends with a click; that click shouldn't open the details.
        if (next && justMovedRef.current === event.id) {
          justMovedRef.current = null
          return
        }
        setDetailsOpen(next)
      }}
    >
      <PopoverTrigger
        data-event
        onPointerDown={(e) => (draggable ? onBeginMove(e, "move") : e.stopPropagation())}
        className={cn(
          // overflow-clip, not hidden: hidden would stop the title sticking to the top of the day as you scroll.
          "absolute z-[1] flex flex-col items-stretch justify-start overflow-clip rounded-md border-l-2 px-1.5 py-1 text-left text-[11px] leading-4 transition-[filter,opacity] select-none hover:brightness-110 data-popup-open:ring-1 data-popup-open:ring-line-strong",
          toneOf(event),
          // Square where it carries on from the day before or into the next.
          before && "rounded-t-none",
          after && "rounded-b-none",
          done && "opacity-55",
          draggable && "cursor-grab active:cursor-grabbing",
          moving && "opacity-30",
        )}
        style={{ top, height, width, left }}
      >
        {/* A long block keeps its title in view while you scroll through it. */}
        <span className="sticky top-1 flex min-w-0 flex-col">{body}</span>
        {draggable && height >= 28 && (
          <span
            aria-hidden
            onPointerDown={(e) => onBeginMove(e, "resize")}
            className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
          />
        )}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 gap-3 p-3">
        <EventDetails event={event} onEdit={onEdit} />
      </PopoverContent>
    </Popover>
  )
}

/** Where a lane sits across its column. */
function laneBox(lane: number, lanes: number) {
  return { width: `calc(${100 / lanes}% - 6px)`, left: `calc(${(100 / lanes) * lane}% + 3px)` }
}

function toneOf(event: CalEvent) {
  return event.masked
    ? "border-line-strong border-dashed bg-hover text-fg-3"
    : event.kind === "meeting"
      ? "border-status-in-review/70 bg-[color-mix(in_oklab,var(--status-in-review)_16%,var(--surface))] text-fg"
      : `${blockColor(event.color).tone} text-fg`
}

/** An entry's details: when, who, the task it's for, notes, and for your own, its buttons. */
function EventDetails({ event, onEdit }: { event: CalEvent; onEdit: (e: CalEvent) => void }) {
  const me = useMe()
  const members = useMemberMap()
  const tasks = useTasks()
  const { open } = useTaskPanel()
  const { update, remove } = useCalendarActions()
  const mine = event.owner_id === me.id
  const task = event.task_id ? tasks.find((t) => t.id === event.task_id) : null
  const owner = members.get(event.owner_id)
  const overDays = isoDay(event.starts_at) !== isoDay(event.ends_at)
  // You first, then everyone else by name.
  const people = [...event.attendee_ids].sort((a, b) =>
    a === me.id ? -1 : b === me.id ? 1 : displayName(members.get(a)).localeCompare(displayName(members.get(b))),
  )

  return (
    <>
      <div>
        <p className="text-sm font-medium text-fg">{event.title}</p>
        <p className="mt-0.5 text-xs text-fg-3 tabular">
          {entryTimes(event)} · {durationLabel(entryMinutes(event))}
        </p>
        {overDays && (
          <p className="text-xs text-fg-3">
            {longDate(isoDay(event.starts_at))} to {longDate(isoDay(event.ends_at))}
          </p>
        )}
      </div>
      {event.masked ? (
        <p className="text-xs text-fg-3">{displayName(owner)} shares only that they're busy.</p>
      ) : (
        <>
          {event.kind === "meeting" && people.length > 0 && (
            <div className="flex min-w-0 items-center gap-2">
              <AvatarStack people={people.map((id) => ({ id, name: displayName(members.get(id)) }))} max={5} size="sm" ringClassName="ring-raised" />
              <span className="min-w-0 text-xs text-fg-2">
                {namesLine(people.map((id) => (id === me.id ? "you" : firstName(members.get(id)))))}
              </span>
            </div>
          )}
          {task && (
            <button type="button" onClick={() => open(task.number)} className="-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-fg-2 hover:bg-hover">
              <Icon icon={Task01Icon} size={13} className="text-fg-3" />
              <StatusIcon status={task.status} size={12} />
              <span className="truncate">{task.title}</span>
            </button>
          )}
          {event.notes && <p className="text-xs leading-5 whitespace-pre-wrap text-fg-2">{event.notes}</p>}
          <p className="text-xs text-fg-4">
            {mine ? (event.visibility === "public" ? "The team can see this." : event.visibility === "busy" ? "The team sees only that you're busy." : "Only you can see this.") : `${displayName(owner)}'s ${event.kind === "meeting" ? "meeting" : "plan"}`}
            {event.auto_complete && " Ticks off by itself."}
          </p>
        </>
      )}
      {mine && (
        <div className="flex items-center gap-1 border-t border-line pt-2">
          {event.kind === "block" && (
            <button
              type="button"
              onClick={() => update.mutate({ id: event.id, patch: { completed_at: event.completed_at ? null : new Date().toISOString() } })}
              className="pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg"
            >
              <Icon icon={CheckmarkCircle02Icon} size={14} className={event.completed_at ? "text-status-done" : ""} />
              {event.completed_at ? "Done" : "Tick off"}
            </button>
          )}
          <button type="button" onClick={() => onEdit(event)} className="pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg">
            <Icon icon={Edit02Icon} size={14} />
            Edit
          </button>
          <button type="button" aria-label="Delete" onClick={() => remove.mutate(event.id)} className="pressable ml-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-danger hover:bg-danger-soft">
            <Icon icon={Delete02Icon} size={14} />
          </button>
        </div>
      )}
    </>
  )
}

/**
 * "+3": the entries that didn't fit side by side. It opens a list of them;
 * choosing one shows its details, with a way back to the list.
 */
function OverflowChip({ overflow, onEdit }: { overflow: Overflow; onEdit: (e: CalEvent) => void }) {
  const now = useNow()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const { width, left } = laneBox(overflow.lane, overflow.lanes)
  const current = overflow.events.find((e) => e.id === chosen)
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setChosen(null)
      }}
    >
      <PopoverTrigger
        data-event
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`${overflow.events.length} more entries at this time`}
        className="absolute z-[1] flex items-start justify-center rounded-md border border-line-strong bg-raised px-1 py-1 text-[11px] leading-4 font-medium text-fg-2 tabular hover:border-fg-4 hover:text-fg data-popup-open:ring-1 data-popup-open:ring-line-strong"
        style={{ top: overflow.top, height: overflow.height, width, left }}
      >
        <span className="sticky top-1">+{overflow.events.length}</span>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 gap-3 p-3">
        {current ? (
          <>
            <button type="button" onClick={() => setChosen(null)} className="-mx-1 -mt-1 inline-flex h-6 items-center gap-1 self-start rounded-md px-1 text-xs text-fg-3 hover:bg-hover hover:text-fg">
              <Icon icon={ArrowLeft01Icon} size={13} />
              {overflow.events.length} at this time
            </button>
            <EventDetails event={current} onEdit={onEdit} />
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-fg-3">{overflow.events.length} at this time</p>
            <ul className="-mx-1.5 -mt-1.5 flex max-h-72 flex-col overflow-y-auto">
              {overflow.events.map((e) => {
                const done = isEventDone(e, now)
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setChosen(e.id)}
                      className="flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs hover:bg-hover"
                    >
                      <span className={cn("h-4 w-0.5 shrink-0 rounded-full", e.masked ? "bg-line-strong" : e.kind === "meeting" ? "bg-status-in-review" : blockColor(e.color).bar, done && "opacity-40")} />
                      <span className={cn("min-w-0 flex-1 truncate", e.masked ? "text-fg-3" : "text-fg", done && "line-through decoration-fg-4")}>{e.title}</span>
                      <span className="shrink-0 text-fg-3 tabular">{entryTimes(e, { compact: true })}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** "4 more" under a day's due tasks: all of them, a click away. */
function DueMore({ tasks, day }: { tasks: Task[]; day: string }) {
  return (
    <Popover>
      <PopoverTrigger className="self-start rounded-[5px] px-1.5 text-left text-[11px] text-fg-3 hover:bg-hover hover:text-fg data-popup-open:bg-hover">
        {tasks.length - DUE_SHOWN} more
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-1 p-1.5">
        <p className="px-1.5 pt-0.5 pb-1 text-xs font-medium text-fg-3">Due {longDate(day)}</p>
        <div className="flex max-h-72 flex-col overflow-y-auto">
          {tasks.map((t) => (
            <DueChip key={t.id} task={t} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

