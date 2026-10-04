"use client"

import { useMemo, useState } from "react"
import { Add01Icon, Archive02Icon, Edit02Icon, Folder02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { Ring, StackedBar } from "@/components/app/charts"
import { Icon } from "@/components/app/icon"
import { Crumb, EmptyState, PageHeader } from "@/components/app/page"
import { useUI } from "@/components/app/ui-state"
import { cn } from "@/lib/utils"
import { diffDays, shortDate } from "@/lib/dates"
import { useMe, useMemberMap, useProjects, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import { isActive, type ViewKind } from "@/domains/tasks/config"
import { HEALTH_META, isOverdue, projectStats } from "@/domains/tasks/selectors"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { ProjectSwatch } from "@/domains/tasks/components/glyphs"
import { DueText } from "@/domains/tasks/components/pickers"
import { TaskExplorer } from "@/domains/tasks/components/task-explorer"
import { PROJECT_STATUS_META, canManageProject, useProjectActions, type ProjectStatus } from "../data"
import { ProjectForm } from "./project-form"
import { ProjectMenu } from "./project-menu"

/** A project's own dashboard: how it's going, what's late, who's carrying it, then its tasks. */
export function ProjectPage({ id }: { id: string }) {
  const projects = useProjects()
  const tasks = useTasks()
  const members = useMemberMap()
  const me = useMe()
  const today = useToday()
  const { openCreateTask } = useUI()
  const { open } = useTaskPanel()
  const { setArchived } = useProjectActions()
  const [editing, setEditing] = useState(false)
  const project = projects.find((p) => p.id === id)
  const theirs = useMemo(() => tasks.filter((t) => t.project_id === id), [tasks, id])

  const carrying = useMemo(() => {
    const byPerson = new Map<string, { progress: number; review: number; todo: number; late: number }>()
    for (const t of theirs) {
      if (!t.assignee_id || !isActive(t.status)) continue
      const row = byPerson.get(t.assignee_id) ?? { progress: 0, review: 0, todo: 0, late: 0 }
      if (t.status === "in_progress") row.progress++
      if (t.status === "in_review") row.review++
      if (t.status === "todo") row.todo++
      if (isOverdue(t, today)) row.late++
      byPerson.set(t.assignee_id, row)
    }
    return [...byPerson.entries()].sort((a, b) => sum(b[1]) - sum(a[1]))
  }, [theirs, today])

  if (!project) {
    return (
      <>
        <PageHeader title="Not found" icon={Folder02Icon} crumbs={<Crumb href="/projects">Projects</Crumb>} />
        <EmptyState icon={Folder02Icon} title="This project doesn't exist" description="It may have been deleted, or the link is wrong." />
      </>
    )
  }

  const s = projectStats(project, theirs, today)
  const owner = project.owner_id ? members.get(project.owner_id) : null
  const canEdit = canManageProject(project, me)
  const daysLeft = project.target_date ? diffDays(project.target_date, today) : null
  const late = theirs.filter((t) => isOverdue(t, today)).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
  const maxLoad = Math.max(4, ...carrying.map(([, r]) => sum(r)))

  return (
    <>
      <PageHeader
        title={project.name}
        crumbs={<Crumb href="/projects">Projects</Crumb>}
        actions={
          <>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 gap-1.5 px-2.5">
                <Icon icon={Edit02Icon} size={14} />
                Edit
              </Button>
            )}
            <Button size="sm" onClick={() => openCreateTask({ project_id: project.id })} className="h-7 gap-1.5 px-2.5">
              <Icon icon={Add01Icon} size={14} />
              New task
            </Button>
            <ProjectMenu project={project} afterDelete="/projects" />
          </>
        }
      />

      {project.archived && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-inset px-5 py-2.5 sm:px-8">
          <Icon icon={Archive02Icon} size={15} className="text-fg-3" />
          <p className="min-w-0 flex-1 text-sm text-fg-2">
            This project is archived. It&apos;s hidden from the sidebar, the portfolio and the project pickers; nothing in it has changed.
          </p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setArchived.mutate({ project, archived: false })} className="h-7 px-2.5">
              Restore
            </Button>
          )}
        </div>
      )}

      <div className="max-h-[44vh] shrink-0 overflow-y-auto border-b border-line">
        <div className="grid grid-cols-1 gap-8 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <ProjectSwatch color={project.color} size={12} />
              <h2 className="truncate text-xl font-semibold tracking-[-0.015em] text-fg">{project.name}</h2>
            </div>
            <p className="mt-1 text-xs text-fg-3">
              {project.kind === "client" ? `Client · ${project.client_name ?? "Unnamed"}` : "Internal"}
              {" · "}
              <span style={{ color: PROJECT_STATUS_META[project.status as ProjectStatus].color }}>
                {PROJECT_STATUS_META[project.status as ProjectStatus].label}
              </span>
              {owner && <> · Owned by {displayName(owner)}</>}
            </p>
            {project.description && <p className="mt-3 max-w-xl text-sm leading-6 text-fg-2">{project.description}</p>}
            <div className="mt-5 flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <Ring value={s.progress} size={30} stroke={3} />
                <div>
                  <p className="text-md font-semibold text-fg tabular">{Math.round(s.progress * 100)}%</p>
                  <p className="text-xs text-fg-3 tabular">{s.done} of {s.total} done</p>
                </div>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: HEALTH_META[s.health].color }}>
                  <span className="size-1.5 rounded-full" style={{ background: HEALTH_META[s.health].color }} />
                  {HEALTH_META[s.health].label}
                </p>
                <p className="text-xs text-fg-3 tabular">{s.overdue} late · {s.open} open</p>
              </div>
              <div>
                <p className={cn("text-sm font-medium tabular", daysLeft !== null && daysLeft < 0 ? "text-danger" : "text-fg")}>
                  {project.target_date ? shortDate(project.target_date, today) : "Ongoing"}
                </p>
                <p className="text-xs text-fg-3">
                  {daysLeft === null ? "No end date" : daysLeft < 0 ? `${-daysLeft} days past the end` : daysLeft === 0 ? "Ends today" : `${daysLeft} days left`}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-medium text-fg-2">What's late</h3>
            {late.length === 0 ? (
              <p className="mt-2 text-sm text-fg-4">Nothing. Everything is on time.</p>
            ) : (
              <ul className="mt-1.5">
                {late.slice(0, 5).map((t) => {
                  const who = t.assignee_id ? members.get(t.assignee_id) : null
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => open(t.number)} className="-mx-2 flex h-8 w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-hover">
                        <span className="min-w-0 flex-1 truncate text-fg">{t.title}</span>
                        <DueText due={t.due_date} />
                        {who && <Avatar id={who.id} name={displayName(who)} size="xs" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-medium text-fg-2">Who's carrying it</h3>
            {carrying.length === 0 ? (
              <p className="mt-2 text-sm text-fg-4">No open work assigned yet.</p>
            ) : (
              <ul className="mt-2.5 flex flex-col gap-2.5">
                {carrying.map(([uid, r]) => (
                  <li key={uid} className="grid grid-cols-[110px_minmax(0,1fr)_56px] items-center gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 text-fg-2">
                      <Avatar id={uid} name={displayName(members.get(uid))} size="xs" />
                      <span className="truncate">{displayName(members.get(uid))}</span>
                    </span>
                    <StackedBar
                      max={maxLoad}
                      height={6}
                      segments={[
                        { key: "p", label: "In progress", value: r.progress, color: "var(--status-in-progress)" },
                        { key: "r", label: "In review", value: r.review, color: "var(--status-in-review)" },
                        { key: "t", label: "Todo", value: r.todo, color: "var(--fg-4)" },
                      ]}
                    />
                    <span className="text-right tabular">
                      <span className="text-fg">{sum(r)}</span>
                      {r.late > 0 && <span className="text-danger"> · {r.late}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <TaskExplorer
        tasks={theirs}
        scopeKey={`project-${project.id}`}
        defaultView={project.default_view as ViewKind}
        showProject={false}
        createDefaults={{ project_id: project.id }}
        emptyTitle="No tasks in this project yet"
      />
      {canEdit && <ProjectForm open={editing} onClose={() => setEditing(false)} project={project} />}
    </>
  )
}

function sum(r: { progress: number; review: number; todo: number }) {
  return r.progress + r.review + r.todo
}
