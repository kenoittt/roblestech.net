"use client"

import { useMemo, useState } from "react"
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
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { addDays, addMonths, monthName, startOfMonth, startOfWeek } from "@/lib/dates"
import { useToday } from "@/domains/workspace/provider"
import { useUI } from "@/components/app/ui-state"
import { STATUS_META, type Status, type Task } from "../config"
import { useUpdateTask } from "../data"
import { useTaskPanel } from "../panel-state"
import { StatusIcon } from "./glyphs"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
    return map
  }, [tasks])

  const undated = tasks.filter((t) => !t.due_date && STATUS_META[t.status as Status]?.open).length

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
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
          {days.map((day) => (
            <DayCell key={day} day={day} tasks={byDay.get(day) ?? []} inMonth={day.slice(0, 7) === month.slice(0, 7)} today={today} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>{dragging ? <Chip task={dragging} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}

function DayCell({ day, tasks, inMonth, today }: { day: string; tasks: Task[]; inMonth: boolean; today: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: day })
  const { openCreateTask } = useUI()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? tasks : tasks.slice(0, 4)
  const isToday = day === today
  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => openCreateTask({ due_date: day })}
      className={cn(
        "flex min-h-28 flex-col gap-0.5 border-r border-b border-line p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
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
      {tasks.length > 4 && !expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="px-1.5 text-left text-xs text-fg-3 hover:text-fg">
          {tasks.length - 4} more
        </button>
      )}
    </div>
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
