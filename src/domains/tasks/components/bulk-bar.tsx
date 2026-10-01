"use client"

import { useMemo } from "react"
import { Cancel01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { useMe } from "@/domains/workspace/provider"
import { canComplete, type Task, type TaskPatch } from "../config"
import { useBulkUpdate, useDeleteTask } from "../data"
import { DueDatePicker, PickerMenu, priorityOptions, statusOptions, usePeopleOptions, useProjectOptions } from "./pickers"

const action =
  "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-2 hover:bg-selected hover:text-fg data-popup-open:bg-selected"

/** Appears when rows are selected: change them all at once. */
export function BulkBar({ tasks, onClear }: { tasks: Task[]; onClear: () => void }) {
  const me = useMe()
  const bulk = useBulkUpdate()
  const del = useDeleteTask()
  const people = usePeopleOptions()
  const projects = useProjectOptions()
  const status = useMemo(() => statusOptions(), [])
  const priority = useMemo(() => priorityOptions(), [])

  const apply = (patch: TaskPatch) => {
    let ids = tasks.map((t) => t.id)
    if (patch.status === "done") {
      const allowed = tasks.filter((t) => canComplete(t, me.id, me.role))
      if (allowed.length < tasks.length) {
        toast(`${tasks.length - allowed.length} of these need someone else to sign them off`, {
          description: "Those were left as they are.",
        })
      }
      ids = allowed.map((t) => t.id)
    }
    if (ids.length) bulk.mutate({ ids, patch })
  }

  const open = tasks.length > 0
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4 transition-[opacity,transform] duration-200 ease-out",
        open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <div
        role="toolbar"
        aria-label="Change selected tasks"
        className={cn(
          "flex items-center gap-0.5 rounded-lg bg-raised p-1 shadow-popover",
          open && "pointer-events-auto",
        )}
      >
        <span className="px-2 text-xs font-medium text-fg tabular">{tasks.length} selected</span>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <PickerMenu triggerLabel="Set status" triggerClassName={action} trigger="Status" options={status} value={null}
          placeholder="Set status…" onSelect={(v) => apply({ status: v })} align="center" />
        <PickerMenu triggerLabel="Assign" triggerClassName={action} trigger="Assign" options={people} value={null}
          placeholder="Assign to…" width="w-72" onSelect={(v) => apply({ assignee_id: v === "none" ? null : v })} align="center" />
        <PickerMenu triggerLabel="Set priority" triggerClassName={action} trigger="Priority" options={priority} value={null}
          placeholder="Set priority…" onSelect={(v) => apply({ priority: v })} align="center" />
        <PickerMenu triggerLabel="Move to project" triggerClassName={action} trigger="Project" options={projects} value={null}
          placeholder="Move to…" onSelect={(v) => apply({ project_id: v === "none" ? null : v })} align="center" />
        <DueDatePicker value={null} onChange={(due_date) => apply({ due_date })} triggerClassName={action} trigger="Due date" align="center" />
        <button
          type="button"
          className={cn(action, "text-danger hover:text-danger")}
          onClick={() => {
            tasks.forEach((t) => del.mutate(t))
            onClear()
          }}
        >
          <Icon icon={Delete02Icon} size={14} />
          Delete
        </button>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <button type="button" onClick={onClear} aria-label="Clear selection" className={cn(action, "px-1.5")}>
          <Icon icon={Cancel01Icon} size={14} />
        </button>
      </div>
    </div>
  )
}
