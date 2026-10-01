"use client"

import { useMemo, useState } from "react"
import { FileExportIcon, FileImportIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { download, toCsv } from "@/lib/csv"
import { useMemberMap, useProjectMap } from "@/domains/workspace/provider"
import { ImportDialog } from "./import-dialog"
import { STATUS_META, PRIORITY_META, taskKey, type Status, type Priority } from "../config"
import { Add01Icon, Task01Icon, TaskDone01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/app/icon"
import { PageHeader } from "@/components/app/page"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { useMe, useTasks } from "@/domains/workspace/provider"
import { isOpen } from "../config"
import { TaskExplorer } from "./task-explorer"

function NewTaskButton({ defaults }: { defaults?: Parameters<ReturnType<typeof useUI>["openCreateTask"]>[0] }) {
  const { openCreateTask } = useUI()
  return (
    <Button size="sm" onClick={() => openCreateTask(defaults)} className="h-7 gap-1.5 px-2.5">
      <Icon icon={Add01Icon} size={14} />
      New task
    </Button>
  )
}

export function AllTasks() {
  const tasks = useTasks()
  const members = useMemberMap()
  const projects = useProjectMap()
  const [importing, setImporting] = useState(false)
  const open = tasks.filter((t) => isOpen(t.status)).length

  const exportCsv = () => {
    const rows = [
      ["key", "title", "status", "priority", "assignee", "assignee_email", "due_date", "project", "created_at", "completed_at"],
      ...tasks
        .slice()
        .sort((a, b) => a.number - b.number)
        .map((t) => {
          const who = t.assignee_id ? members.get(t.assignee_id) : null
          return [
            taskKey(t),
            t.title,
            STATUS_META[t.status as Status]?.label ?? t.status,
            PRIORITY_META[t.priority as Priority]?.label ?? t.priority,
            who?.full_name ?? "",
            who?.email ?? "",
            t.due_date ?? "",
            t.project_id ? projects.get(t.project_id)?.name ?? "" : "",
            t.created_at.slice(0, 10),
            t.completed_at?.slice(0, 10) ?? "",
          ]
        }),
    ]
    download(`rtc-tasks-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
  }

  return (
    <>
      <PageHeader
        title="All tasks"
        icon={Task01Icon}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More"
                className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg data-popup-open:bg-hover"
              >
                <Icon icon={MoreHorizontalIcon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setImporting(true)}>
                  <Icon icon={FileImportIcon} className="text-fg-3" />
                  Import from CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCsv}>
                  <Icon icon={FileExportIcon} className="text-fg-3" />
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NewTaskButton />
          </>
        }
      >
        <span className="text-xs text-fg-3 tabular">{open} open</span>
      </PageHeader>
      <TaskExplorer tasks={tasks} scopeKey="all" defaultView="list" />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </>
  )
}

const TABS = [
  { key: "assigned", label: "Assigned to me" },
  { key: "review", label: "To sign off" },
  { key: "created", label: "Created by me" },
] as const
type Tab = (typeof TABS)[number]["key"]

export function MyTasks() {
  const tasks = useTasks()
  const me = useMe()
  const [tab, setTab] = useState<Tab>("assigned")

  const scoped = useMemo(() => {
    if (tab === "assigned") return tasks.filter((t) => t.assignee_id === me.id)
    if (tab === "created") return tasks.filter((t) => t.created_by === me.id)
    // Waiting on me: in review, and I'm the one who can sign it off.
    return tasks.filter(
      (t) =>
        t.status === "in_review" &&
        (t.reviewer_id === me.id ||
          t.completion_approvers.includes(me.id) ||
          (t.completion_policy === "assigner" && (t.assigned_by ?? t.created_by) === me.id)),
    )
  }, [tasks, tab, me.id])

  const counts = useMemo(
    () => ({
      assigned: tasks.filter((t) => t.assignee_id === me.id && isOpen(t.status)).length,
      review: tasks.filter(
        (t) =>
          t.status === "in_review" &&
          (t.reviewer_id === me.id || t.completion_approvers.includes(me.id) ||
            (t.completion_policy === "assigner" && (t.assigned_by ?? t.created_by) === me.id)),
      ).length,
      created: tasks.filter((t) => t.created_by === me.id && isOpen(t.status)).length,
    }),
    [tasks, me.id],
  )

  return (
    <>
      <PageHeader title="My tasks" icon={TaskDone01Icon} actions={<NewTaskButton defaults={{ assignee_id: me.id }} />} />
      <TaskExplorer
        key={tab}
        tasks={scoped}
        scopeKey={`my-${tab}`}
        defaultView="list"
        createDefaults={tab === "assigned" ? { assignee_id: me.id } : undefined}
        emptyTitle={tab === "review" ? "Nothing is waiting on you" : "Nothing here yet"}
        emptyDescription={tab === "review" ? "Tasks you need to sign off appear here when they move to In review." : undefined}
        toolbarStart={
          <div className="mr-1 flex items-center gap-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                  tab === t.key ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
                )}
              >
                {t.label}
                <span className="text-fg-3 tabular">{counts[t.key]}</span>
              </button>
            ))}
            <span className="ml-1 h-4 w-px bg-line" />
          </div>
        }
      />
    </>
  )
}
