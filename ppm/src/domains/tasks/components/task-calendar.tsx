"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { addDays, addMonths, longDate, monthName, startOfMonth, startOfWeek } from "@/lib/dates"
import { useToday } from "@/domains/workspace/provider"
import { useUI } from "@/components/app/ui-state"
import { STATUS_META, taskKey, type Status, type Task } from "../config"
import { useUpdateTask } from "../data"
import { useTaskPanel } from "../panel-state"
import { StatusIcon } from "./glyphs"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
// A day cell: 12px of padding and the date's 22px row, then 26px per line (a 24px chip and its gap).
const CELL_CHROME = 34
const CHIP_ROW = 26

/**
 * Tasks on the days they're due. Only tasks with a due date appear (Kyan,
 * 2026-10-02). Drag one to another day to move its due date.
 */
export function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const today = useToday()
  const [month, setMonth] = useState(() => startOfMonth(today))
  const update = useUpdateTask()
  const [dragging, setDragging] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const days = useMemo(() => {
    const first = startOfWeek(month)
    const last = addDays(startOfMonth(addMonths(month, 1)), -1)
    const out: string[] = []
    for (let d = first; out.length < 42; d = addDays(d, 1)) {
      out.push(d)
      if (out.length % 7 === 0 && d >= last) break
    }
    return out
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.due_date) continue
      const list = map.get(t.due_date)
      if (list) list.push(t)
      else map.set(t.due_date, [t])
    }
    // Open work takes the lines a day has room for; finished work comes last.
    const closed = (t: Task) => (STATUS_META[t.status as Status]?.open ? 0 : 1)
    for (const list of map.values()) list.sort((a, b) => closed(a) - closed(b))
    return map
  }, [tasks])

  const undated = tasks.filter((t) => !t.due_date && STATUS_META[t.status as Status]?.open).length

  // How many tasks fit in a day: every row is the same height, so measuring one cell is enough.
  const gridRef = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(3)
  useLayoutEffect(() => {
    const cell = gridRef.current?.firstElementChild as HTMLElement | null
    if (!cell) return
    const measure = () => setFits(Math.max(2, Math.floor((cell.clientHeight - CELL_CHROME) / CHIP_ROW)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(cell)
    return () => observer.disconnect()
  }, [days.length])

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const task = tasks.find((t) => t.id === e.active.id)
    const day = e.over?.id as string | undefined
    if (task && day && day !== task.due_date) update.mutate({ id: task.id, patch: { due_date: day } })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 px-3 sm:px-4">
        <h2 className="text-sm font-medium text-fg">
          {monthName(month, true)} {month.slice(0, 4)}
        </h2>
        <div className="ml-2 flex items-center">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}
            className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
            <Icon icon={ArrowLeft01Icon} size={14} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}
            className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
            <Icon icon={ArrowRight01Icon} size={14} />
          </button>
        </div>
        <button type="button" onClick={() => setMonth(startOfMonth(today))}
          className="pressable h-7 rounded-md border border-line px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg">
          Today
        </button>
        {undated > 0 && <span className="ml-auto text-xs text-fg-3">{undated} open tasks have no due date and don't show here</span>}
      </div>
      <div className="grid shrink-0 grid-cols-7 border-y border-line">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-xs font-medium text-fg-3">{d}</div>
        ))}
      </div>
      <DndContext id="task-calendar" sensors={sensors} onDragStart={(e) => setDragging(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        {/* Weeks share the height, but never shrink below a readable row: then the month scrolls. */}
        <div ref={gridRef} className="grid min-h-0 flex-1 auto-rows-[minmax(7.5rem,1fr)] grid-cols-7 overflow-y-auto">
          {days.map((day) => (
            <DayCell key={day} day={day} tasks={byDay.get(day) ?? []} inMonth={day.slice(0, 7) === month.slice(0, 7)} today={today} fits={fits} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>{dragging ? <Chip task={dragging} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}

function DayCell({ day, tasks, inMonth, today, fits }: { day: string; tasks: Task[]; inMonth: boolean; today: string; fits: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: day })
  const { openCreateTask } = useUI()
  // When they don't all fit, the last line says how many more there are.
  const shown = tasks.length > fits ? tasks.slice(0, Math.max(0, fits - 1)) : tasks
  const isToday = day === today
  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => openCreateTask({ due_date: day })}
      className={cn(
        "flex min-h-0 flex-col gap-0.5 overflow-hidden border-r border-b border-line p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
        !inMonth && "bg-inset/60",
        isOver && "bg-selected",
      )}
    >
      <div className="mb-0.5 flex items-center px-1">
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 text-xs tabular",
            isToday ? "bg-brand-solid font-semibold text-white" : inMonth ? "text-fg-2" : "text-fg-4",
          )}
        >
          {Number(day.slice(8))}
        </span>
      </div>
      {shown.map((t) => (
        <DraggableChip key={t.id} task={t} />
      ))}
      {shown.length < tasks.length && <MoreTasks day={day} tasks={tasks} hidden={tasks.length - shown.length} />}
    </div>
  )
}

/** "3 more": every task due that day, in a list anchored to the day. */
function MoreTasks({ day, tasks, hidden }: { day: string; tasks: Task[]; hidden: number }) {
  const { open } = useTaskPanel()
  const [isOpen, setOpen] = useState(false)
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger
        onDoubleClick={(e) => e.stopPropagation()}
        className="flex h-6 shrink-0 items-center rounded-[5px] px-1.5 text-left text-xs font-medium text-fg-3 hover:bg-hover hover:text-fg data-popup-open:bg-hover data-popup-open:text-fg"
      >
        {hidden} more
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-1 p-1.5" onDoubleClick={(e) => e.stopPropagation()}>
        <p className="px-1.5 pt-0.5 pb-1 text-xs font-medium text-fg-3">
          {longDate(day)} · {tasks.length} due
        </p>
        <ul className="flex max-h-80 flex-col overflow-y-auto">
          {tasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  open(t.number)
                }}
                className="w-full rounded-[5px] text-left"
                title={`${taskKey(t)} · ${t.title}`}
              >
                <Chip task={t} />
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function DraggableChip({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const { open } = useTaskPanel()
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => open(task.number)}
      onKeyDown={(e) => {
        if (e.key === "Enter") open(task.number)
      }}
      aria-label={task.title}
      className={cn("rounded-[5px] outline-none select-none focus-visible:shadow-[0_0_0_2px_var(--brand)]", isDragging && "opacity-30")}
    >
      <Chip task={task} />
    </div>
  )
}

function Chip({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const closed = !STATUS_META[task.status as Status]?.open
  return (
    <div
      className={cn(
        "flex h-6 cursor-default items-center gap-1.5 rounded-[5px] px-1.5 text-xs hover:bg-hover",
        overlay && "bg-raised shadow-popover",
      )}
    >
      <StatusIcon status={task.status} size={12} />
      <span className={cn("truncate", closed ? "text-fg-3 line-through decoration-fg-4" : "text-fg-2")}>{task.title}</span>
    </div>
  )
}
