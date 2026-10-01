"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Calendar03Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  KanbanIcon,
  LeftToRightListBulletIcon,
  Search01Icon,
  Settings05Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@/components/app/icon"
import { EmptyState } from "@/components/app/page"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { useMembers, useProjects, useToday } from "@/domains/workspace/provider"
import { usePrefs } from "@/domains/workspace/prefs"
import { displayName } from "@/domains/workspace/types"
import {
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
  isOpen,
  type Grouping,
  type Ordering,
  type Task,
  type ViewKind,
} from "../config"
import type { NewTask } from "../data"
import { countFilters, filterTasks, sortTasks, type DueFilter, type TaskFilters } from "../selectors"
import { TaskBoard } from "./task-board"
import { TaskCalendar } from "./task-calendar"
import { TaskList } from "./task-list"
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./glyphs"
import { Avatar } from "@/components/app/avatar"

/**
 * One component behind every task screen: all tasks, my tasks, a project, a
 * person. Each screen passes what it's about; the person chooses how to see
 * it (list, board or calendar), and that choice is remembered per screen.
 */
export function TaskExplorer({
  tasks,
  scopeKey,
  defaultView = "list",
  defaultGrouping = "status",
  showProject = true,
  createDefaults,
  toolbarStart,
  emptyTitle = "No tasks here yet",
  emptyDescription = "Create one with C, or from the + on any group.",
}: {
  tasks: Task[]
  scopeKey: string
  defaultView?: ViewKind
  defaultGrouping?: Grouping
  showProject?: boolean
  createDefaults?: Partial<NewTask>
  toolbarStart?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
}) {
  const today = useToday()
  const { prefs, setPrefs } = usePrefs()
  const { openCreateTask } = useUI()
  const [filters, setFilters] = useState<TaskFilters>({})

  const view = prefs.views?.[scopeKey] ?? defaultView
  const grouping = prefs.groupings?.[scopeKey] ?? defaultGrouping
  const ordering = prefs.orderings?.[scopeKey] ?? "priority"
  const showDone = prefs.showDone?.[scopeKey] ?? true

  const setView = (v: ViewKind) => setPrefs((p) => ({ ...p, views: { ...p.views, [scopeKey]: v } }))
  const setGrouping = (g: Grouping) => setPrefs((p) => ({ ...p, groupings: { ...p.groupings, [scopeKey]: g } }))
  const setOrdering = (o: Ordering) => setPrefs((p) => ({ ...p, orderings: { ...p.orderings, [scopeKey]: o } }))
  const setShowDone = (v: boolean) => setPrefs((p) => ({ ...p, showDone: { ...p.showDone, [scopeKey]: v } }))

  const visible = useMemo(() => {
    let list = filterTasks(tasks, filters, today)
    if (!showDone) list = list.filter((t) => isOpen(t.status))
    return sortTasks(list, ordering)
  }, [tasks, filters, today, showDone, ordering])

  const active = countFilters(filters)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-1.5 sm:px-4">
        {toolbarStart}
        <ViewSwitch value={view} onChange={setView} />
        <FilterMenu filters={filters} onChange={setFilters} />
        <FilterChips filters={filters} onChange={setFilters} />
        <div className="ml-auto flex items-center gap-1.5">
          <SearchBox value={filters.text ?? ""} onChange={(text) => setFilters((f) => ({ ...f, text }))} />
          <DisplayMenu
            view={view}
            grouping={grouping}
            ordering={ordering}
            showDone={showDone}
            onGrouping={setGrouping}
            onOrdering={setOrdering}
            onShowDone={setShowDone}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 && view !== "calendar" ? (
          active > 0 || filters.text ? (
            <EmptyState
              icon={FilterHorizontalIcon}
              title="No tasks match these filters"
              action={
                <button type="button" onClick={() => setFilters({})} className="text-sm font-medium text-brand hover:underline">
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Task01Icon}
              title={emptyTitle}
              description={emptyDescription}
              action={
                <button
                  type="button"
                  onClick={() => openCreateTask(createDefaults)}
                  className="pressable h-8 rounded-md bg-brand-solid px-3 text-sm font-medium text-white hover:bg-brand-solid-hover"
                >
                  New task
                </button>
              }
            />
          )
        ) : view === "list" ? (
          <TaskList tasks={visible} grouping={grouping} showProject={showProject} />
        ) : view === "board" ? (
          <TaskBoard tasks={visible} showCancelled={filters.statuses?.includes("cancelled")} />
        ) : (
          <TaskCalendar tasks={visible} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar pieces
// ---------------------------------------------------------------------------
const VIEW_META: Record<ViewKind, { label: string; icon: typeof KanbanIcon }> = {
  list: { label: "List", icon: LeftToRightListBulletIcon },
  board: { label: "Board", icon: KanbanIcon },
  calendar: { label: "Calendar", icon: Calendar03Icon },
}

function ViewSwitch({ value, onChange }: { value: ViewKind; onChange: (v: ViewKind) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="flex items-center gap-0.5 rounded-md bg-hover p-0.5">
      {(Object.keys(VIEW_META) as ViewKind[]).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "pressable inline-flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-xs font-medium transition-colors",
            value === v ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg",
          )}
        >
          <Icon icon={VIEW_META[v].icon} size={14} />
          <span className="hidden sm:inline">{VIEW_META[v].label}</span>
        </button>
      ))}
    </div>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-7 w-40 items-center gap-1.5 rounded-md border border-line px-2 text-fg-3 transition-colors focus-within:border-line-strong focus-within:text-fg-2 sm:w-52">
      <Icon icon={Search01Icon} size={13} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tasks"
        aria-label="Search tasks"
        className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-fg-4"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="text-fg-4 hover:text-fg">
          <Icon icon={Cancel01Icon} size={12} />
        </button>
      )}
    </label>
  )
}

type FilterKey = "statuses" | "assignees" | "projects" | "priorities" | "due"

const DUE_META: Record<DueFilter, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due in the next 7 days",
  none: "No due date",
}

function useFilterOptions() {
  const members = useMembers()
  const projects = useProjects()
  return useMemo(() => {
    const out: Record<FilterKey, { label: string; options: { value: string; label: string; icon: ReactNode }[] }> = {
      statuses: {
        label: "Status",
        options: STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, icon: <StatusIcon status={s} /> })),
      },
      assignees: {
        label: "Assignee",
        options: [
          { value: "none", label: "No assignee", icon: <span className="size-4 rounded-full border border-dashed border-fg-4" /> },
          ...members
            .filter((m) => !m.deactivated_at)
            .map((m) => ({ value: m.id, label: displayName(m), icon: <Avatar id={m.id} name={displayName(m)} size="xs" /> })),
        ],
      },
      projects: {
        label: "Project",
        options: [
          { value: "none", label: "No project", icon: <ProjectSwatch color={null} size={9} /> },
          ...projects.map((p) => ({ value: p.id, label: p.name, icon: <ProjectSwatch color={p.color} size={9} /> })),
        ],
      },
      priorities: {
        label: "Priority",
        options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, icon: <PriorityIcon priority={p} /> })),
      },
      due: {
        label: "Due date",
        options: (Object.keys(DUE_META) as DueFilter[]).map((d) => ({
          value: d,
          label: DUE_META[d],
          icon: <Icon icon={Calendar03Icon} size={14} className="text-fg-3" />,
        })),
      },
    }
    return out
  }, [members, projects])
}

function FilterMenu({ filters, onChange }: { filters: TaskFilters; onChange: (f: TaskFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FilterKey | null>(null)
  const options = useFilterOptions()
  const count = countFilters(filters)

  const toggle = (key: FilterKey, value: string) => {
    const current = (filters[key] ?? []) as string[]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onChange({ ...filters, [key]: next })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setCategory(null)
      }}
    >
      <PopoverTrigger className="pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg data-popup-open:bg-hover">
        <Icon icon={FilterHorizontalIcon} size={14} />
        Filter
        {count > 0 && <span className="text-fg-3 tabular">{count}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 gap-0 p-1">
        {category === null ? (
          (Object.keys(options) as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className="flex h-8 w-full items-center justify-between rounded-md px-2 text-sm text-fg-2 hover:bg-selected hover:text-fg"
            >
              {options[key].label}
              {(filters[key]?.length ?? 0) > 0 && <span className="text-xs text-fg-3 tabular">{filters[key]!.length}</span>}
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="mb-1 flex h-7 w-full items-center rounded-md px-2 text-xs font-medium text-fg-3 hover:text-fg"
            >
              ← {options[category].label}
            </button>
            <div className="max-h-72 overflow-y-auto">
              {options[category].options.map((o) => {
                const checked = ((filters[category] ?? []) as string[]).includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => toggle(category, o.value)}
                    className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-fg-2 hover:bg-selected hover:text-fg"
                  >
                    <span
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-[4px] border",
                        checked ? "border-brand-solid bg-brand-solid" : "border-line-strong",
                      )}
                    >
                      {checked && <svg viewBox="0 0 10 10" className="size-2.5 text-white"><path d="M2 5.2 4 7.2 8 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>}
                    </span>
                    <span className="flex size-4 items-center justify-center">{o.icon}</span>
                    <span className="truncate">{o.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function FilterChips({ filters, onChange }: { filters: TaskFilters; onChange: (f: TaskFilters) => void }) {
  const options = useFilterOptions()
  const keys = (Object.keys(options) as FilterKey[]).filter((k) => (filters[k]?.length ?? 0) > 0)
  if (keys.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {keys.map((key) => {
        const values = filters[key] as string[]
        const labels = values.map((v) => options[key].options.find((o) => o.value === v)?.label ?? v)
        return (
          <span key={key} className="inline-flex h-6 items-center gap-1 rounded-md border border-line pr-0.5 pl-2 text-xs text-fg-2">
            <span className="text-fg-3">{options[key].label}</span>
            <span className="max-w-48 truncate text-fg">{labels.join(", ")}</span>
            <button
              type="button"
              aria-label={`Remove ${options[key].label} filter`}
              onClick={() => onChange({ ...filters, [key]: [] })}
              className="inline-flex size-5 items-center justify-center rounded-[4px] text-fg-4 hover:bg-hover hover:text-fg"
            >
              <Icon icon={Cancel01Icon} size={11} />
            </button>
          </span>
        )
      })}
      <button type="button" onClick={() => onChange({ text: filters.text })} className="px-1 text-xs text-fg-3 hover:text-fg">
        Clear
      </button>
    </div>
  )
}

const GROUP_LABEL: Record<Grouping, string> = {
  status: "Status",
  assignee: "Assignee",
  project: "Project",
  priority: "Priority",
  none: "No grouping",
}
const ORDER_LABEL: Record<Ordering, string> = {
  priority: "Priority",
  due: "Due date",
  updated: "Last updated",
  created: "Newest first",
}

function DisplayMenu({
  view,
  grouping,
  ordering,
  showDone,
  onGrouping,
  onOrdering,
  onShowDone,
}: {
  view: ViewKind
  grouping: Grouping
  ordering: Ordering
  showDone: boolean
  onGrouping: (g: Grouping) => void
  onOrdering: (o: Ordering) => void
  onShowDone: (v: boolean) => void
}) {
  return (
    <Popover>
      <PopoverTrigger className="pressable inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg data-popup-open:bg-hover">
        <Icon icon={Settings05Icon} size={14} />
        <span className="hidden sm:inline">Display</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 p-3">
        {view === "list" && (
          <Row label="Group by">
            <select value={grouping} onChange={(e) => onGrouping(e.target.value as Grouping)} className={selectClass}>
              {(Object.keys(GROUP_LABEL) as Grouping[]).map((g) => (
                <option key={g} value={g}>{GROUP_LABEL[g]}</option>
              ))}
            </select>
          </Row>
        )}
        <Row label="Order by">
          <select value={ordering} onChange={(e) => onOrdering(e.target.value as Ordering)} className={selectClass}>
            {(Object.keys(ORDER_LABEL) as Ordering[]).map((o) => (
              <option key={o} value={o}>{ORDER_LABEL[o]}</option>
            ))}
          </select>
        </Row>
        <Row label="Show finished tasks">
          <Switch checked={showDone} onCheckedChange={onShowDone} />
        </Row>
        <p className="text-xs leading-4 text-fg-4">Saved for you, on this screen.</p>
      </PopoverContent>
    </Popover>
  )
}

const selectClass =
  "h-7 rounded-md border border-line bg-surface px-1.5 text-xs text-fg outline-none focus:border-line-strong"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-fg-2">
      {label}
      {children}
    </label>
  )
}
