"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ModalShell } from "@/components/app/modal"
import { useMe, useMemberMap } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import type { Task } from "@/domains/tasks/config"
import {
  DUE_CHOICES,
  canEditTemplate,
  dueLabel,
  dueOffset,
  sortTemplates,
  useTaskTemplates,
  useTemplateActions,
  type AssignMode,
} from "../data"

const field =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-brand"

/**
 * Save a task's details as a template: its title, description, checklist,
 * priority, project, people and sign-off rule. Opened from the task panel's
 * ⋯ menu. Saving under the name of a template you can change replaces it,
 * which is how a template is updated.
 */
export function SaveTaskTemplateDialog({
  task,
  description,
  checklist,
  onClose,
}: {
  task: Task | null
  description: string | null
  checklist: string[]
  onClose: () => void
}) {
  return (
    <ModalShell open={Boolean(task)} onClose={onClose} title="Save as a template">
      {task && <Form key={task.id} task={task} description={description} checklist={checklist} onClose={onClose} />}
    </ModalShell>
  )
}

function Form({ task, description, checklist, onClose }: { task: Task; description: string | null; checklist: string[]; onClose: () => void }) {
  const me = useMe()
  const members = useMemberMap()
  const { data: templates = [] } = useTaskTemplates()
  const { saveTask } = useTemplateActions()
  const assignee = task.assignee_id ? members.get(task.assignee_id) : null

  const [name, setName] = useState(task.title.slice(0, 120))
  // The usual case: you save your own routine, and whoever uses it gets the task.
  const [assign, setAssign] = useState<AssignMode>(task.assignee_id === me.id ? "user" : task.assignee_id ? "person" : "nobody")
  const [due, setDue] = useState<number | null>(dueOffset(task))
  // Untouched, it follows the template being replaced (if any); otherwise it's off.
  const [sharedChoice, setShared] = useState<boolean | null>(null)

  const steps = checklist.map((c) => c.trim().slice(0, 500)).filter(Boolean).slice(0, 100)
  const same = sortTemplates(templates, me.id).find(
    (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase() && canEditTemplate(t, me),
  )
  const shared = sharedChoice ?? same?.shared ?? false
  const choices: readonly (number | null)[] = DUE_CHOICES
  const dueChoices = choices.includes(due) ? choices : [...choices, due]
  const kept = [
    "title",
    description?.trim() && "description",
    steps.length && `${steps.length}-step checklist`,
    task.priority !== "none" && "priority",
    task.project_id && "project",
    task.reviewer_id && "reviewer",
    "sign-off rule",
    task.is_private && "privacy",
  ].filter(Boolean) as string[]

  const save = async () => {
    const clean = name.trim()
    if (!clean) return toast.error("Give the template a name.")
    try {
      await saveTask.mutateAsync({
        id: same?.id,
        input: {
          name: clean,
          shared: same && same.created_by !== me.id ? same.shared : shared,
          title: task.title,
          description: description?.trim() || null,
          status: ["backlog", "todo", "in_progress"].includes(task.status) ? task.status : "todo",
          priority: task.priority,
          project_id: task.project_id,
          assignee_id: assign === "person" ? task.assignee_id : null,
          assign_to_user: assign === "user",
          reviewer_id: task.reviewer_id,
          completion_policy: task.completion_policy,
          completion_approvers: task.completion_approvers,
          is_private: task.is_private,
          due_in_days: due,
          checklist: steps,
        },
      })
      toast(same ? `Updated the template "${clean}"` : `Saved "${clean}" as a template`, {
        description: "Next time, press C and choose it from Templates.",
      })
      onClose()
    } catch {
      // The mutation shows the reason.
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="flex flex-col gap-4 px-5 pt-3 pb-5"
    >
      <p className="text-sm text-fg-3">Makes the next one a couple of clicks away. You can still change anything before it&apos;s made.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg-2">Name</span>
        <input autoFocus value={name} maxLength={120} onFocus={(e) => e.target.select()} onChange={(e) => setName(e.target.value)} className={field} />
        {same && (
          <span className="text-xs text-fg-3">
            Replaces {same.created_by === me.id ? "your" : "the team's"} template with this name.
          </span>
        )}
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Assign it to</span>
          <select value={assign} onChange={(e) => setAssign(e.target.value as AssignMode)} className={field}>
            <option value="user">Whoever uses it</option>
            {assignee && <option value="person">{assignee.id === me.id ? "Always you" : `Always ${displayName(assignee)}`}</option>}
            <option value="nobody">Nobody yet</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Due date</span>
          <select value={due ?? "none"} onChange={(e) => setDue(e.target.value === "none" ? null : Number(e.target.value))} className={field}>
            {dueChoices.map((d) => (
              <option key={d ?? "none"} value={d ?? "none"}>
                {dueLabel(d)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!(same && same.created_by !== me.id) && (
        <label className="flex items-center justify-between gap-4 text-sm text-fg-2">
          <span>
            Share with the team
            <span className="block text-xs text-fg-3">
              {task.is_private
                ? "Everyone can use it. The tasks it makes stay private, but the team sees the template's title."
                : "Everyone can use it. Only you, or an admin, can change it."}
            </span>
          </span>
          <Switch checked={shared} onCheckedChange={setShared} />
        </label>
      )}
      <p className="text-xs leading-5 text-fg-3">Keeps the {joinWords(kept)}. Not the due date itself, comments, files or history.</p>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saveTask.isPending}>
          {saveTask.isPending ? "Saving…" : same ? "Replace template" : "Save template"}
        </Button>
      </div>
    </form>
  )
}

function joinWords(words: string[]) {
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`
}
