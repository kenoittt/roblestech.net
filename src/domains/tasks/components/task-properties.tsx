"use client"

import { useMemo } from "react"
import { UserIcon } from "@hugeicons/core-free-icons"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { useMe, useMemberMap, useProjectMap } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import { canComplete, signOffPeople, type Task } from "../config"
import { useUpdateTask } from "../data"
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./glyphs"
import {
  DueDatePicker,
  DueText,
  PickerMenu,
  priorityOptions,
  statusOptions,
  usePeopleOptions,
  useProjectOptions,
} from "./pickers"

// Each property of a task, as a small control that edits it in place.
// Used in list rows, on board cards and in the panel.

const iconButton =
  "pressable inline-flex size-6 shrink-0 items-center justify-center rounded-[5px] hover:bg-selected data-popup-open:bg-selected"

/** Why this person can't mark the task done, in a sentence, or null if they can. */
export function useDoneBlock(task: Task): string | null {
  const me = useMe()
  const members = useMemberMap()
  if (canComplete(task, me.id, me.role)) return null
  const names = signOffPeople(task)
    .map((id) => firstName(members.get(id)))
    .filter(Boolean)
  if (task.completion_policy === "not_assignee") return "Someone other than the assignee signs this off. Move it to In review."
  if (names.length === 0) return "You can't mark this done. Move it to In review."
  return `Only ${names.join(" or ")} can mark this done. Move it to In review.`
}

export function TaskStatusButton({ task, size = 14, className }: { task: Task; size?: number; className?: string }) {
  const update = useUpdateTask()
  const block = useDoneBlock(task)
  const options = useMemo(() => statusOptions(block), [block])
  return (
    <PickerMenu
      triggerLabel="Change status"
      triggerClassName={cn(iconButton, className)}
      trigger={<StatusIcon status={task.status} size={size} />}
      options={options}
      value={task.status}
      placeholder="Change status…"
      onSelect={(status) => status !== task.status && update.mutate({ id: task.id, patch: { status } })}
      footer={block ?? undefined}
    />
  )
}

export function TaskPriorityButton({ task, className }: { task: Task; className?: string }) {
  const update = useUpdateTask()
  const options = useMemo(() => priorityOptions(), [])
  return (
    <PickerMenu
      triggerLabel="Change priority"
      triggerClassName={cn(iconButton, className)}
      trigger={<PriorityIcon priority={task.priority} />}
      options={options}
      value={task.priority}
      placeholder="Set priority…"
      onSelect={(priority) => priority !== task.priority && update.mutate({ id: task.id, patch: { priority } })}
    />
  )
}

export function TaskAssigneeButton({
  task,
  withName = false,
  className,
}: {
  task: Task
  withName?: boolean
  className?: string
}) {
  const update = useUpdateTask()
  const members = useMemberMap()
  const options = usePeopleOptions({ projectId: task.project_id })
  const assignee = task.assignee_id ? members.get(task.assignee_id) : null
  return (
    <PickerMenu
      triggerLabel={assignee ? `Assigned to ${displayName(assignee)}. Change assignee` : "Assign"}
      triggerClassName={cn(
        withName
          ? "pressable -mx-1.5 inline-flex h-7 max-w-full items-center gap-2 rounded-md px-1.5 text-sm hover:bg-selected data-popup-open:bg-selected"
          : cn(iconButton, "size-7 rounded-full"),
        className,
      )}
      trigger={
        <>
          {assignee ? (
            <Avatar id={assignee.id} name={displayName(assignee)} size={withName ? "sm" : "md"} muted={Boolean(assignee.deactivated_at)} />
          ) : (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full border border-dashed border-fg-4 text-fg-4",
                withName ? "size-5" : "size-6",
              )}
            >
              <Icon icon={UserIcon} size={withName ? 11 : 12} />
            </span>
          )}
          {withName && <span className={cn("truncate", assignee ? "text-fg" : "text-fg-3")}>{assignee ? displayName(assignee) : "Unassigned"}</span>}
        </>
      }
      options={options}
      value={task.assignee_id ?? "none"}
      placeholder="Assign to…"
      width="w-80"
      align={withName ? "start" : "end"}
      onSelect={(v) => {
        const assignee_id = v === "none" ? null : v
        if (assignee_id !== task.assignee_id) update.mutate({ id: task.id, patch: { assignee_id } })
      }}
    />
  )
}

export function TaskDueButton({
  task,
  withEmpty = false,
  className,
}: {
  task: Task
  withEmpty?: boolean
  className?: string
}) {
  const update = useUpdateTask()
  const done = task.status === "done" || task.status === "cancelled"
  if (!task.due_date && !withEmpty) return null
  return (
    <DueDatePicker
      value={task.due_date}
      onChange={(due_date) => update.mutate({ id: task.id, patch: { due_date } })}
      triggerClassName={cn(
        "pressable inline-flex h-6 items-center rounded-[5px] px-1 hover:bg-selected data-popup-open:bg-selected",
        className,
      )}
      align="end"
      trigger={task.due_date ? <DueText due={task.due_date} done={done} /> : <span className="text-xs text-fg-3">Set date</span>}
    />
  )
}

export function TaskProjectButton({ task, withName = true, className }: { task: Task; withName?: boolean; className?: string }) {
  const update = useUpdateTask()
  const projects = useProjectMap()
  const options = useProjectOptions()
  const project = task.project_id ? projects.get(task.project_id) : null
  if (!project && !withName) return null
  return (
    <PickerMenu
      triggerLabel="Move to project"
      triggerClassName={cn(
        "pressable inline-flex h-6 max-w-40 items-center gap-1.5 rounded-[5px] px-1.5 text-xs text-fg-3 hover:bg-selected hover:text-fg-2 data-popup-open:bg-selected",
        className,
      )}
      trigger={
        project ? (
          <>
            <ProjectSwatch color={project.color} size={8} />
            <span className="truncate">{project.name}</span>
          </>
        ) : (
          <span className="text-fg-4">No project</span>
        )
      }
      options={options}
      value={task.project_id ?? "none"}
      placeholder="Move to project…"
      align="end"
      onSelect={(v) => {
        const project_id = v === "none" ? null : v
        if (project_id !== task.project_id) update.mutate({ id: task.id, patch: { project_id } })
      }}
    />
  )
}
