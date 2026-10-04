"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive02Icon, ArchiveRestoreIcon, Delete02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/app/icon"
import { ModalShell } from "@/components/app/modal"
import { cn } from "@/lib/utils"
import { useMe, useTasks } from "@/domains/workspace/provider"
import type { Project } from "@/domains/workspace/types"
import { canDeleteProject, canManageProject, useProjectActions } from "../data"

/**
 * A project's own actions: archive or restore it, and, for admins, delete it.
 * The same menu sits on the project's page and on its row in the portfolio.
 * It renders nothing for someone who can do neither.
 */
export function ProjectMenu({
  project,
  triggerClassName,
  align = "end",
  afterDelete,
}: {
  project: Project
  triggerClassName?: string
  align?: "start" | "end"
  /** Where to go once it's deleted, when the current page was the project's own. */
  afterDelete?: string
}) {
  const me = useMe()
  const { setArchived } = useProjectActions()
  const [deleting, setDeleting] = useState(false)
  const manage = canManageProject(project, me)
  const del = canDeleteProject(me)
  if (!manage && !del) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${project.name}`}
          className={cn(
            "pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg data-popup-open:bg-hover data-popup-open:text-fg",
            triggerClassName,
          )}
        >
          <Icon icon={MoreHorizontalIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-60">
          {manage &&
            (project.archived ? (
              <DropdownMenuItem onClick={() => setArchived.mutate({ project, archived: false })}>
                <Icon icon={ArchiveRestoreIcon} className="text-fg-3" />
                Restore project
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setArchived.mutate({ project, archived: true })}>
                <Icon icon={Archive02Icon} className="text-fg-3" />
                Archive project
              </DropdownMenuItem>
            ))}
          {del && (
            <>
              {manage && <DropdownMenuSeparator />}
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <Icon icon={Delete02Icon} />
                Delete project…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {del && <DeleteProjectDialog project={deleting ? project : null} onClose={() => setDeleting(false)} afterDelete={afterDelete} />}
    </>
  )
}

/** Deleting can't be undone, so it says what goes and asks about the tasks. Keeping them is the default. */
function DeleteProjectDialog({ project, onClose, afterDelete }: { project: Project | null; onClose: () => void; afterDelete?: string }) {
  const tasks = useTasks()
  const router = useRouter()
  const { remove } = useProjectActions()
  const [withTasks, setWithTasks] = useState(false)
  const count = project ? tasks.filter((t) => t.project_id === project.id).length : 0

  const close = () => {
    setWithTasks(false)
    onClose()
  }

  return (
    <ModalShell open={Boolean(project)} onClose={close} title={`Delete ${project?.name ?? "project"}?`}>
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
        <p className="text-sm text-fg-3">
          The project, its members and its dates are removed for everyone. This can't be undone. To only hide it, archive it
          instead.
        </p>
        {count > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium text-fg-2">
              {count === 1 ? "Its task" : `Its ${count} tasks`}
            </legend>
            {[
              { value: false, label: "Keep them", hint: "They stay in All tasks, with no project." },
              { value: true, label: "Delete them too", hint: "Best for a test project. They go the way any deleted task goes." },
            ].map((o) => (
              <label
                key={String(o.value)}
                className={cn(
                  "flex cursor-default items-start gap-2.5 rounded-md border px-3 py-2 transition-colors",
                  withTasks === o.value ? "border-brand/60 bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="project-tasks"
                  checked={withTasks === o.value}
                  onChange={() => setWithTasks(o.value)}
                  className="mt-0.5 accent-[var(--brand-solid)]"
                />
                <span>
                  <span className="block text-sm text-fg">{o.label}</span>
                  <span className="block text-xs text-fg-3">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending || !project}
            onClick={async () => {
              if (!project) return
              try {
                await remove.mutateAsync({ project, deleteTasks: withTasks })
                close()
                if (afterDelete) router.push(afterDelete)
              } catch {
                // The mutation shows the reason.
              }
            }}
          >
            {remove.isPending ? "Deleting…" : withTasks && count > 0 ? `Delete project and ${count} ${count === 1 ? "task" : "tasks"}` : "Delete project"}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
