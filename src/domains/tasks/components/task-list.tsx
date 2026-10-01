"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { Add01Icon, ArrowDown01Icon, LockKeyIcon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { useMe, useMembers, useProjects } from "@/domains/workspace/provider"
import { Avatar } from "@/components/app/avatar"
import { useUI } from "@/components/app/ui-state"
import { displayName } from "@/domains/workspace/types"
import { STATUS_META, taskKey, type Grouping, type Status, type Task } from "../config"
import { groupTasks, type TaskGroup } from "../selectors"
import { useUpdateTask } from "../data"
import { useTaskPanel } from "../panel-state"
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./glyphs"
import {
  TaskAssigneeButton,
  TaskDueButton,
  TaskPriorityButton,
  TaskProjectButton,
  TaskStatusButton,
} from "./task-properties"
import { BulkBar } from "./bulk-bar"

/**
 * Tasks as rows, grouped (by status unless the view says otherwise). Every
 * property on a row is editable where it sits. J and K move, Enter opens,
 * X selects; selected rows get a bar for changing them together.
 */
export function TaskList({
  tasks,
  grouping,
  showProject = true,
  emptyGroupsHidden = true,
}: {
  tasks: Task[]
  grouping: Grouping
  showProject?: boolean
  emptyGroupsHidden?: boolean
}) {
  const members = useMembers()
  const projects = useProjects()
  const me = useMe()
  const update = useUpdateTask()
  const { open, current } = useTaskPanel()
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["done", "cancelled"]))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const lastClicked = useRef<string | null>(null)

  const groups = useMemo(
    () => groupTasks(tasks, grouping, { members, projects, showEmpty: !emptyGroupsHidden }),
    [tasks, grouping, members, projects, emptyGroupsHidden],
  )
  const visible = useMemo(
    () => groups.flatMap((g) => (collapsed.has(g.key) ? [] : g.tasks)),
    [groups, collapsed],
  )

  // Keyboard: J/K to move, Enter to open, X to select, Escape to clear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("input, textarea, [contenteditable], [role=dialog], [role=menu], [role=listbox]")) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const index = visible.findIndex((t) => t.id === focusId)
      if (e.key === "j" || e.key === "ArrowDown") {
        const next = visible[Math.min(visible.length - 1, index + 1)]
        if (next) {
          setFocusId(next.id)
          document.getElementById(`task-row-${next.id}`)?.scrollIntoView({ block: "nearest" })
          e.preventDefault()
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        const prev = visible[Math.max(0, index - 1)]
        if (prev) {
          setFocusId(prev.id)
          document.getElementById(`task-row-${prev.id}`)?.scrollIntoView({ block: "nearest" })
          e.preventDefault()
        }
      } else if (e.key === "Enter" && focusId) {
        const t = visible[index]
        if (t) open(t.number)
      } else if (e.key === "x" && focusId) {
        toggle(focusId)
      } else if (e.key === "i" && focusId) {
        const t = visible[index]
        if (t && t.assignee_id !== me.id) update.mutate({ id: t.id, patch: { assignee_id: me.id } })
      } else if (e.key === "Escape" && selected.size) {
        setSelected(new Set())
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function toggle(id: string, range = false) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (range && lastClicked.current) {
        const a = visible.findIndex((t) => t.id === lastClicked.current)
        const b = visible.findIndex((t) => t.id === id)
        if (a !== -1 && b !== -1) {
          for (const t of visible.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(t.id)
          return next
        }
      }
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    lastClicked.current = id
  }

  const selectedTasks = useMemo(() => tasks.filter((t) => selected.has(t.id)), [tasks, selected])

  return (
    <div className="pb-24" role="list">
      {groups.map((group) => (
        <div key={group.key} role="group" aria-label={group.label}>
          <GroupHeader
            group={group}
            collapsed={collapsed.has(group.key)}
            onToggle={() =>
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (next.has(group.key)) next.delete(group.key)
                else next.add(group.key)
                return next
              })
            }
          />
          {!collapsed.has(group.key) &&
            group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                showProject={showProject && grouping !== "project"}
                selected={selected.has(task.id)}
                focused={focusId === task.id}
                active={current === task.number}
                onOpen={() => {
                  setFocusId(task.id)
                  open(task.number)
                }}
                onToggle={(range) => toggle(task.id, range)}
              />
            ))}
        </div>
      ))}
      <BulkBar tasks={selectedTasks} onClear={() => setSelected(new Set())} />
    </div>
  )
}

function GroupHeader({ group, collapsed, onToggle }: { group: TaskGroup; collapsed: boolean; onToggle: () => void }) {
  const { openCreateTask } = useUI()
  const members = useMembers()
  const projects = useProjects()

  let icon = null
  const defaults: Record<string, string | null> = {}
  if (group.kind === "status") {
    icon = <StatusIcon status={group.key} />
    defaults.status = group.key
  } else if (group.kind === "priority") {
    icon = <PriorityIcon priority={group.key} />
    defaults.priority = group.key
  } else if (group.kind === "assignee") {
    const m = members.find((x) => x.id === group.key)
    icon = m ? <Avatar id={m.id} name={displayName(m)} size="sm" /> : null
    defaults.assignee_id = m ? m.id : null
  } else if (group.kind === "project") {
    const p = projects.find((x) => x.id === group.key)
    icon = <ProjectSwatch color={p?.color ?? null} size={9} />
    defaults.project_id = p ? p.id : null
  }

  return (
    <div className="group/header sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-line bg-surface/95 pr-3 pl-2 backdrop-blur-sm sm:pl-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="pressable flex h-7 min-w-0 items-center gap-2 rounded-md px-1.5 text-sm hover:bg-hover"
      >
        <Icon icon={ArrowDown01Icon} size={12} className={cn("text-fg-4 transition-transform duration-150", collapsed && "-rotate-90")} />
        {icon}
        <span className="truncate font-medium text-fg">{group.label}</span>
        <span className="text-xs text-fg-3 tabular">{group.tasks.length}</span>
      </button>
      {group.kind !== "none" && (
        <button
          type="button"
          onClick={() => openCreateTask(defaults)}
          aria-label={`New task in ${group.label}`}
          className="pressable ml-auto inline-flex size-6 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity group-hover/header:opacity-100 hover:bg-hover hover:text-fg focus-visible:opacity-100"
        >
          <Icon icon={Add01Icon} size={14} />
        </button>
      )}
    </div>
  )
}

export const TaskRow = memo(function TaskRow({
  task,
  showProject,
  selected,
  focused,
  active,
  onOpen,
  onToggle,
}: {
  task: Task
  showProject: boolean
  selected: boolean
  focused: boolean
  active: boolean
  onOpen: () => void
  onToggle: (range: boolean) => void
}) {
  const closed = !STATUS_META[task.status as Status]?.open
  return (
    <div
      id={`task-row-${task.id}`}
      role="listitem"
      onClick={onOpen}
      className={cn(
        "group/row relative flex h-10 cursor-default items-center gap-1 border-b border-line/60 pr-2 pl-2 text-sm transition-colors sm:pr-3 sm:pl-3",
        selected ? "bg-brand-soft" : active ? "bg-selected" : "hover:bg-hover",
        focused && !selected && "bg-hover shadow-[inset_2px_0_0_var(--brand)]",
      )}
    >
      <span className="flex w-5 items-center justify-center">
        <input
          type="checkbox"
          aria-label={`Select ${taskKey(task)}`}
          checked={selected}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(e.shiftKey)
          }}
          onChange={() => {}}
          className={cn(
            "size-3.5 cursor-default accent-[var(--brand-solid)] transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
          )}
        />
      </span>
      <TaskPriorityButton task={task} />
      <span className="hidden w-[58px] shrink-0 font-mono text-xs text-fg-3 tabular sm:block">{taskKey(task)}</span>
      <TaskStatusButton task={task} />
      <span className={cn("ml-1 min-w-0 flex-1 truncate", closed ? "text-fg-3" : "text-fg")}>{task.title}</span>
      {task.is_private && (
        <span title="Private: only you and the assignee see it" className="text-fg-4">
          <Icon icon={LockKeyIcon} size={13} />
        </span>
      )}
      <span className="ml-2 flex shrink-0 items-center gap-1.5">
        {showProject && task.project_id && <TaskProjectButton task={task} className="hidden md:inline-flex" />}
        <TaskDueButton task={task} />
        <TaskAssigneeButton task={task} />
      </span>
    </div>
  )
})
