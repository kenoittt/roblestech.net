"use client"

import { memo, useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Add01Icon, LockKeyIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { useUI } from "@/components/app/ui-state"
import { useMe, useMemberMap, useProjectMap } from "@/domains/workspace/provider"
import { firstName } from "@/domains/workspace/types"
import { STATUSES, STATUS_META, canComplete, signOffPeople, taskKey, type Status, type Task } from "../config"
import { useUpdateTask } from "../data"
import { useTaskPanel } from "../panel-state"
import { ProjectSwatch, StatusIcon } from "./glyphs"
import { TaskAssigneeButton, TaskDueButton, TaskPriorityButton } from "./task-properties"

/**
 * The board: one column per status. Dragging a card to another column changes
 * its status, and the sign-off rules still apply, so a card that needs a
 * reviewer can't be dropped on Done by the wrong person.
 */
export function TaskBoard({ tasks, showCancelled = false, showProject = true }: { tasks: Task[]; showCancelled?: boolean; showProject?: boolean }) {
  const me = useMe()
  const members = useMemberMap()
  const update = useUpdateTask()
  const [dragging, setDragging] = useState<Task | null>(null)

  const columns = useMemo(() => {
    const statuses = STATUSES.filter((s) => s !== "cancelled" || showCancelled)
    return statuses.map((s) => ({ status: s, tasks: tasks.filter((t) => t.status === s) }))
  }, [tasks, showCancelled])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const onDragStart = (e: DragStartEvent) => setDragging(tasks.find((t) => t.id === e.active.id) ?? null)

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const task = tasks.find((t) => t.id === e.active.id)
    const status = e.over?.id as Status | undefined
    if (!task || !status || status === task.status) return
    if (status === "done" && !canComplete(task, me.id, me.role)) {
      const names = signOffPeople(task).map((id) => firstName(members.get(id))).join(" or ")
      toast(`${taskKey(task)} needs a sign-off`, {
        description: names ? `Only ${names} can mark it done. Move it to In review instead.` : "Move it to In review instead.",
      })
      return
    }
    update.mutate({ id: task.id, patch: { status } })
  }

  return (
    <DndContext id="task-board" sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto px-3 pt-3 pb-4 select-none sm:px-4">
        {columns.map((col) => (
          <Column key={col.status} status={col.status} tasks={col.tasks} showProject={showProject} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {dragging ? <CardBody task={dragging} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ status, tasks, showProject }: { status: Status; tasks: Task[]; showProject: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { openCreateTask } = useUI()
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_META[status].label}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-lg transition-colors duration-150",
        isOver ? "bg-selected" : "bg-transparent",
      )}
    >
      <header className="group/col flex h-9 shrink-0 items-center gap-2 px-2">
        <StatusIcon status={status} />
        <span className="text-sm font-medium text-fg">{STATUS_META[status].label}</span>
        <span className="text-xs text-fg-3 tabular">{tasks.length}</span>
        <button
          type="button"
          onClick={() => openCreateTask({ status })}
          aria-label={`New task in ${STATUS_META[status].label}`}
          className="pressable ml-auto inline-flex size-6 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
        >
          <Icon icon={Add01Icon} size={14} />
        </button>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-1.5 overflow-y-auto px-1 pb-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} showProject={showProject} />
        ))}
        {tasks.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-line text-xs text-fg-4">
            Drop here
          </div>
        )}
      </div>
    </section>
  )
}

const DraggableCard = memo(function DraggableCard({ task, showProject }: { task: Task; showProject: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const { open } = useTaskPanel()
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => open(task.number)}
      className={cn("outline-none select-none", isDragging && "opacity-30")}
    >
      <CardBody task={task} showProject={showProject} />
    </div>
  )
})

function CardBody({ task, overlay = false, showProject = true }: { task: Task; overlay?: boolean; showProject?: boolean }) {
  const projects = useProjectMap()
  const project = task.project_id ? projects.get(task.project_id) : null
  const closed = !STATUS_META[task.status as Status]?.open
  return (
    <article
      className={cn(
        "group/card flex cursor-default flex-col gap-2 rounded-lg bg-raised p-3 shadow-[0_0_0_1px_var(--line)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--line-strong)]",
        overlay && "scale-[1.02] shadow-popover",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-fg-3 tabular">{taskKey(task)}</span>
        {task.is_private && <Icon icon={LockKeyIcon} size={12} className="text-fg-4" />}
        <span className="ml-auto">
          <TaskAssigneeButton task={task} />
        </span>
      </div>
      <p className={cn("line-clamp-2 text-sm leading-5", closed ? "text-fg-3" : "text-fg")}>{task.title}</p>
      <div className="flex min-h-6 items-center gap-1.5">
        <TaskPriorityButton task={task} className="-ml-1" />
        <TaskDueButton task={task} />
        {project && showProject && (
          <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs text-fg-3">
            <ProjectSwatch color={project.color} size={8} />
            <span className="truncate">{project.name}</span>
          </span>
        )}
      </div>
    </article>
  )
}
