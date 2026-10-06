"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Add01Icon, Delete02Icon, Edit02Icon, LayoutTemplateIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@/components/app/icon"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { useMe, useMemberMap, useProjectMap, useToday } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import { EventDialog, type EventDraft } from "@/domains/calendar/components/event-dialog"
import {
  TEMPLATES_MISSING,
  canEditTemplate,
  describeTaskTemplate,
  editTemplateArgs,
  isMissingTable,
  sortTemplates,
  useEventTemplates,
  useTaskTemplates,
  useTemplateActions,
  type EventTemplate,
  type TaskTemplate,
} from "../data"
import { eventLine } from "./template-pickers"

/**
 * Settings, Templates: every template you can use, yours first. Make one with
 * New; change one with Edit, in the same dialog it was made in; rename one by
 * clicking its name; share yours with the team; delete what you no longer need.
 */
export function TemplatesSettings() {
  const me = useMe()
  const members = useMemberMap()
  const projects = useProjectMap()
  const today = useToday()
  const { openCreateTask } = useUI()
  const { data: tasks = [], isLoading: loadingTasks, error: tasksError } = useTaskTemplates()
  const { data: events = [], isLoading: loadingEvents, error: eventsError } = useEventTemplates()
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null)
  const missing = isMissingTable(tasksError) || isMissingTable(eventsError)

  if (missing) return <p className="py-2 text-sm text-fg-3">{TEMPLATES_MISSING}</p>

  return (
    <div className="flex flex-col gap-6">
      <List
        heading="Tasks"
        loading={loadingTasks}
        empty="None yet. Make one with New, or press C and turn on Save as template. Use one with C, then Templates, or from ⌘K."
        onNew={() => openCreateTask({}, { asTemplate: {} })}
      >
        {sortTemplates(tasks, me.id).map((t) => (
          <Row
            key={t.id}
            kind="task"
            template={t}
            icon={LayoutTemplateIcon}
            line={describeTaskTemplate(t, {
              person: displayName(members.get(t.assignee_id ?? "")),
              project: t.project_id ? projects.get(t.project_id)?.name : undefined,
            })}
            onEdit={() => openCreateTask(...editTemplateArgs(t))}
          />
        ))}
      </List>
      <List
        heading="Calendar"
        loading={loadingEvents}
        empty="None yet. Make one with New, or turn on Save as template in Plan time. Use one from the arrow beside Plan time."
        onNew={() => setEventDraft({ day: today, start: 9 * 60, end: 10 * 60, asTemplate: true })}
      >
        {sortTemplates(events, me.id).map((t) => (
          <Row
            key={t.id}
            kind="event"
            template={t}
            icon={t.kind === "meeting" ? UserGroupIcon : LayoutTemplateIcon}
            line={`${eventLine(t)}${t.kind === "meeting" && t.attendee_ids.length > 1 ? ` with ${t.attendee_ids.length - 1} ${t.attendee_ids.length === 2 ? "other" : "others"}` : ""}`}
            onEdit={() => setEventDraft({ day: today, start: t.start_minute, end: t.end_minute, editTemplate: t })}
          />
        ))}
      </List>
      <EventDialog draft={eventDraft} event={null} onClose={() => setEventDraft(null)} />
    </div>
  )
}

function List({
  heading,
  loading,
  empty,
  onNew,
  children,
}: {
  heading: string
  loading: boolean
  empty: string
  onNew: () => void
  children: ReactNode[]
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-xs font-medium text-fg-3">{heading}</h4>
        <button
          type="button"
          onClick={onNew}
          className="pressable inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg"
        >
          <Icon icon={Add01Icon} size={13} />
          New
          <span className="sr-only"> {heading.toLowerCase()} template</span>
        </button>
      </div>
      {loading ? (
        <div className="h-12" />
      ) : children.length ? (
        <ul className="flex flex-col">{children}</ul>
      ) : (
        <p className="py-2 text-sm text-fg-4">{empty}</p>
      )}
    </div>
  )
}

function Row({
  kind,
  template,
  icon,
  line,
  onEdit,
}: {
  kind: "task" | "event"
  template: TaskTemplate | EventTemplate
  icon: typeof LayoutTemplateIcon
  line: string
  onEdit: () => void
}) {
  const me = useMe()
  const members = useMemberMap()
  const { update, remove } = useTemplateActions()
  const [name, setName] = useState(template.name)
  const [confirming, setConfirming] = useState(false)
  const mine = template.created_by === me.id
  const editable = canEditTemplate(template, me)

  // Someone else's rename arrives with the list; take it unless you're typing.
  const [shownFor, setShownFor] = useState(template.name)
  if (shownFor !== template.name) {
    setShownFor(template.name)
    setName(template.name)
  }

  // "Delete" asks once more, then forgets after a few seconds.
  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(t)
  }, [confirming])

  const rename = () => {
    const clean = name.trim()
    if (!clean || clean === template.name) return setName(template.name)
    update.mutate({ kind, id: template.id, patch: { name: clean } })
  }

  return (
    <li className="flex min-h-12 items-center gap-3 border-b border-line/60 py-2 last:border-0">
      <Icon icon={icon} size={15} className="shrink-0 text-fg-3" />
      <div className="min-w-0 flex-1">
        {editable ? (
          <input
            value={name}
            maxLength={120}
            aria-label="Template name"
            onChange={(e) => setName(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setName(template.name)
                e.currentTarget.blur()
              }
            }}
            className="-mx-1.5 h-7 w-full rounded-md bg-transparent px-1.5 text-sm font-medium text-fg outline-none hover:bg-hover focus:bg-hover"
          />
        ) : (
          <p className="truncate text-sm font-medium text-fg">{template.name}</p>
        )}
        <p className="truncate text-xs text-fg-3">
          {!mine && `Shared by ${firstName(members.get(template.created_by ?? ""))} · `}
          {line}
        </p>
      </div>
      {mine && (
        <label className="flex shrink-0 items-center gap-2 text-xs text-fg-3">
          Shared<span className="sr-only"> with the team: {template.name}</span>
          <Switch
            size="sm"
            checked={template.shared}
            onCheckedChange={(shared) => update.mutate({ kind, id: template.id, patch: { shared } })}
          />
        </label>
      )}
      {editable && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${template.name}`}
          title="Edit"
          className="pressable inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
        >
          <Icon icon={Edit02Icon} size={14} />
        </button>
      )}
      {editable && (
        <button
          type="button"
          onClick={() => (confirming ? remove.mutate({ kind, id: template.id, name: template.name }) : setConfirming(true))}
          aria-label={confirming ? `Confirm: delete ${template.name}` : `Delete ${template.name}`}
          className={cn(
            "pressable inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md text-xs font-medium",
            confirming ? "bg-danger-soft px-2 text-danger" : "w-7 text-fg-3 hover:bg-hover hover:text-danger",
          )}
        >
          <Icon icon={Delete02Icon} size={14} />
          {confirming && "Delete"}
        </button>
      )}
    </li>
  )
}
