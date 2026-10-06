"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { NativeSelect, fieldClass } from "@/components/ui/field"
import { SwatchPicker } from "@/components/app/swatch-picker"
import { cn } from "@/lib/utils"
import { useMe, useMembers } from "@/domains/workspace/provider"
import { displayName, type Project } from "@/domains/workspace/types"
import { PickerMenu, usePeopleOptions } from "@/domains/tasks/components/pickers"
import { PeoplePicker } from "@/domains/people/components/people-picker"
import { PROJECT_COLORS, PROJECT_COLOR_NAMES, PROJECT_STATUSES, PROJECT_STATUS_META, useProjectActions, type ProjectInput, type ProjectStatus } from "../data"

const input = fieldClass

/** Create a project, or edit one: the same form, so they never drift apart. */
export function ProjectForm({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  const me = useMe()
  const members = useMembers()
  const router = useRouter()
  const { create, update, setMembers } = useProjectActions()
  const owners = usePeopleOptions({ includeNone: false })
  const [draft, setDraft] = useState<ProjectInput>(() => fromProject(project, me.id))
  const [key, setKey] = useState(project?.id ?? "new")
  if ((project?.id ?? "new") !== key) {
    setKey(project?.id ?? "new")
    setDraft(fromProject(project, me.id))
  }
  const set = (patch: Partial<ProjectInput>) => setDraft((d) => ({ ...d, ...patch }))
  const owner = members.find((m) => m.id === draft.owner_id)
  const pending = create.isPending || update.isPending

  const submit = async () => {
    if (!draft.name.trim()) return toast.error("Give the project a name.")
    try {
      if (project) {
        const { memberIds, ...patch } = draft
        await update.mutateAsync({ id: project.id, patch: { ...patch, name: patch.name.trim() } })
        await setMembers.mutateAsync({ project: { ...project, owner_id: draft.owner_id }, memberIds })
        toast("Project saved")
      } else {
        const id = await create.mutateAsync({ ...draft, name: draft.name.trim() })
        toast(`Created ${draft.name.trim()}`)
        router.push(`/projects/${id}`)
      }
      onClose()
    } catch {
      // Errors are shown by the mutation.
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup className="ui-dialog fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-xl bg-raised shadow-popover outline-none">
          <div className="flex items-center justify-between px-5 pt-4">
            <DialogPrimitive.Title className="text-md font-semibold text-fg">{project ? "Edit project" : "New project"}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pt-3 pb-5">
            <div className="flex items-end gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Name</span>
                <input autoFocus value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="For example, Northline Nutrition" className={input} />
              </label>
              <SwatchPicker
                options={PROJECT_COLORS.map((c) => ({ value: c, label: PROJECT_COLOR_NAMES[c] ?? c, color: c }))}
                value={draft.color ?? PROJECT_COLORS[0]}
                onChange={(color) => set({ color })}
              />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-2">What it's for <span className="font-normal text-fg-4">(optional)</span></span>
              <textarea value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value })} rows={2}
                placeholder="One or two sentences the team can read at a glance"
                className="w-full resize-none rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-brand" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-xs font-medium text-fg-2">Kind</legend>
                <div className="flex gap-1 rounded-md bg-hover p-0.5">
                  {(["client", "internal"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => set({ kind: k })}
                      className={cn("pressable h-7 flex-1 rounded-[5px] text-xs font-medium", draft.kind === k ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg")}>
                      {k === "client" ? "Client work" : "Internal"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Status</span>
                <NativeSelect value={draft.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
                  {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_META[s].label}</option>)}
                </NativeSelect>
              </label>
            </div>
            {draft.kind === "client" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Client</span>
                <input value={draft.client_name ?? ""} onChange={(e) => set({ client_name: e.target.value })} placeholder="Company name" className={input} />
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Starts</span>
                <input type="date" value={draft.start_date ?? ""} onChange={(e) => set({ start_date: e.target.value || null })} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Ends <span className="font-normal text-fg-4">(contract end)</span></span>
                <input type="date" value={draft.target_date ?? ""} onChange={(e) => set({ target_date: e.target.value || null })} className={input} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Owner</span>
                <PickerMenu
                  triggerLabel="Owner"
                  triggerClassName="pressable flex h-9 w-full items-center gap-2 rounded-md border border-line-strong px-3 text-left text-sm text-fg hover:bg-hover"
                  trigger={owner ? <><Avatar id={owner.id} name={displayName(owner)} size="sm" /><span className="truncate">{displayName(owner)}</span></> : "Choose"}
                  options={owners}
                  value={draft.owner_id}
                  placeholder="Who owns it?"
                  width="w-80"
                  onSelect={(owner_id) => set({ owner_id, memberIds: [...new Set([...draft.memberIds, owner_id])] })}
                />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-fg-2">Default view</span>
                <NativeSelect value={draft.default_view} onChange={(e) => set({ default_view: e.target.value as ProjectInput["default_view"] })}>
                  <option value="list">List</option>
                  <option value="board">Board</option>
                  <option value="calendar">Calendar</option>
                </NativeSelect>
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-2">Members</span>
              <PeoplePicker
                label="Members"
                placeholder="Add members…"
                value={draft.memberIds.filter((id) => id !== draft.owner_id)}
                onChange={(ids) => set({ memberIds: [...new Set([draft.owner_id, ...ids])] })}
                locked={[draft.owner_id]}
                lockedNote="Owner"
              />
              <p className="text-xs text-fg-4">The owner is always a member. Each person sets their own view; this is where new members start.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={pending}>{pending ? "Saving…" : project ? "Save" : "Create project"}</Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function fromProject(project: Project | undefined, me: string): ProjectInput {
  if (!project) {
    return {
      name: "",
      description: "",
      kind: "internal",
      client_name: "",
      owner_id: me,
      color: PROJECT_COLORS[0],
      status: "active",
      start_date: null,
      target_date: null,
      default_view: "list",
      memberIds: [me],
    }
  }
  return {
    name: project.name,
    description: project.description,
    kind: project.kind as ProjectInput["kind"],
    client_name: project.client_name,
    owner_id: project.owner_id ?? me,
    color: project.color ?? PROJECT_COLORS[0],
    status: project.status as ProjectStatus,
    start_date: project.start_date,
    target_date: project.target_date,
    default_view: project.default_view as ProjectInput["default_view"],
    memberIds: project.members.map((m) => m.user_id),
  }
}
