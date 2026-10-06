"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import {
  Calendar03Icon,
  Cancel01Icon,
  LayoutTemplateIcon,
  LockKeyIcon,
  RepeatIcon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { Kbd } from "@/components/app/page"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { diffDays, dueLabel } from "@/lib/dates"
import { useMe, useMemberMap, useProjectMap, useToday } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import {
  DUE_CHOICES,
  STARTING_STATUSES,
  TEMPLATES_MISSING,
  canEditTemplate,
  dueInLabel,
  isMissingTable,
  sortTemplates,
  taskFromTemplate,
  useTaskTemplates,
  useTemplateActions,
  type AssignMode,
  type TaskTemplate,
} from "@/domains/templates/data"
import { TaskTemplatePicker } from "@/domains/templates/components/template-pickers"
import { REPEAT_META, taskKey, type Repeat } from "../config"
import { useCreateTask, type NewTask } from "../data"
import { useTaskPanel } from "../panel-state"
import { ProjectSwatch } from "./glyphs"
import {
  DueDatePicker,
  PickerMenu,
  PolicyChip,
  PriorityChip,
  StatusChip,
  chipClass,
  policyOptions,
  priorityOptions,
  repeatOptions,
  statusOptions,
  usePeopleOptions,
  useProjectOptions,
  type PickerOption,
} from "./pickers"

type Draft = Required<Pick<NewTask, "status" | "priority" | "completion_policy" | "completion_approvers">> &
  Pick<NewTask, "assignee_id" | "project_id" | "due_date" | "reviewer_id" | "repeat"> & { is_private: boolean }

const EMPTY: Draft = {
  status: "todo",
  priority: "none",
  completion_policy: "anyone",
  completion_approvers: [],
  assignee_id: null,
  project_id: null,
  due_date: null,
  reviewer_id: null,
  repeat: null,
  is_private: false,
}

/**
 * New task: a title, then whichever properties matter. Cmd+Enter creates.
 * With "Save as template" on, the same dialog saves a template instead, so a
 * routine is set up where tasks are made, with nothing made yet. It also
 * changes an existing template (Settings, Edit).
 */
export function CreateTaskDialog() {
  const { createTask, openCreateTask, closeCreateTask } = useUI()
  const { open: openTask } = useTaskPanel()
  const create = useCreateTask()
  const { saveTask } = useTemplateActions()
  const me = useMe()
  const members = useMemberMap()
  const projects = useProjectMap()
  const today = useToday()
  const { data: templates, error: templatesError } = useTaskTemplates()
  const missing = isMissingTable(templatesError)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [more, setMore] = useState(false)
  // A template's checklist: added once the task exists, or saved with a template.
  const [checklist, setChecklist] = useState<string[]>([])
  const [step, setStep] = useState("")
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null)
  // Saving a template instead of a task, and what only a template has.
  const [asTemplate, setAsTemplate] = useState(false)
  const [editing, setEditing] = useState<TaskTemplate | null>(null)
  const [name, setName] = useState("")
  const [shared, setShared] = useState(false)
  const [assign, setAssign] = useState<AssignMode>("user")
  const [dueIn, setDueIn] = useState<number | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // A template fills in what the task is. What its opener already chose (the
  // project page it's on, the board column, the day on the calendar, "for me")
  // still wins: that's where the task is being made.
  const applyTemplate = (t: TaskTemplate | null) => {
    setTemplateId(t?.id ?? null)
    const defaults = createTask.defaults as Partial<Draft>
    if (!t) {
      setDraft({ ...EMPTY, ...defaults })
      setTitle(createTask.defaults.title ?? "")
      setDescription("")
      setChecklist([])
      return
    }
    const made = taskFromTemplate(t, { uid: me.id, today, members, projects })
    setDraft({ ...EMPTY, ...(made.draft as Partial<Draft>), ...defaults })
    setTitle(made.draft.title)
    setDescription(made.draft.description ?? "")
    setChecklist(made.checklist)
  }

  // Each time the dialog opens, start from the defaults its opener passed.
  const [openedWith, setOpenedWith] = useState<typeof createTask.defaults | null>(null)
  if (createTask.open && openedWith !== createTask.defaults) {
    const start = createTask.asTemplate
    setOpenedWith(createTask.defaults)
    setDraft({ ...EMPTY, ...(createTask.defaults as Partial<Draft>) })
    setTitle(createTask.defaults.title ?? "")
    setDescription(createTask.defaults.description ?? "")
    setChecklist(start?.checklist ?? [])
    setStep("")
    setTemplateId(null)
    setPendingTemplate(createTask.templateId ?? null)
    setAsTemplate(Boolean(start))
    setEditing(start?.edit ?? null)
    setName(start?.edit?.name ?? "")
    setShared(start?.edit?.shared ?? false)
    setAssign(start?.assign ?? "user")
    setDueIn(start?.dueInDays ?? null)
  }
  if (!createTask.open && openedWith !== null) setOpenedWith(null)
  // Opened from a template (the command menu): apply it once the list is here.
  if (pendingTemplate && templates) {
    setPendingTemplate(null)
    const t = templates.find((x) => x.id === pendingTemplate)
    if (t) applyTemplate(t)
  }

  const statusOpts = useMemo(() => statusOptions(), [])
  const startingOpts = useMemo(() => statusOptions().filter((o) => STARTING_STATUSES.includes(o.value)), [])
  const priorityOpts = useMemo(() => priorityOptions(), [])
  const people = usePeopleOptions({ projectId: draft.project_id })
  const reviewers = usePeopleOptions({ projectId: draft.project_id, noneLabel: "No reviewer" })
  const approvers = usePeopleOptions({ projectId: draft.project_id, includeNone: false })
  const projectOpts = useProjectOptions()
  const policyOpts = useMemo(() => policyOptions(), [])
  const repeatOpts = useMemo(() => repeatOptions(), [])
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  // A template's assignee: whoever uses it, a set person, or nobody yet.
  const assignOpts: PickerOption[] = useMemo(
    () => [
      { value: "user", label: "Whoever uses it", icon: <Icon icon={UserGroupIcon} size={14} className="text-fg-3" />, hint: "The person who uses the template gets the task" },
      ...people.filter((o) => o.value !== "none"),
      { value: "none", label: "Nobody yet", icon: <Icon icon={UserIcon} size={14} className="text-fg-3" /> },
    ],
    [people],
  )
  const dueChoices: (number | null)[] = (DUE_CHOICES as readonly (number | null)[]).includes(dueIn) ? [...DUE_CHOICES] : [...DUE_CHOICES, dueIn]
  const dueInOpts: PickerOption[] = dueChoices.map((d) => ({ value: d === null ? "none" : String(d), label: dueInLabel(d) }))

  // A step still being typed counts too, so Cmd+Enter never drops it.
  const steps = [...checklist, step].map((c) => c.trim().slice(0, 500)).filter(Boolean).slice(0, 100)
  const templateName = (name.trim() || title.trim()).slice(0, 120)
  // Saving under the name of a template you can change replaces it, as before.
  const same = editing
    ? null
    : sortTemplates(templates ?? [], me.id).find(
        (t) => templateName && t.name.trim().toLowerCase() === templateName.toLowerCase() && canEditTemplate(t, me),
      )
  const target = editing ?? same ?? null
  // An admin may change a shared template of someone else's, but not who sees it.
  const othersShared = Boolean(target && target.created_by !== me.id)

  const switchToTemplate = (on: boolean) => {
    setAsTemplate(on)
    if (!on) return
    // What the task says now becomes what the template keeps.
    setAssign(!draft.assignee_id || draft.assignee_id === me.id ? "user" : "person")
    setDueIn(draft.due_date ? Math.min(365, Math.max(0, diffDays(draft.due_date, today))) : null)
    if (!STARTING_STATUSES.includes(draft.status)) set({ status: "todo" })
    const applied = templates?.find((t) => t.id === templateId)
    if (applied && !name) setName(applied.name)
  }

  const addStep = () => {
    const clean = step.trim()
    if (!clean) return
    setChecklist((c) => [...c, clean].slice(0, 100))
    setStep("")
  }

  const saveTemplate = async (clean: string) => {
    try {
      const saved = await saveTask.mutateAsync({
        id: target?.id,
        input: {
          name: templateName,
          shared: othersShared ? target!.shared : shared,
          title: clean,
          description: description.trim() || null,
          status: STARTING_STATUSES.includes(draft.status) ? draft.status : "todo",
          priority: draft.priority,
          project_id: draft.project_id ?? null,
          assignee_id: assign === "person" ? (draft.assignee_id ?? null) : null,
          assign_to_user: assign === "user",
          reviewer_id: draft.reviewer_id ?? null,
          completion_policy: draft.completion_policy,
          completion_approvers: draft.completion_policy === "specific" ? draft.completion_approvers : [],
          is_private: draft.is_private,
          due_in_days: dueIn,
          checklist: steps,
        },
      })
      toast(target ? `Updated the template "${saved.name}"` : `Saved "${saved.name}" as a template`, {
        description: "Use it from Templates when you press C, or from ⌘K.",
        action: { label: "Use it", onClick: () => openCreateTask({}, { templateId: saved.id }) },
      })
      closeCreateTask()
    } catch {
      // The mutation shows the reason.
    }
  }

  const submit = async () => {
    const clean = title.trim()
    if (!clean) {
      titleRef.current?.focus()
      return
    }
    // "Chosen people" with nobody chosen would leave a task only admins could finish.
    if (draft.completion_policy === "specific" && !draft.completion_approvers.length) {
      toast.error("Choose who can sign it off", { description: "Pick at least one person, or change who can mark it done." })
      return
    }
    if (asTemplate) return saveTemplate(clean)
    try {
      const task = await create.mutateAsync({
        ...draft,
        // Only "Chosen people" uses the list; any other rule starts with it empty.
        completion_approvers: draft.completion_policy === "specific" ? draft.completion_approvers : [],
        title: clean,
        description: description.trim() || null,
        checklist: steps,
      })
      toast(`Created ${taskKey(task)}`, {
        description: task.title,
        action: { label: "Open", onClick: () => openTask(task.number) },
      })
      if (more) {
        // Another one like it: from a template, the next starts from the template again.
        const applied = templates?.find((t) => t.id === templateId)
        setStep("")
        if (applied) applyTemplate(applied)
        else {
          setTitle("")
          setDescription("")
          setChecklist([])
        }
        titleRef.current?.focus()
      } else {
        closeCreateTask()
      }
    } catch {
      // The error toast comes from the mutation.
    }
  }

  useEffect(() => {
    if (createTask.open) requestAnimationFrame(() => titleRef.current?.focus())
  }, [createTask.open])

  const project = draft.project_id ? projects.get(draft.project_id) : null
  const assignee = draft.assignee_id ? members.get(draft.assignee_id) : null
  const reviewer = draft.reviewer_id ? members.get(draft.reviewer_id) : null
  const heading = editing ? "Edit template" : asTemplate ? "New template" : "New task"

  return (
    <DialogPrimitive.Root open={createTask.open} onOpenChange={(o) => !o && closeCreateTask()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup
          className="ui-dialog fixed top-[12vh] left-1/2 z-50 flex max-h-[80vh] w-[min(660px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-xl bg-raised shadow-popover outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-3.5">
            <PickerMenu
              triggerLabel="Project"
              triggerClassName={chipClass}
              trigger={project ? <><ProjectSwatch color={project.color} size={8} /><span className="truncate">{project.name}</span></> : "No project"}
              options={projectOpts}
              value={draft.project_id ?? "none"}
              placeholder="Choose a project…"
              onSelect={(v) => set({ project_id: v === "none" ? null : v })}
            />
            <span className="text-xs text-fg-4">›</span>
            <DialogPrimitive.Title className="text-xs font-medium text-fg-2">{heading}</DialogPrimitive.Title>
            <span className="ml-auto" />
            {!asTemplate && (
              <TaskTemplatePicker
                value={templateId}
                onSelect={applyTemplate}
                triggerClassName={cn(chipClass, templateId && "border-brand/50 text-fg")}
              />
            )}
            <DialogPrimitive.Close
              aria-label="Close"
              className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
            >
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 overflow-y-auto">
            {asTemplate && (
              <div className="flex items-center gap-2 px-4 pt-3">
                <Icon icon={LayoutTemplateIcon} size={14} className="shrink-0 text-fg-3" />
                <input
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                  // Left empty, the template takes the task's title as its name.
                  placeholder={title.trim() || "Template name"}
                  aria-label="Template name"
                  className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-sm font-medium text-fg outline-none placeholder:text-fg-4 hover:bg-hover focus:bg-hover"
                />
                {same && <span className="shrink-0 text-xs text-fg-3">Replaces {same.created_by === me.id ? "your" : "the team's"} template</span>}
              </div>
            )}

            <div className="px-5 pt-3 pb-2">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                aria-label="Task title"
                className="w-full bg-transparent text-lg font-medium tracking-[-0.01em] text-fg outline-none placeholder:text-fg-4"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description…"
                aria-label="Description"
                rows={3}
                className="mt-1.5 w-full resize-none bg-transparent text-sm leading-6 text-fg-2 outline-none placeholder:text-fg-4"
              />
              {(checklist.length > 0 || asTemplate) && (
                <div className="mt-1 mb-1">
                  <p className="text-xs font-medium text-fg-3">
                    Checklist {checklist.length > 0 && <span className="tabular text-fg-4">{checklist.length}</span>}
                  </p>
                  <ul className="mt-1 flex max-h-40 flex-col overflow-y-auto">
                    {checklist.map((item, i) => (
                      <li key={`${i}-${item}`} className="group/item -mx-1.5 flex h-7 items-center gap-2 rounded-md px-1.5 text-sm text-fg-2 hover:bg-hover">
                        <span aria-hidden className="size-3.5 shrink-0 rounded-[4px] border border-line-strong" />
                        <span className="min-w-0 flex-1 truncate">{item}</span>
                        <button
                          type="button"
                          aria-label={`Leave out "${item}"`}
                          onClick={() => setChecklist((c) => c.filter((_, j) => j !== i))}
                          className="text-fg-4 opacity-0 group-hover/item:opacity-100 hover:text-fg focus-visible:opacity-100"
                        >
                          <Icon icon={Cancel01Icon} size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="-mx-1.5 flex h-7 items-center gap-2 px-1.5">
                    <span aria-hidden className="size-3.5 shrink-0 rounded-[4px] border border-dashed border-line-strong" />
                    <input
                      value={step}
                      onChange={(e) => setStep(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter adds the step; Cmd+Enter still saves the whole thing.
                        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault()
                          addStep()
                        }
                      }}
                      onBlur={addStep}
                      placeholder="Add a step…"
                      aria-label="Add a checklist step"
                      className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5">
            <PickerMenu triggerLabel="Status" triggerClassName={chipClass} trigger={<StatusChip value={draft.status} />}
              options={asTemplate ? startingOpts : statusOpts} value={draft.status} placeholder="Status…" onSelect={(status) => set({ status })} />
            <PickerMenu triggerLabel="Priority" triggerClassName={chipClass} trigger={<PriorityChip value={draft.priority} />}
              options={priorityOpts} value={draft.priority} placeholder="Priority…" onSelect={(priority) => set({ priority })} />
            {asTemplate ? (
              <PickerMenu
                triggerLabel="Assignee"
                triggerClassName={chipClass}
                trigger={
                  assign === "person" && assignee ? (
                    <><Avatar id={assignee.id} name={displayName(assignee)} size="xs" /><span className="truncate">{displayName(assignee)}</span></>
                  ) : assign === "user" ? (
                    <><Icon icon={UserGroupIcon} size={13} />Whoever uses it</>
                  ) : (
                    <><Icon icon={UserIcon} size={13} />Nobody yet</>
                  )
                }
                options={assignOpts}
                value={assign === "user" ? "user" : assign === "person" ? (draft.assignee_id ?? "none") : "none"}
                placeholder="Who gets the task…"
                width="w-80"
                onSelect={(v) => {
                  if (v === "user") setAssign("user")
                  else if (v === "none") setAssign("nobody")
                  else {
                    setAssign("person")
                    set({ assignee_id: v })
                  }
                }}
              />
            ) : (
              <PickerMenu
                triggerLabel="Assignee"
                triggerClassName={chipClass}
                trigger={assignee ? <><Avatar id={assignee.id} name={displayName(assignee)} size="xs" /><span className="truncate">{displayName(assignee)}</span></> : <><Icon icon={UserIcon} size={13} />Assignee</>}
                options={people}
                value={draft.assignee_id ?? "none"}
                placeholder="Assign to…"
                width="w-80"
                onSelect={(v) => set({ assignee_id: v === "none" ? null : v })}
              />
            )}
            {asTemplate ? (
              // A template's due date is relative: the day it's used, or days after.
              <PickerMenu
                triggerLabel="Due date"
                triggerClassName={chipClass}
                trigger={<><Icon icon={Calendar03Icon} size={13} />{dueIn === null ? "Due date" : dueInLabel(dueIn)}</>}
                options={dueInOpts}
                value={dueIn === null ? "none" : String(dueIn)}
                placeholder="Due…"
                width="w-60"
                onSelect={(v) => setDueIn(v === "none" ? null : Number(v))}
              />
            ) : (
              <DueDatePicker
                value={draft.due_date ?? null}
                onChange={(due_date) => set({ due_date })}
                triggerClassName={chipClass}
                trigger={draft.due_date ? dueLabel(draft.due_date, today) : "Due date"}
              />
            )}
            {!asTemplate && (draft.due_date || draft.repeat) && (
              <PickerMenu
                triggerLabel="Repeat"
                triggerClassName={cn(chipClass, draft.repeat && "border-brand/50 text-fg")}
                trigger={
                  draft.repeat ? (
                    <>
                      <Icon icon={RepeatIcon} size={13} />
                      {REPEAT_META[draft.repeat as Repeat]?.label}
                    </>
                  ) : (
                    "Repeat"
                  )
                }
                options={repeatOpts}
                value={draft.repeat ?? "none"}
                placeholder="Repeat…"
                onSelect={(v) => set({ repeat: v === "none" ? null : v })}
              />
            )}
            <PickerMenu triggerLabel="Who can mark it done" triggerClassName={chipClass} trigger={<PolicyChip value={draft.completion_policy} />}
              options={policyOpts} value={draft.completion_policy} placeholder="Who can mark it done?" width="w-80"
              onSelect={(completion_policy) => set({ completion_policy })} />
            {draft.completion_policy === "specific" && (
              <PickerMenu
                triggerLabel="People who can sign it off"
                triggerClassName={cn(chipClass, !draft.completion_approvers.length && "border-warning/60 text-fg")}
                multiple
                trigger={
                  draft.completion_approvers.length
                    ? <span className="truncate">Signed off by {draft.completion_approvers.map((id) => displayName(members.get(id))).join(", ")}</span>
                    : "Choose who signs off"
                }
                options={approvers}
                value={draft.completion_approvers}
                placeholder="Who can sign it off?"
                width="w-80"
                onSelect={(v) =>
                  set({
                    completion_approvers: draft.completion_approvers.includes(v)
                      ? draft.completion_approvers.filter((id) => id !== v)
                      : [...draft.completion_approvers, v],
                  })
                }
              />
            )}
            {(draft.completion_policy === "reviewer" || draft.reviewer_id) && (
              <PickerMenu
                triggerLabel="Reviewer"
                triggerClassName={chipClass}
                trigger={reviewer ? <>Reviewer: {displayName(reviewer)}</> : "Choose reviewer"}
                options={reviewers}
                value={draft.reviewer_id ?? "none"}
                placeholder="Reviewer…"
                width="w-80"
                onSelect={(v) => set({ reviewer_id: v === "none" ? null : v })}
              />
            )}
            <button
              type="button"
              onClick={() => set({ is_private: !draft.is_private })}
              aria-pressed={draft.is_private}
              className={cn(chipClass, draft.is_private && "border-brand/50 text-fg")}
              title="Only you and the assignee will see it"
            >
              <Icon icon={draft.is_private ? LockKeyIcon : UserGroupIcon} size={13} />
              {draft.is_private ? "Private" : "Visible to the team"}
            </button>
            {asTemplate && (
              <button
                type="button"
                onClick={() => setShared(!shared)}
                aria-pressed={othersShared ? target!.shared : shared}
                disabled={othersShared}
                className={cn(chipClass, (othersShared ? target!.shared : shared) && "border-brand/50 text-fg", othersShared && "opacity-60")}
                title={
                  othersShared
                    ? "Only its owner decides who sees this template"
                    : draft.is_private && shared
                      ? "Everyone can use it. The tasks it makes stay private, but the team sees the template's name."
                      : "Everyone can use it; only you, or an admin, can change it"
                }
              >
                <Icon icon={LayoutTemplateIcon} size={13} />
                {(othersShared ? target!.shared : shared) ? "Template shared with the team" : "Template just for you"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-line px-4 py-2.5">
            {!editing && (
              <label className={cn("flex items-center gap-2 text-xs text-fg-3", missing && "opacity-60")} title={missing ? TEMPLATES_MISSING : "Saves a template for next time, and makes no task"}>
                <Switch checked={asTemplate} onCheckedChange={switchToTemplate} disabled={missing} />
                Save as template
              </label>
            )}
            {!asTemplate && (
              <label className="flex items-center gap-2 text-xs text-fg-3">
                <Switch checked={more} onCheckedChange={setMore} />
                Create more
              </label>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending || saveTask.isPending}
              className="pressable ml-auto inline-flex h-8 items-center gap-2 rounded-md bg-brand-solid px-3 text-sm font-medium text-white hover:bg-brand-solid-hover disabled:opacity-60"
            >
              {asTemplate ? (saveTask.isPending ? "Saving…" : same ? "Replace template" : "Save template") : "Create task"}
              <span className="flex gap-0.5 opacity-80">
                <Kbd className="border-white/25 bg-white/10 text-white">⌘</Kbd>
                <Kbd className="border-white/25 bg-white/10 text-white">↵</Kbd>
              </span>
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
