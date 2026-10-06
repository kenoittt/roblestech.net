"use client"

import { useId, useMemo, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Add01Icon, Cancel01Icon, LayoutTemplateIcon, Task01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { addDays, diffDays, isoDay, manilaInstant, minutesOfDay } from "@/lib/dates"
import { getSupabase } from "@/lib/supabase/client"
import { useMe, useMembers, useTasks } from "@/domains/workspace/provider"
import { PeoplePicker } from "@/domains/people/components/people-picker"
import { isOpen, taskKey } from "@/domains/tasks/config"
import { useCreateTask } from "@/domains/tasks/data"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { PickerMenu, chipClass, type PickerOption } from "@/domains/tasks/components/pickers"
import { StatusIcon } from "@/domains/tasks/components/glyphs"
import { TEMPLATES_MISSING, canEditTemplate, isMissingTable, sortTemplates, useEventTemplates, useTemplateActions, type EventTemplate } from "@/domains/templates/data"
import { EventTemplatePicker } from "@/domains/templates/components/template-pickers"
import { BLOCK_COLORS, useCalendarActions, type BlockColor, type CalEvent } from "../data"
import { DAY_END, durationLabel, formatMinute } from "../layout"

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
  /** Save a template instead of an entry (New template in the Plan time menu). */
  asTemplate?: boolean
  /** Change this template (Settings, Edit). */
  editTemplate?: EventTemplate
}

const VISIBILITY = [
  { value: "public", label: "Public", hint: "The team sees the title and the time." },
  { value: "busy", label: "Busy", hint: "The team sees that you're busy, not what it is." },
  { value: "private", label: "Private", hint: "Only you see it." },
] as const

// Every quarter hour of the day. An entry may end at midnight or later.
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => i * 15)
const steps = (from: number, to: number) => Array.from({ length: Math.max(0, Math.floor((to - from) / 15) + 1) }, (_, i) => from + i * 15)
const timeLabel = (t: number) => (t === DAY_END ? "Midnight" : formatMinute(t))

/**
 * Where an entry ends, kept as a day and minutes after that day's midnight.
 * Midnight itself stays on the day it closes (1440), so "until midnight"
 * doesn't read as the next day.
 */
function endOf(day: string, minutes: number) {
  const days = Math.floor(minutes / DAY_END)
  const rest = minutes % DAY_END
  return rest === 0 && days > 0 ? { endDay: addDays(day, days - 1), end: DAY_END } : { endDay: addDays(day, days), end: rest }
}

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
          {open && (
            <Form
              key={event?.id ?? `${draft?.day}-${draft?.start}-${draft?.taskId}-${draft?.template?.id}-${draft?.editTemplate?.id}-${draft?.asTemplate}`}
              draft={draft}
              event={event}
              onClose={onClose}
            />
          )}
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
  const createTask = useCreateTask()
  const { open: openTask } = useTaskPanel()

  const linked = tasks.find((t) => t.id === (event?.task_id ?? draft?.taskId))
  const editing = draft?.editTemplate ?? null
  const preset = draft?.template ?? editing ?? undefined
  // A meeting's people, less whoever owns it and anyone who has left. A
  // template's owner is whoever saved it; a meeting's is whoever plans it.
  const owner = editing?.created_by ?? me.id
  const invitees = (ids: string[]) => ids.filter((id) => id !== owner && members.some((m) => m.id === id && !m.deactivated_at))
  const [kind, setKind] = useState<"block" | "meeting">(event?.kind ?? (preset?.kind as "block" | "meeting" | undefined) ?? draft?.kind ?? "block")
  const [title, setTitle] = useState(event?.title ?? preset?.title ?? linked?.title ?? "")
  const [taskId, setTaskId] = useState<string | null>(event?.task_id ?? draft?.taskId ?? null)
  // A task named here that doesn't exist yet: it's made, for you, when the entry is saved.
  const [newTask, setNewTask] = useState<string | null>(null)
  const [day, setDay] = useState(event ? isoDay(event.starts_at) : draft!.day)
  const [start, setStart] = useState(event ? minutesOfDay(event.starts_at) : draft!.start)
  // The end can be on a later day: a block from 9 PM to 1 AM, or over several days.
  const [{ endDay, end }, setEndAt] = useState(() =>
    event ? endOf(day, diffDays(isoDay(event.ends_at), day) * DAY_END + minutesOfDay(event.ends_at)) : endOf(draft!.day, draft!.end),
  )
  /** Minutes from the start to the end. */
  const span = diffDays(endDay, day) * DAY_END + end - start
  const setEnd = (minutes: number) => setEndAt(endOf(day, minutes))
  const [visibility, setVisibility] = useState<CalEvent["visibility"]>(event?.visibility ?? (preset?.visibility as CalEvent["visibility"] | undefined) ?? "public")
  const [auto, setAuto] = useState(event?.auto_complete ?? preset?.auto_complete ?? false)
  const [notes, setNotes] = useState(event?.notes ?? preset?.notes ?? "")
  const [color, setColor] = useState<BlockColor | null>((event?.color ?? (preset?.color as BlockColor | null | undefined)) ?? null)
  const titleId = useId()
  const [attendees, setAttendees] = useState<string[]>(event ? event.attendee_ids.filter((a) => a !== me.id) : invitees(preset?.attendee_ids ?? []))
  const [templateId, setTemplateId] = useState<string | null>(draft?.template?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  // Saving a template instead of an entry: its name and who may use it.
  const [asTemplate, setAsTemplate] = useState(Boolean(draft?.asTemplate || editing))
  const [name, setName] = useState(editing?.name ?? "")
  const [shared, setShared] = useState(editing?.shared ?? false)
  const { data: templates = [], error: templatesError } = useEventTemplates()
  const { saveEvent } = useTemplateActions()
  const missing = isMissingTable(templatesError)
  const templateName = (name.trim() || title.trim()).slice(0, 120)
  // Saving under the name of a template you can change replaces it.
  const same = editing
    ? null
    : sortTemplates(templates, me.id).find((t) => templateName && t.name.trim().toLowerCase() === templateName.toLowerCase() && canEditTemplate(t, me))
  const target = editing ?? same ?? null
  const othersShared = Boolean(target && target.created_by !== me.id)

  // A template fills in what the entry is. A time dragged out on the calendar
  // stays; otherwise the template's time of day is used, on the chosen day.
  const applyTemplate = (t: EventTemplate | null) => {
    setTemplateId(t?.id ?? null)
    setKind((t?.kind as "block" | "meeting" | undefined) ?? draft?.kind ?? "block")
    setTitle(t?.title ?? linked?.title ?? "")
    setNotes(t?.notes ?? "")
    setColor((t?.color as BlockColor | null | undefined) ?? null)
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

  const switchToTemplate = (on: boolean) => {
    setAsTemplate(on)
    setError(null)
    // A template keeps one day's time: an entry that ran past midnight stops there.
    if (on && endDay !== day) setEndAt(endOf(day, Math.min(start + span, DAY_END)))
  }

  const saveTemplate = async () => {
    try {
      const saved = await saveEvent.mutateAsync({
        id: target?.id,
        input: {
          name: templateName,
          shared: othersShared ? target!.shared : shared,
          kind,
          title: title.trim(),
          notes: notes.trim() || null,
          start_minute: start,
          end_minute: start + span,
          visibility,
          auto_complete: kind === "block" && auto,
          // Sent only when there's a colour to keep, so templates work on a database without colours.
          ...(kind === "block" && (color || editing?.color) ? { color: color ?? null } : {}),
          attendee_ids: kind === "meeting" ? [...new Set([owner, ...attendees])] : [],
        },
      })
      toast(target ? `Updated the template "${saved.name}"` : `Saved "${saved.name}" as a template`, {
        description: "Use it from the arrow beside Plan time, or Templates when you drag out time.",
      })
      onClose()
    } catch {
      // The mutation shows the reason.
    }
  }

  const save = async () => {
    setError(null)
    if (!title.trim()) return setError("Give it a title.")
    if (span <= 0) return setError("It has to end after it starts.")
    if (asTemplate) {
      if (start + span > DAY_END) return setError("A template keeps one day: make it end by midnight.")
      return saveTemplate()
    }
    const row = {
      kind,
      title: title.trim(),
      notes: notes.trim() || null,
      starts_at: manilaInstant(day, start),
      ends_at: manilaInstant(endDay, end),
      task_id: taskId,
      visibility,
      auto_complete: auto,
      // Sent only when it's set or changed, so blocks save on a database without colours.
      ...(kind === "block" && color !== (event?.color ?? null) ? { color } : {}),
    }
    try {
      if (newTask) {
        const made = await createTask.mutateAsync({ title: newTask, assignee_id: me.id, status: "todo" })
        row.task_id = made.id
        toast(`Created ${taskKey(made)}, with time for it`, {
          description: made.title,
          action: { label: "Open", onClick: () => openTask(made.number) },
        })
      }
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
          {editing ? "Edit template" : asTemplate ? "New template" : event ? (kind === "meeting" ? "Edit meeting" : "Edit block") : "Plan time"}
        </DialogPrimitive.Title>
        <div className="flex items-center gap-1">
          {!event && !asTemplate && (
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
        {asTemplate && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">Template name {same && <span className="font-normal text-fg-3">· replaces {same.created_by === me.id ? "your" : "the team's"} template</span>}</span>
            <input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              // Left empty, the template takes the title as its name.
              placeholder={title.trim() || "Outreach block, Monday stand-up…"}
              className={input}
            />
          </label>
        )}
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={titleId} className="text-xs font-medium text-fg-2">Title</label>
            {kind === "block" && <ColourChoice value={color} onChange={setColor} />}
          </div>
          <input id={titleId} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "meeting" ? "What's the meeting about?" : "What will you work on?"} className={input} />
        </div>

        {!asTemplate && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">For a task <span className="font-normal text-fg-4">(optional)</span></span>
          <PickerMenu
            triggerLabel="Link a task"
            triggerClassName="pressable flex h-9 w-full items-center gap-2 rounded-md border border-line-strong px-3 text-left text-sm text-fg hover:bg-hover"
            trigger={
              newTask ? (
                <>
                  <Icon icon={Add01Icon} size={14} className="shrink-0 text-fg-3" />
                  <span className="min-w-0 flex-1 truncate">{newTask}</span>
                  <span className="shrink-0 text-xs text-fg-3">New task, for you</span>
                </>
              ) : linkedTask ? (
                <>
                  <StatusIcon status={linkedTask.status} />
                  <span className="truncate">{linkedTask.title}</span>
                </>
              ) : (
                <span className="text-fg-3">No task</span>
              )
            }
            options={taskOptions}
            value={newTask ? null : (taskId ?? "none")}
            placeholder="Find one of your tasks, or name a new one…"
            width="w-[420px]"
            onSelect={(v) => {
              const id = v === "none" ? null : v
              setNewTask(null)
              setTaskId(id)
              const t = tasks.find((x) => x.id === id)
              if (t && !title.trim()) setTitle(t.title)
            }}
            onCreate={(name) => {
              setNewTask(name)
              setTaskId(null)
              if (!title.trim()) setTitle(name)
            }}
            createLabel={(name) => (
              <>
                New task <span className="text-fg">“{name}”</span>
              </>
            )}
          />
        </div>
        )}

        <div className="flex flex-col gap-2">
          {/* A template keeps a time of day; the day is chosen when it's used. */}
          <div className={cn("grid gap-2", asTemplate ? "grid-cols-2" : "grid-cols-[1.3fr_1fr_1fr]")}>
            {!asTemplate && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-2">Day</span>
              <input
                type="date"
                value={day}
                onChange={(e) => {
                  const next = e.target.value
                  if (!next) return
                  // Moving the day moves the end with it: the entry keeps its length.
                  setEndAt(endOf(next, start + span))
                  setDay(next)
                }}
                className={input}
              />
            </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-2">From</span>
              <select
                value={start}
                onChange={(e) => {
                  const s = Number(e.target.value)
                  setEnd(s + span)
                  setStart(s)
                }}
                className={input}
              >
                {TIMES.map((t) => <option key={t} value={t}>{formatMinute(t)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-2">To <span className="font-normal text-fg-4">{span > 0 ? durationLabel(span) : ""}</span></span>
              {endDay === day ? (
                // Later today, or on into the night: past midnight is one choice away.
                <select value={end} onChange={(e) => setEnd(Number(e.target.value))} className={input}>
                  {steps(start + 15, DAY_END).map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
                  {!asTemplate &&
                    steps(DAY_END + 15, start + DAY_END).map((t) => (
                      <option key={t} value={t}>{formatMinute(t - DAY_END)} · next day</option>
                    ))}
                </select>
              ) : (
                <select value={end} onChange={(e) => setEndAt({ endDay, end: Number(e.target.value) })} className={input}>
                  {steps(0, DAY_END).map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
                </select>
              )}
            </label>
          </div>
          {endDay !== day && !asTemplate && (
            <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Ends on</span>
                <input
                  type="date"
                  value={endDay}
                  min={day}
                  onChange={(e) => {
                    const next = e.target.value
                    if (!next || next < day) return
                    // Back to the same day: keep an end that comes after the start.
                    setEndAt(next === day && end <= start ? endOf(day, Math.min(start + 60, DAY_END)) : { endDay: next, end })
                  }}
                  className={input}
                />
              </label>
            </div>
          )}
        </div>

        {kind === "meeting" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">Who's invited</span>
            <PeoplePicker
              label="Who's invited"
              placeholder="Invite people…"
              value={attendees}
              onChange={setAttendees}
              exclude={[owner]}
            />
            <p className="text-xs text-fg-4">
              {asTemplate ? "They're invited each time the template is used, once you've had a look." : "It appears on their calendars, and they get a notification."}
            </p>
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

        {asTemplate && !othersShared && (
          <label className="flex items-center justify-between gap-3 text-sm text-fg-2">
            <span>
              Share with the team
              <span className="block text-xs text-fg-3">Everyone can use it; only you, or an admin, can change it.</span>
            </span>
            <Switch checked={shared} onCheckedChange={setShared} />
          </label>
        )}
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
            entry={{ kind, title: title.trim(), notes: notes.trim() || null, start, end: start + span, visibility, auto, attendees: [me.id, ...attendees], color }}
          />
        )}
        {!event && !editing && (
          <label className={cn("flex items-center gap-2 text-xs text-fg-3", missing && "opacity-60")} title={missing ? TEMPLATES_MISSING : "Saves a template for next time, and adds nothing to the calendar"}>
            <Switch checked={asTemplate} onCheckedChange={switchToTemplate} disabled={missing} />
            Save as template
          </label>
        )}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={create.isPending || update.isPending || saveEvent.isPending}>
          {asTemplate
            ? saveEvent.isPending
              ? "Saving…"
              : same
                ? "Replace template"
                : "Save template"
            : event
              ? "Save"
              : kind === "meeting"
                ? "Send invites"
                : "Add to calendar"}
        </Button>
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
  entry: { kind: "block" | "meeting"; title: string; notes: string | null; start: number; end: number; visibility: string; auto: boolean; attendees: string[]; color: BlockColor | null }
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
    if (entry.end > DAY_END) return toast.error("A template keeps one day", { description: "Make it end by midnight, then save it as a template." })
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
          ...(entry.kind === "block" && entry.color ? { color: entry.color } : {}),
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

/** A block's colour: five swatches, the usual blue first. */
function ColourChoice({ value, onChange }: { value: BlockColor | null; onChange: (color: BlockColor | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex items-center gap-1.5">
      {BLOCK_COLORS.map((c) => (
        <button
          key={c.label}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.value ? c.label : `${c.label}, the usual`}
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            "size-3.5 rounded-full ring-offset-2 ring-offset-raised transition-shadow",
            c.swatch,
            value === c.value ? "ring-2 ring-fg-2" : "hover:ring-2 hover:ring-line-strong",
          )}
        />
      ))}
    </div>
  )
}
