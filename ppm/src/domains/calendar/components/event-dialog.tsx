"use client"

import { useMemo, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon, LayoutTemplateIcon, Task01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { isoDay, manilaInstant, minutesOfDay } from "@/lib/dates"
import { getSupabase } from "@/lib/supabase/client"
import { useMe, useMembers, useTasks } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import { isOpen, taskKey } from "@/domains/tasks/config"
import { PickerMenu, chipClass, type PickerOption } from "@/domains/tasks/components/pickers"
import { StatusIcon } from "@/domains/tasks/components/glyphs"
import { canEditTemplate, sortTemplates, useEventTemplates, useTemplateActions, type EventTemplate } from "@/domains/templates/data"
import { EventTemplatePicker } from "@/domains/templates/components/template-pickers"
import { useCalendarActions, type CalEvent } from "../data"
import { durationLabel, formatMinute } from "../layout"

export type EventDraft = {
  day: string
  start: number
  end: number
  taskId?: string | null
  kind?: "block" | "meeting"
  /** Dragged out on the calendar: a template fills in the rest but keeps this time. */
  explicitTime?: boolean
  /** Start from this template (a meeting from the Plan time menu, to check before inviting). */
  template?: EventTemplate
}

const VISIBILITY = [
  { value: "public", label: "Public", hint: "The team sees the title and the time." },
  { value: "busy", label: "Busy", hint: "The team sees that you're busy, not what it is." },
  { value: "private", label: "Private", hint: "Only you see it." },
] as const

const TIMES = Array.from({ length: (24 - 6) * 4 }, (_, i) => 6 * 60 + i * 15)

const input =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-brand"

/** New calendar entry, or an existing one to edit. */
export function EventDialog({
  draft,
  event,
  onClose,
}: {
  draft: EventDraft | null
  event: CalEvent | null
  onClose: () => void
}) {
  const open = Boolean(draft || event)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup className="ui-dialog fixed top-[8vh] left-1/2 z-50 flex max-h-[86vh] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-xl bg-raised shadow-popover outline-none">
          {open && <Form key={event?.id ?? `${draft?.day}-${draft?.start}-${draft?.taskId}-${draft?.template?.id}`} draft={draft} event={event} onClose={onClose} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Form({ draft, event, onClose }: { draft: EventDraft | null; event: CalEvent | null; onClose: () => void }) {
  const me = useMe()
  const members = useMembers()
  const tasks = useTasks()
  const { create, update, remove } = useCalendarActions()

  const linked = tasks.find((t) => t.id === (event?.task_id ?? draft?.taskId))
  const preset = draft?.template
  // A meeting's people, less whoever is planning it (they own it) and anyone who has left.
  const invitees = (ids: string[]) => ids.filter((id) => id !== me.id && members.some((m) => m.id === id && !m.deactivated_at))
  const [kind, setKind] = useState<"block" | "meeting">(event?.kind ?? (preset?.kind as "block" | "meeting" | undefined) ?? draft?.kind ?? "block")
  const [title, setTitle] = useState(event?.title ?? preset?.title ?? linked?.title ?? "")
  const [taskId, setTaskId] = useState<string | null>(event?.task_id ?? draft?.taskId ?? null)
  const [day, setDay] = useState(event ? isoDay(event.starts_at) : draft!.day)
  const [start, setStart] = useState(event ? minutesOfDay(event.starts_at) : draft!.start)
  const [end, setEnd] = useState(event ? minutesOfDay(event.ends_at) : draft!.end)
  const [visibility, setVisibility] = useState<CalEvent["visibility"]>(event?.visibility ?? (preset?.visibility as CalEvent["visibility"] | undefined) ?? "public")
  const [auto, setAuto] = useState(event?.auto_complete ?? preset?.auto_complete ?? false)
  const [notes, setNotes] = useState(event?.notes ?? preset?.notes ?? "")
  const [attendees, setAttendees] = useState<string[]>(event ? event.attendee_ids.filter((a) => a !== me.id) : invitees(preset?.attendee_ids ?? []))
  const [templateId, setTemplateId] = useState<string | null>(preset?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  // A template fills in what the entry is. A time dragged out on the calendar
  // stays; otherwise the template's time of day is used, on the chosen day.
  const applyTemplate = (t: EventTemplate | null) => {
    setTemplateId(t?.id ?? null)
    setKind((t?.kind as "block" | "meeting" | undefined) ?? draft?.kind ?? "block")
    setTitle(t?.title ?? linked?.title ?? "")
    setNotes(t?.notes ?? "")
    setVisibility((t?.visibility as CalEvent["visibility"] | undefined) ?? "public")
    setAuto(t?.auto_complete ?? false)
    setAttendees(invitees(t?.attendee_ids ?? []))
    if (!draft?.explicitTime) {
      setStart(t?.start_minute ?? draft!.start)
      setEnd(t?.end_minute ?? draft!.end)
    }
  }

  const taskOptions: PickerOption[] = useMemo(
    () => [
      { value: "none", label: "No task", icon: <Icon icon={Task01Icon} size={14} className="text-fg-3" /> },
      ...tasks
        .filter((t) => isOpen(t.status) && (t.assignee_id === me.id || t.id === taskId))
        .sort((a, b) => (a.due_date ?? "9999") < (b.due_date ?? "9999") ? -1 : 1)
        .map((t) => ({
          value: t.id,
          label: t.title,
          icon: <StatusIcon status={t.status} />,
          meta: <span className="font-mono text-fg-4">{taskKey(t)}</span>,
          keywords: [taskKey(t)],
        })),
    ],
    [tasks, me.id, taskId],
  )
  const linkedTask = tasks.find((t) => t.id === taskId)

  const save = async () => {
    setError(null)
    if (!title.trim()) return setError("Give it a title.")
    if (end <= start) return setError("It has to end after it starts.")
    const row = {
      kind,
      title: title.trim(),
      notes: notes.trim() || null,
      starts_at: manilaInstant(day, start),
      ends_at: manilaInstant(day, end),
      task_id: taskId,
      visibility,
      auto_complete: auto,
    }
    try {
      if (event) {
        await update.mutateAsync({ id: event.id, patch: row })
        if (kind === "meeting") {
          const supabase = getSupabase()
          const before = new Set(event.attendee_ids)
          const after = new Set([me.id, ...attendees])
          const add = [...after].filter((a) => !before.has(a))
          const drop = [...before].filter((a) => !after.has(a))
          if (add.length) await supabase.from("cal_event_attendees").insert(add.map((user_id) => ({ event_id: event.id, user_id })))
          if (drop.length) await supabase.from("cal_event_attendees").delete().eq("event_id", event.id).in("user_id", drop)
        }
      } else {
        await create.mutateAsync({ ...row, attendees: kind === "meeting" ? attendees : [] })
      }
      onClose()
    } catch {
      // The mutation shows the reason.
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-4">
        <DialogPrimitive.Title className="text-md font-semibold text-fg">
          {event ? (kind === "meeting" ? "Edit meeting" : "Edit block") : "Plan time"}
        </DialogPrimitive.Title>
        <div className="flex items-center gap-1">
          {!event && (
            <EventTemplatePicker
              value={templateId}
              onSelect={applyTemplate}
              triggerClassName={cn(chipClass, templateId && "border-brand/50 text-fg")}
            />
          )}
          <DialogPrimitive.Close aria-label="Close" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
            <Icon icon={Cancel01Icon} />
          </DialogPrimitive.Close>
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pt-3 pb-5">
        <div className="flex gap-1 rounded-md bg-hover p-0.5" role="radiogroup" aria-label="Kind">
          {(["block", "meeting"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("pressable h-7 flex-1 rounded-[5px] text-xs font-medium", kind === k ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg")}
            >
              {k === "block" ? "Time block" : "Meeting"}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Title</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "meeting" ? "What's the meeting about?" : "What will you work on?"} className={input} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">For a task <span className="font-normal text-fg-4">(optional)</span></span>
          <PickerMenu
            triggerLabel="Link a task"
            triggerClassName="pressable flex h-9 w-full items-center gap-2 rounded-md border border-line-strong px-3 text-left text-sm text-fg hover:bg-hover"
            trigger={linkedTask ? <><StatusIcon status={linkedTask.status} /><span className="truncate">{linkedTask.title}</span></> : <span className="text-fg-3">No task</span>}
            options={taskOptions}
            value={taskId ?? "none"}
            placeholder="Find one of your tasks…"
            width="w-[420px]"
            onSelect={(v) => {
              const id = v === "none" ? null : v
              setTaskId(id)
              const t = tasks.find((x) => x.id === id)
              if (t && !title.trim()) setTitle(t.title)
            }}
          />
        </div>

        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">Day</span>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">From</span>
            <select value={start} onChange={(e) => {
              const s = Number(e.target.value)
              setEnd((old) => (old <= s ? s + (end - start) : old))
              setStart(s)
            }} className={input}>
              {TIMES.map((t) => <option key={t} value={t}>{formatMinute(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">To <span className="font-normal text-fg-4">{end > start ? durationLabel(end - start) : ""}</span></span>
            <select value={end} onChange={(e) => setEnd(Number(e.target.value))} className={input}>
              {TIMES.filter((t) => t > start).map((t) => <option key={t} value={t}>{formatMinute(t)}</option>)}
            </select>
          </label>
        </div>

        {kind === "meeting" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">Who's invited</span>
            <div className="flex flex-wrap gap-1.5">
              {members.filter((m) => !m.deactivated_at && m.id !== me.id).map((m) => {
                const on = attendees.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAttendees(on ? attendees.filter((a) => a !== m.id) : [...attendees, m.id])}
                    className={cn(
                      "pressable inline-flex h-8 items-center gap-2 rounded-md border px-2 text-sm",
                      on ? "border-brand/50 bg-brand-soft text-fg" : "border-line text-fg-3 hover:border-line-strong hover:text-fg",
                    )}
                  >
                    <Avatar id={m.id} name={displayName(m)} size="sm" />
                    {displayName(m)}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-fg-4">It appears on their calendars, and they get a notification.</p>
          </div>
        )}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-fg-2">Who sees it</legend>
          <div className="flex gap-1 rounded-md bg-hover p-0.5">
            {VISIBILITY.map((v) => (
              <button
                key={v.value}
                type="button"
                aria-pressed={visibility === v.value}
                onClick={() => setVisibility(v.value)}
                className={cn("pressable h-7 flex-1 rounded-[5px] text-xs font-medium", visibility === v.value ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg")}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-3">
            {VISIBILITY.find((v) => v.value === visibility)?.hint}
            {kind === "meeting" && visibility !== "public" && " People in the meeting always see it."}
          </p>
        </fieldset>

        {kind === "block" && (
          <label className="flex items-center justify-between gap-3 text-sm text-fg-2">
            <span>
              Tick it off automatically
              <span className="block text-xs text-fg-3">When its time has passed, it counts as done.</span>
            </span>
            <Switch checked={auto} onCheckedChange={setAuto} />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Notes <span className="font-normal text-fg-4">(optional)</span></span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Agenda, a link, anything useful"
            className="w-full resize-none rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-brand" />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-3">
        {event && (
          <Button variant="destructive" onClick={() => { remove.mutate(event.id); onClose() }}>
            Delete
          </Button>
        )}
        {event && event.owner_id === me.id && (
          <SaveEventTemplate
            entry={{ kind, title: title.trim(), notes: notes.trim() || null, start, end, visibility, auto, attendees: [me.id, ...attendees] }}
          />
        )}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={create.isPending || update.isPending}>{event ? "Save" : kind === "meeting" ? "Send invites" : "Add to calendar"}</Button>
      </div>
    </>
  )
}

/**
 * Save what's in the form as a template: what it is, its time of day, who sees
 * it, and a meeting's people. Saving under the name of a template you can
 * change replaces it.
 */
function SaveEventTemplate({
  entry,
}: {
  entry: { kind: "block" | "meeting"; title: string; notes: string | null; start: number; end: number; visibility: string; auto: boolean; attendees: string[] }
}) {
  const me = useMe()
  const { data: templates = [] } = useEventTemplates()
  const { saveEvent } = useTemplateActions()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(entry.title)
  const [sharedChoice, setShared] = useState<boolean | null>(null)
  const same = sortTemplates(templates, me.id).find(
    (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase() && canEditTemplate(t, me),
  )
  const othersShared = Boolean(same && same.created_by !== me.id)
  const shared = sharedChoice ?? same?.shared ?? false

  const save = async () => {
    const clean = name.trim()
    if (!clean) return toast.error("Give the template a name.")
    if (!entry.title) return toast.error("Give the entry a title first.")
    if (entry.end <= entry.start) return toast.error("It has to end after it starts.")
    try {
      await saveEvent.mutateAsync({
        id: same?.id,
        input: {
          name: clean,
          shared: othersShared ? same!.shared : shared,
          kind: entry.kind,
          title: entry.title,
          notes: entry.notes,
          start_minute: entry.start,
          end_minute: entry.end,
          visibility: entry.visibility,
          auto_complete: entry.kind === "block" && entry.auto,
          attendee_ids: entry.kind === "meeting" ? entry.attendees : [],
        },
      })
      toast(same ? `Updated the template "${clean}"` : `Saved "${clean}" as a template`, {
        description: "Next time, use the arrow beside Plan time, or Templates when you drag out time.",
      })
      setOpen(false)
    } catch {
      // The mutation shows the reason.
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(entry.title)
          setShared(null)
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger className="pressable inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-fg-2 hover:bg-hover hover:text-fg data-popup-open:bg-hover">
        <Icon icon={LayoutTemplateIcon} size={14} className="text-fg-3" />
        Save as template
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 gap-3 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">Template name</span>
            <input autoFocus value={name} maxLength={120} onFocus={(e) => e.target.select()} onChange={(e) => setName(e.target.value)} className={input} />
            {same && <span className="text-xs text-fg-3">Replaces {othersShared ? "the team's" : "your"} template with this name.</span>}
          </label>
          {!othersShared && (
            <label className="flex items-center justify-between gap-3 text-sm text-fg-2">
              <span>
                Share with the team
                <span className="block text-xs text-fg-3">Everyone can use it; only you, or an admin, can change it.</span>
              </span>
              <Switch checked={shared} onCheckedChange={setShared} />
            </label>
          )}
          <p className="text-xs leading-5 text-fg-3">
            Keeps the title, {formatMinute(entry.start)} to {formatMinute(entry.end)}, who sees it
            {entry.kind === "meeting" ? ", who's invited" : entry.auto ? ", ticking itself off" : ""}
            {entry.notes ? " and the notes" : ""}. Not the day or a linked task.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saveEvent.isPending}>
              {saveEvent.isPending ? "Saving…" : same ? "Replace template" : "Save template"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
