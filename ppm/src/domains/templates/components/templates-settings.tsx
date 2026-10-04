"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Delete02Icon, LayoutTemplateIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { useMe, useMemberMap, useProjectMap } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import {
  canEditTemplate,
  describeTaskTemplate,
  sortTemplates,
  useEventTemplates,
  useTaskTemplates,
  useTemplateActions,
  type EventTemplate,
  type TaskTemplate,
} from "../data"
import { eventLine } from "./template-pickers"

/**
 * Settings, Templates: every template you can use, yours first. Rename one by
 * clicking its name; share yours with the team; delete what you no longer
 * need. Changing what a template makes happens where it was made: save a task
 * (or an entry) as a template under the same name and it's replaced.
 */
export function TemplatesSettings() {
  const me = useMe()
  const members = useMemberMap()
  const projects = useProjectMap()
  const { data: tasks = [], isLoading: loadingTasks } = useTaskTemplates()
  const { data: events = [], isLoading: loadingEvents } = useEventTemplates()

  return (
    <div className="flex flex-col gap-6">
      <List
        heading="Tasks"
        loading={loadingTasks}
        empty="None yet. Open any task, then ⋯ and Save as template. Use one with C, then Templates, or from ⌘K."
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
          />
        ))}
      </List>
      <List
        heading="Calendar"
        loading={loadingEvents}
        empty="None yet. Open one of your entries, then Edit and Save as template. Use one from the arrow beside Plan time."
      >
        {sortTemplates(events, me.id).map((t) => (
          <Row
            key={t.id}
            kind="event"
            template={t}
            icon={t.kind === "meeting" ? UserGroupIcon : LayoutTemplateIcon}
            line={`${eventLine(t)}${t.kind === "meeting" && t.attendee_ids.length > 1 ? ` with ${t.attendee_ids.length - 1} ${t.attendee_ids.length === 2 ? "other" : "others"}` : ""}`}
          />
        ))}
      </List>
    </div>
  )
}

function List({ heading, loading, empty, children }: { heading: string; loading: boolean; empty: string; children: ReactNode[] }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium text-fg-3">{heading}</h4>
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
}: {
  kind: "task" | "event"
  template: TaskTemplate | EventTemplate
  icon: typeof LayoutTemplateIcon
  line: string
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
