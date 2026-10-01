"use client"

import { useMemo, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon, Download01Icon, Upload01Icon } from "@hugeicons/core-free-icons"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"
import { download, parseCsv, toCsv } from "@/lib/csv"
import { getSupabase } from "@/lib/supabase/client"
import { useMembers, useProjects, useToday, useUid } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import { PRIORITIES, STATUSES, STATUS_META, TASK_COLUMNS, type Task } from "../config"
import { explain } from "../data"
import { nudgeDelivery } from "@/domains/inbox/deliver"
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./glyphs"

type Row = {
  line: number
  title: string
  description: string | null
  assigneeId: string | null
  assigneeNote: string | null
  priority: string
  status: string
  due: string | null
  projectName: string | null
  projectId: string | null
  problems: string[]
}

const TEMPLATE = [
  ["title", "description", "assignee_email", "priority", "status", "due_date", "project"],
  ["Write the October SEO report", "Draft it before the client call", "christian@roblestech.net", "high", "todo", "2026-10-15", "Promix Nutrition"],
  ["Fix the contact form", "Spam is getting through", "", "medium", "", "", ""],
  ["# priority: urgent, high, medium, low or none. status: backlog, todo, in_progress, in_review, done. due_date: YYYY-MM-DD. A new project name creates the project."],
]

/**
 * Bring tasks in from a spreadsheet. Everything is checked and shown before
 * anything is saved, then it all goes in one write. Only team members can be
 * assigned (the live PPM let an import assign work to client logins: D-08).
 */
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useMembers()
  const projects = useProjects()
  const uid = useUid()
  const today = useToday()
  const qc = useQueryClient()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const byEmail = useMemo(() => new Map(members.filter((m) => !m.deactivated_at && m.email).map((m) => [m.email!.toLowerCase(), m])), [members])
  const byName = useMemo(() => new Map(projects.map((p) => [p.name.trim().toLowerCase(), p])), [projects])

  const read = async (file: File) => {
    setError(null)
    setFileName(file.name)
    const table = parseCsv(await file.text())
    if (table.length < 2) return setError("The file has no rows under its header.")
    const header = table[0].map((h) => h.trim().toLowerCase())
    const at = (name: string) => header.indexOf(name)
    const iTitle = at("title")
    if (iTitle < 0) return setError('The first row needs a "title" column. The template shows the rest.')
    const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "")

    setRows(
      table.slice(1).flatMap((r, n): Row[] => {
        const title = cell(r, iTitle)
        if (!title) return []
        const problems: string[] = []
        const email = cell(r, at("assignee_email")).toLowerCase()
        const member = email ? byEmail.get(email) : null
        let assigneeNote: string | null = null
        if (email && !member) {
          assigneeNote = email
          problems.push(`${email} isn't on the team, so it stays unassigned`)
        }
        let priority = cell(r, at("priority")).toLowerCase() || "none"
        if (!(PRIORITIES as readonly string[]).includes(priority)) {
          problems.push(`"${priority}" isn't a priority`)
          priority = "none"
        }
        let status = cell(r, at("status")).toLowerCase().replace(/\s+/g, "_") || "todo"
        if (!(STATUSES as readonly string[]).includes(status)) {
          problems.push(`"${status}" isn't a status`)
          status = "todo"
        }
        let due: string | null = cell(r, at("due_date")) || null
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
          problems.push(`"${due}" isn't a date like ${today}`)
          due = null
        }
        const projectName = cell(r, at("project")) || null
        const existing = projectName ? byName.get(projectName.toLowerCase()) : null
        return [
          {
            line: n + 2,
            title,
            description: cell(r, at("description")) || null,
            assigneeId: member?.id ?? null,
            assigneeNote,
            priority,
            status,
            due,
            projectName,
            projectId: existing?.id ?? null,
            problems,
          },
        ]
      }),
    )
  }

  const newProjects = rows ? [...new Set(rows.filter((r) => r.projectName && !r.projectId).map((r) => r.projectName!))] : []

  const save = async () => {
    if (!rows?.length) return
    setSaving(true)
    try {
      const supabase = getSupabase()
      const created = new Map<string, string>()
      if (newProjects.length) {
        const { data, error } = await supabase
          .from("ppm_projects")
          .insert(newProjects.map((name) => ({ name, created_by: uid, owner_id: uid })))
          .select("id,name")
        if (error) throw error
        for (const p of data ?? []) created.set(p.name.toLowerCase(), p.id)
      }
      const { data, error } = await supabase
        .from("ppm_tasks")
        .insert(
          rows.map((r) => ({
            title: r.title,
            description: r.description,
            assignee_id: r.assigneeId,
            priority: r.priority,
            status: r.status,
            due_date: r.due,
            project_id: r.projectId ?? (r.projectName ? created.get(r.projectName.toLowerCase()) ?? null : null),
            created_by: uid,
          })),
        )
        .select(TASK_COLUMNS)
      if (error) throw error
      qc.setQueryData<Task[]>(["tasks"], (old = []) => [...old, ...((data ?? []) as unknown as Task[])])
      if (newProjects.length) qc.invalidateQueries({ queryKey: ["projects"] })
      nudgeDelivery()
      toast(`Imported ${data?.length ?? 0} tasks`, {
        description: newProjects.length ? `New projects: ${newProjects.join(", ")}` : undefined,
      })
      close()
    } catch (e) {
      toast.error(explain(e))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    setRows(null)
    setFileName("")
    setError(null)
    onClose()
  }

  const people = new Map(members.map((m) => [m.id, m]))
  const flagged = rows?.filter((r) => r.problems.length).length ?? 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup className="ui-dialog fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[min(860px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-xl bg-raised shadow-popover outline-none">
          <div className="flex items-center justify-between px-5 pt-4">
            <DialogPrimitive.Title className="text-md font-semibold text-fg">Import tasks from a spreadsheet</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>

          {!rows ? (
            <div className="flex flex-col gap-4 px-5 pt-3 pb-6">
              <p className="text-sm text-fg-3">
                Save your sheet as CSV. You'll see every row before anything is created, and nothing is saved until you say so.
              </p>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) read(f)
                }}
                className="flex cursor-default flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center hover:border-brand/60 hover:bg-hover"
              >
                <Icon icon={Upload01Icon} size={20} className="text-fg-3" />
                <span className="text-sm text-fg">Drop a CSV here, or choose one</span>
                <span className="text-xs text-fg-3">Columns: title (required), description, assignee_email, priority, status, due_date, project</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
              </label>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <button
                type="button"
                onClick={() => download("ppm-task-template.csv", toCsv(TEMPLATE))}
                className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-brand hover:underline"
              >
                <Icon icon={Download01Icon} size={14} />
                Download the template
              </button>
            </div>
          ) : (
            <>
              <p className="px-5 pt-2 text-sm text-fg-3">
                {fileName}: <span className="text-fg">{rows.length} tasks</span>
                {flagged > 0 && <span className="text-warning"> · {flagged} with notes below</span>}
                {newProjects.length > 0 && <> · new {newProjects.length === 1 ? "project" : "projects"}: {newProjects.join(", ")}</>}
              </p>
              <div className="mt-3 min-h-0 flex-1 overflow-auto border-y border-line">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-raised">
                    <tr className="h-8 border-b border-line text-left text-xs text-fg-3">
                      <th className="w-16 pl-5 font-normal">Row</th>
                      <th className="font-normal">Title</th>
                      <th className="w-36 font-normal">Assignee</th>
                      <th className="w-28 font-normal">Status</th>
                      <th className="w-24 font-normal">Priority</th>
                      <th className="w-28 font-normal">Due</th>
                      <th className="w-40 pr-5 font-normal">Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const who = r.assigneeId ? people.get(r.assigneeId) : null
                      const proj = r.projectId ? projects.find((p) => p.id === r.projectId) : null
                      return (
                        <tr key={r.line} className={cn("border-b border-line/60 align-top", r.problems.length && "bg-[color-mix(in_oklab,var(--warning)_6%,transparent)]")}>
                          <td className="py-2 pl-5 text-xs text-fg-4 tabular">{r.line}</td>
                          <td className="py-2 pr-3">
                            <span className="text-fg">{r.title}</span>
                            {r.problems.map((p) => (
                              <span key={p} className="mt-0.5 block text-xs text-warning">{p}</span>
                            ))}
                          </td>
                          <td className="py-2 text-xs">
                            {who ? (
                              <span className="flex items-center gap-1.5 text-fg-2">
                                <Avatar id={who.id} name={displayName(who)} size="xs" />
                                {displayName(who)}
                              </span>
                            ) : (
                              <span className="text-fg-4">{r.assigneeNote ? "Unassigned" : "None"}</span>
                            )}
                          </td>
                          <td className="py-2 text-xs">
                            <span className="flex items-center gap-1.5 text-fg-2">
                              <StatusIcon status={r.status} size={12} />
                              {STATUS_META[r.status as keyof typeof STATUS_META]?.label}
                            </span>
                          </td>
                          <td className="py-2"><PriorityIcon priority={r.priority} /></td>
                          <td className="py-2 text-xs text-fg-2 tabular">{r.due ?? <span className="text-fg-4">None</span>}</td>
                          <td className="py-2 pr-5 text-xs">
                            {r.projectName ? (
                              <span className="flex items-center gap-1.5 text-fg-2">
                                <ProjectSwatch color={proj?.color ?? null} size={8} />
                                {r.projectName}
                                {!proj && <span className="text-brand">new</span>}
                              </span>
                            ) : (
                              <span className="text-fg-4">None</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 px-5 py-3">
                <Button variant="ghost" onClick={() => setRows(null)}>Choose another file</Button>
                <span className="flex-1" />
                <Button variant="ghost" onClick={close}>Cancel</Button>
                <Button onClick={save} disabled={saving || rows.length === 0}>
                  {saving ? "Importing…" : `Import ${rows.length} ${rows.length === 1 ? "task" : "tasks"}`}
                </Button>
              </div>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
