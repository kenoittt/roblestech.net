"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarStack } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { useMembers } from "@/domains/workspace/provider"
import { displayName, firstName, namesLine } from "@/domains/workspace/types"
import { PickerMenu, type PickerOption } from "@/domains/tasks/components/pickers"

/**
 * Choose several people: a field that shows who's chosen, as photos and
 * names, with a searchable list behind it. It reads the same with 3 people as
 * with 300, where a row of chips for everyone would run on for screens.
 */
export function PeoplePicker({
  value,
  onChange,
  label,
  placeholder,
  exclude = [],
  locked = [],
  lockedNote = "Always included",
  footer,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  /** What the field is, for screen readers: "Who's invited". */
  label: string
  placeholder: string
  /** People not offered at all: you, for a meeting you're planning. */
  exclude?: string[]
  /** Chosen and can't be taken off: a project's owner. */
  locked?: string[]
  lockedNote?: string
  footer?: ReactNode
}) {
  const members = useMembers()
  // Who's chosen comes first when the list opens, and stays put while you click.
  const [openedWith, setOpenedWith] = useState<string[]>([])
  const chosen = [...new Set([...locked, ...value])]

  const options = useMemo(() => {
    const first = new Set(openedWith)
    return members
      .filter((m) => !m.deactivated_at && !exclude.includes(m.id))
      .sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id)) || displayName(a).localeCompare(displayName(b)))
      .map(
        (m): PickerOption => ({
          value: m.id,
          label: displayName(m),
          icon: <Avatar id={m.id} name={displayName(m)} size="sm" />,
          keywords: [m.email ?? "", m.title ?? ""],
          meta: locked.includes(m.id) ? lockedNote : m.title ? <span className="text-fg-4">{m.title}</span> : undefined,
          disabled: locked.includes(m.id),
        }),
      )
  }, [members, openedWith, exclude, locked, lockedNote])

  const people = chosen.map((id) => members.find((m) => m.id === id)).filter((m) => m !== undefined)
  const summary = people.length === 1 ? displayName(people[0]) : namesLine(people.map((m) => firstName(m)))

  return (
    <PickerMenu
      triggerLabel={label}
      triggerClassName="pressable flex min-h-9 w-full items-center gap-2.5 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-left text-sm text-fg hover:border-fg-4 data-popup-open:border-brand"
      trigger={
        <>
          {people.length ? (
            <>
              <AvatarStack people={people.map((m) => ({ id: m.id, name: displayName(m) }))} max={6} size="md" />
              <span className="min-w-0 flex-1 truncate">{summary}</span>
            </>
          ) : (
            <span className="flex-1 text-fg-4">{placeholder}</span>
          )}
          <Icon icon={ArrowDown01Icon} size={14} className="shrink-0 text-fg-3" />
        </>
      }
      options={options}
      value={chosen}
      multiple
      placeholder="Search by name or email…"
      width="w-(--anchor-width) min-w-72"
      onOpenChange={(open) => open && setOpenedWith(chosen)}
      onSelect={(id) => {
        if (locked.includes(id)) return
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
      }}
      footer={footer}
    />
  )
}
