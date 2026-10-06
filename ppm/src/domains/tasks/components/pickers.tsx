"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Command as Cmdk } from "cmdk"
import { Tick02Icon, Search01Icon, UserIcon, Folder02Icon, Calendar03Icon } from "@hugeicons/core-free-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { addDays, dueLabel, dueState, weekday } from "@/lib/dates"
import { useMe, useMembers, useProjects, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import {
  POLICIES,
  POLICY_META,
  PRIORITIES,
  PRIORITY_META,
  REPEATS,
  REPEAT_META,
  STATUSES,
  STATUS_META,
  type Policy,
  type Priority,
  type Status,
} from "../config"
import { workload } from "../selectors"
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./glyphs"

// One menu, many properties. Every picker in the app (status, priority,
// assignee, project, reviewer, sign-off) is this component with different
// options, so they look and behave the same and all work from the keyboard.

export type PickerOption = {
  value: string
  label: string
  icon?: ReactNode
  meta?: ReactNode
  hint?: string
  keywords?: string[]
  disabled?: boolean
}

export function PickerMenu({
  trigger,
  triggerClassName,
  triggerLabel,
  options,
  value,
  onSelect,
  placeholder,
  multiple = false,
  align = "start",
  width = "w-64",
  footer,
  onOpenChange,
}: {
  trigger: ReactNode
  triggerClassName?: string
  triggerLabel: string
  options: PickerOption[]
  value: string | string[] | null
  onSelect: (value: string) => void
  placeholder: string
  multiple?: boolean
  align?: "start" | "center" | "end"
  width?: string
  footer?: ReactNode
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : [])
  const change = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch("")
    onOpenChange?.(next)
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger
        aria-label={triggerLabel}
        className={triggerClassName}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent align={align} className={cn("gap-0 p-0", width)} onClick={(e) => e.stopPropagation()}>
        <Cmdk loop className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Icon icon={Search01Icon} size={14} className="text-fg-4" />
            <Cmdk.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder}
              className="h-9 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
            />
          </div>
          <Cmdk.List className="max-h-72 overflow-y-auto p-1">
            <Cmdk.Empty className="px-3 py-5 text-center text-sm text-fg-3">No matches</Cmdk.Empty>
            {options.map((o) => (
              <Cmdk.Item
                key={o.value}
                value={`${o.label} ${o.value}`}
                keywords={o.keywords}
                disabled={o.disabled}
                onSelect={() => {
                  onSelect(o.value)
                  // Picking several: clear the search, ready for the next name.
                  if (multiple) setSearch("")
                  else change(false)
                }}
                className="group flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-sm text-fg-2 outline-none data-[disabled=true]:opacity-45 data-[selected=true]:bg-selected data-[selected=true]:text-fg"
                title={o.hint}
              >
                {o.icon && <span className="flex size-4 items-center justify-center">{o.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.meta && <span className="shrink-0 text-xs text-fg-3">{o.meta}</span>}
                <span className="flex w-4 justify-end">
                  {selected.has(o.value) && <Icon icon={Tick02Icon} size={14} className="text-fg" />}
                </span>
              </Cmdk.Item>
            ))}
          </Cmdk.List>
          {footer && <div className="border-t border-line px-3 py-2 text-xs text-fg-3">{footer}</div>}
        </Cmdk>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Option builders, shared by the inline pickers, the panel and the create dialog
// ---------------------------------------------------------------------------
export function statusOptions(blockDone?: string | null): PickerOption[] {
  return STATUSES.map((s, i) => ({
    value: s,
    label: STATUS_META[s].label,
    icon: <StatusIcon status={s} />,
    meta: <span className="tabular text-fg-4">{i + 1}</span>,
    hint: s === "done" && blockDone ? blockDone : STATUS_META[s].hint,
    disabled: s === "done" && Boolean(blockDone),
  }))
}

export function priorityOptions(): PickerOption[] {
  return PRIORITIES.map((p, i) => ({
    value: p,
    label: PRIORITY_META[p].label,
    icon: <PriorityIcon priority={p} />,
    meta: <span className="tabular text-fg-4">{i === 4 ? 0 : i + 1}</span>,
  }))
}

/** People, with how much each already has: assigning with the load in view. */
export function usePeopleOptions({
  projectId,
  noneLabel,
  includeNone = true,
}: {
  projectId?: string | null
  noneLabel?: string
  includeNone?: boolean
} = {}): PickerOption[] {
  const members = useMembers()
  const projects = useProjects()
  const tasks = useTasks()
  const today = useToday()
  const me = useMe()
  return useMemo(() => {
    const load = workload(tasks, members, today)
    const projectMembers = new Set(projects.find((p) => p.id === projectId)?.members.map((m) => m.user_id) ?? [])
    const active = members.filter((m) => !m.deactivated_at)
    active.sort((a, b) => {
      if (a.id === me.id) return -1
      if (b.id === me.id) return 1
      const pa = projectMembers.has(a.id) ? 0 : 1
      const pb = projectMembers.has(b.id) ? 0 : 1
      return pa - pb || displayName(a).localeCompare(displayName(b))
    })
    // Whoever carries the least gets a quiet hint: the first place to look.
    const loads = active.map((m) => load.get(m.id)?.active ?? 0)
    const least = Math.min(...loads)
    const roomiest = active.length > 2 && loads.filter((x) => x === least).length === 1 ? active[loads.indexOf(least)].id : null
    const options: PickerOption[] = active.map((m) => {
      const l = load.get(m.id)
      return {
        value: m.id,
        label: displayName(m),
        icon: <Avatar id={m.id} name={displayName(m)} size="sm" />,
        keywords: [m.email ?? "", m.title ?? ""],
        meta: l ? (
          <span className="tabular">
            {m.id === roomiest && <span className="mr-1.5 text-brand">most room</span>}
            {l.active} open
            {l.overdue > 0 && <span className="text-danger"> · {l.overdue} late</span>}
          </span>
        ) : null,
      }
    })
    if (includeNone) {
      options.unshift({
        value: "none",
        label: noneLabel ?? "No assignee",
        icon: <Icon icon={UserIcon} size={14} className="text-fg-3" />,
      })
    }
    return options
  }, [members, projects, tasks, today, me.id, projectId, noneLabel, includeNone])
}

export function useProjectOptions(): PickerOption[] {
  const projects = useProjects()
  return useMemo(
    () => [
      { value: "none", label: "No project", icon: <Icon icon={Folder02Icon} size={14} className="text-fg-3" /> },
      ...projects
        .filter((p) => p.status !== "closed" && !p.archived)
        .map((p) => ({
          value: p.id,
          label: p.name,
          icon: <ProjectSwatch color={p.color} size={9} />,
          keywords: [p.client_name ?? ""],
        })),
    ],
    [projects],
  )
}

export function policyOptions(): PickerOption[] {
  return POLICIES.map((p) => ({ value: p, label: POLICY_META[p].label, hint: POLICY_META[p].hint }))
}

export function repeatOptions(): PickerOption[] {
  return [{ value: "none", label: "Doesn't repeat" }, ...REPEATS.map((r) => ({ value: r, label: REPEAT_META[r].label }))]
}

// ---------------------------------------------------------------------------
// Ready-made triggers for the property rows used in the create dialog
// ---------------------------------------------------------------------------
export const chipClass =
  "pressable inline-flex h-7 max-w-52 items-center gap-1.5 rounded-md border border-line px-2 text-xs font-medium text-fg-2 hover:border-line-strong hover:bg-hover hover:text-fg data-popup-open:bg-hover"

export function StatusChip({ value }: { value: string }) {
  return (
    <>
      <StatusIcon status={value} size={13} />
      {STATUS_META[value as Status]?.label}
    </>
  )
}

export function PriorityChip({ value }: { value: string }) {
  return (
    <>
      <PriorityIcon priority={value} size={13} />
      {value === "none" ? "Priority" : PRIORITY_META[value as Priority]?.label}
    </>
  )
}

export function PolicyChip({ value }: { value: string }) {
  return <>Sign-off: {POLICY_META[value as Policy]?.label}</>
}

// ---------------------------------------------------------------------------
// Due dates: quick choices first, a calendar for anything else
// ---------------------------------------------------------------------------
function toDate(day: string) {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function fromDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function DueDatePicker({
  value,
  onChange,
  trigger,
  triggerClassName,
  align = "start",
}: {
  value: string | null
  onChange: (day: string | null) => void
  trigger: ReactNode
  triggerClassName?: string
  align?: "start" | "center" | "end"
}) {
  const [open, setOpen] = useState(false)
  const today = useToday()
  const nextMonday = addDays(today, 7 - weekday(today))
  const quick = [
    { label: "Today", day: today },
    { label: "Tomorrow", day: addDays(today, 1) },
    { label: "Next Monday", day: nextMonday },
    { label: "In a week", day: addDays(today, 7) },
  ]
  const pick = (day: string | null) => {
    onChange(day)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Due date"
        className={triggerClassName}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto gap-0 p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-px border-b border-line p-1">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => pick(q.day)}
              className="flex h-8 items-center justify-between rounded-md px-2 text-sm text-fg-2 hover:bg-selected hover:text-fg"
            >
              {q.label}
              <span className="text-xs text-fg-3">{dueLabel(q.day, today) === q.label ? "" : dueLabel(q.day, today)}</span>
            </button>
          ))}
          {value && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex h-8 items-center rounded-md px-2 text-sm text-fg-3 hover:bg-selected hover:text-fg"
            >
              Remove due date
            </button>
          )}
        </div>
        <Calendar
          mode="single"
          weekStartsOn={1}
          selected={value ? toDate(value) : undefined}
          defaultMonth={value ? toDate(value) : toDate(today)}
          onSelect={(d) => d && pick(fromDate(d))}
          className="bg-transparent"
        />
      </PopoverContent>
    </Popover>
  )
}

/** How a due date shows in a list: quiet unless it needs attention. */
export function DueText({ due, done, className }: { due: string | null; done?: boolean; className?: string }) {
  const today = useToday()
  if (!due) return null
  const state = dueState(due, today)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs tabular whitespace-nowrap",
        done ? "text-fg-4" : state === "overdue" ? "text-danger" : state === "today" ? "text-warning" : "text-fg-3",
        className,
      )}
    >
      <Icon icon={Calendar03Icon} size={13} className="opacity-80" />
      {dueLabel(due, today)}
    </span>
  )
}
