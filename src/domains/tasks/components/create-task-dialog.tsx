"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon, LockKeyIcon, UserIcon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { Kbd } from "@/components/app/page"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { dueLabel } from "@/lib/dates"
import { useMemberMap, useProjectMap, useToday } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import { taskKey } from "../config"
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
  statusOptions,
  usePeopleOptions,
  useProjectOptions,
} from "./pickers"

type Draft = Required<Pick<NewTask, "status" | "priority" | "completion_policy">> &
  Pick<NewTask, "assignee_id" | "project_id" | "due_date" | "reviewer_id"> & { is_private: boolean }

const EMPTY: Draft = {
  status: "todo",
  priority: "none",
  completion_policy: "anyone",
  assignee_id: null,
  project_id: null,
  due_date: null,
  reviewer_id: null,
  is_private: false,
}

/** New task: a title, then whichever properties matter. Cmd+Enter creates. */
export function CreateTaskDialog() {
  const { createTask, closeCreateTask } = useUI()
  const { open: openTask } = useTaskPanel()
  const create = useCreateTask()
  const members = useMemberMap()
  const projects = useProjectMap()
  const today = useToday()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [more, setMore] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Each time the dialog opens, start from the defaults its opener passed.
  const [openedWith, setOpenedWith] = useState<typeof createTask.defaults | null>(null)
  if (createTask.open && openedWith !== createTask.defaults) {
    setOpenedWith(createTask.defaults)
    setDraft({ ...EMPTY, ...(createTask.defaults as Partial<Draft>) })
    setTitle(createTask.defaults.title ?? "")
    setDescription("")
  }
  if (!createTask.open && openedWith !== null) setOpenedWith(null)

  const statusOpts = useMemo(() => statusOptions(), [])
  const priorityOpts = useMemo(() => priorityOptions(), [])
  const people = usePeopleOptions({ projectId: draft.project_id })
  const reviewers = usePeopleOptions({ projectId: draft.project_id, noneLabel: "No reviewer" })
  const projectOpts = useProjectOptions()
  const policyOpts = useMemo(() => policyOptions(), [])
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const clean = title.trim()
    if (!clean) {
      titleRef.current?.focus()
      return
    }
    try {
      const task = await create.mutateAsync({ ...draft, title: clean, description: description.trim() || null })
      toast(`Created ${taskKey(task)}`, {
        description: task.title,
        action: { label: "Open", onClick: () => openTask(task.number) },
      })
      if (more) {
        setTitle("")
        setDescription("")
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

  return (
    <DialogPrimitive.Root open={createTask.open} onOpenChange={(o) => !o && closeCreateTask()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup
          className="ui-dialog fixed top-[12vh] left-1/2 z-50 flex w-[min(660px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-xl bg-raised shadow-popover outline-none"
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
            <DialogPrimitive.Title className="text-xs font-medium text-fg-2">New task</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="pressable ml-auto inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
            >
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>

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
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5">
            <PickerMenu triggerLabel="Status" triggerClassName={chipClass} trigger={<StatusChip value={draft.status} />}
              options={statusOpts} value={draft.status} placeholder="Status…" onSelect={(status) => set({ status })} />
            <PickerMenu triggerLabel="Priority" triggerClassName={chipClass} trigger={<PriorityChip value={draft.priority} />}
              options={priorityOpts} value={draft.priority} placeholder="Priority…" onSelect={(priority) => set({ priority })} />
            <PickerMenu
              triggerLabel="Assignee"
              triggerClassName={chipClass}
              trigger={assignee ? <><Avatar id={assignee.id} name={displayName(assignee)} size="xs" /><span className="truncate">{displayName(assignee)}</span></> : <><Icon icon={UserIcon} size={13} />Assignee</>}
              options={people}
              value={draft.assignee_id ?? "none"}
              placeholder="Assign to…"
              width="w-72"
              onSelect={(v) => set({ assignee_id: v === "none" ? null : v })}
            />
            <DueDatePicker
              value={draft.due_date ?? null}
              onChange={(due_date) => set({ due_date })}
              triggerClassName={chipClass}
              trigger={draft.due_date ? dueLabel(draft.due_date, today) : "Due date"}
            />
            <PickerMenu triggerLabel="Who can mark it done" triggerClassName={chipClass} trigger={<PolicyChip value={draft.completion_policy} />}
              options={policyOpts} value={draft.completion_policy} placeholder="Who can mark it done?" width="w-72"
              onSelect={(completion_policy) => set({ completion_policy })} />
            {(draft.completion_policy === "reviewer" || draft.reviewer_id) && (
              <PickerMenu
                triggerLabel="Reviewer"
                triggerClassName={chipClass}
                trigger={reviewer ? <>Reviewer: {displayName(reviewer)}</> : "Choose reviewer"}
                options={reviewers}
                value={draft.reviewer_id ?? "none"}
                placeholder="Reviewer…"
                width="w-72"
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
              <Icon icon={LockKeyIcon} size={13} />
              {draft.is_private ? "Private" : "Team"}
            </button>
          </div>

          <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
            <label className="flex items-center gap-2 text-xs text-fg-3">
              <Switch checked={more} onCheckedChange={setMore} />
              Create more
            </label>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="pressable ml-auto inline-flex h-8 items-center gap-2 rounded-md bg-brand-solid px-3 text-sm font-medium text-white hover:bg-brand-solid-hover disabled:opacity-60"
            >
              Create task
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
