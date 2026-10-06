"use client"

import { useMemo } from "react"
import { Cancel01Icon, LayoutTemplateIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/app/icon"
import { useMe, useMemberMap } from "@/domains/workspace/provider"
import { firstName } from "@/domains/workspace/types"
import { PickerMenu, type PickerOption } from "@/domains/tasks/components/pickers"
import { formatMinute } from "@/domains/calendar/layout"
import { TEMPLATES_MISSING, isMissingTable, sortTemplates, useEventTemplates, useTaskTemplates, type EventTemplate, type TaskTemplate } from "../data"

// The "Templates" control in the new-task dialog and the calendar's entry
// dialog: one more picker, so it looks and works like every other (search,
// arrow keys, Enter). Yours come first, then the team's shared ones.

type Owned = { id: string; name: string; created_by: string | null; shared: boolean }

function useOptions<T extends Owned>(list: T[], value: string | null, describe: (t: T) => string, icon: (t: T) => React.ReactNode) {
  const me = useMe()
  const members = useMemberMap()
  return useMemo(() => {
    const options: PickerOption[] = sortTemplates(list, me.id).map((t) => ({
      value: t.id,
      label: t.name,
      icon: icon(t),
      // Someone else's: whose it is. Yours and shared: say so.
      meta: t.created_by !== me.id ? firstName(members.get(t.created_by ?? "")) : t.shared ? "Shared" : undefined,
      hint: describe(t),
      keywords: [describe(t)],
    }))
    if (value) options.unshift({ value: "none", label: "No template", icon: <Icon icon={Cancel01Icon} size={14} className="text-fg-3" /> })
    return options
  }, [list, value, me.id, members, describe, icon])
}

function Trigger({ name }: { name?: string }) {
  return (
    <>
      <Icon icon={LayoutTemplateIcon} size={13} />
      <span className="truncate">{name ?? "Templates"}</span>
    </>
  )
}

const taskIcon = () => <Icon icon={LayoutTemplateIcon} size={14} className="text-fg-3" />
const taskLine = (t: TaskTemplate) => t.title

export function TaskTemplatePicker({
  value,
  onSelect,
  triggerClassName,
}: {
  value: string | null
  onSelect: (template: TaskTemplate | null) => void
  triggerClassName: string
}) {
  const { data = [], error } = useTaskTemplates()
  const options = useOptions(data, value, taskLine, taskIcon)
  const current = data.find((t) => t.id === value)
  return (
    <PickerMenu
      triggerLabel="Templates"
      triggerClassName={triggerClassName}
      trigger={<Trigger name={current?.name} />}
      options={options}
      value={value ?? "none"}
      placeholder="Use a template…"
      width="w-80"
      align="end"
      onSelect={(id) => onSelect(data.find((t) => t.id === id) ?? null)}
      footer={
        isMissingTable(error)
          ? TEMPLATES_MISSING
          : data.length
            ? "Fills in the task; change anything before you create it. Manage templates in Settings."
            : "No templates yet. To make one, turn on Save as template below."
      }
    />
  )
}

const eventIcon = (t: EventTemplate) => (
  <Icon icon={t.kind === "meeting" ? UserGroupIcon : LayoutTemplateIcon} size={14} className="text-fg-3" />
)
export const eventLine = (t: Pick<EventTemplate, "start_minute" | "end_minute" | "kind">) =>
  `${formatMinute(t.start_minute)} to ${formatMinute(t.end_minute)}${t.kind === "meeting" ? " · meeting" : ""}`

export function EventTemplatePicker({
  value,
  onSelect,
  triggerClassName,
}: {
  value: string | null
  onSelect: (template: EventTemplate | null) => void
  triggerClassName: string
}) {
  const { data = [], error } = useEventTemplates()
  const options = useOptions(data, value, eventLine, eventIcon)
  const current = data.find((t) => t.id === value)
  return (
    <PickerMenu
      triggerLabel="Templates"
      triggerClassName={triggerClassName}
      trigger={<Trigger name={current?.name} />}
      options={options}
      value={value ?? "none"}
      placeholder="Use a template…"
      width="w-80"
      align="end"
      onSelect={(id) => onSelect(data.find((t) => t.id === id) ?? null)}
      footer={
        isMissingTable(error)
          ? TEMPLATES_MISSING
          : data.length
            ? "Fills in the entry. A time you dragged on the calendar stays. Manage templates in Settings."
            : "No templates yet. To make one, turn on Save as template below."
      }
    />
  )
}
