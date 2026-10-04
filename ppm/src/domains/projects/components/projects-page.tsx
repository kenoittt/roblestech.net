"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Add01Icon, Folder02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { AvatarStack } from "@/components/app/avatar"
import { Progress } from "@/components/app/charts"
import { Icon } from "@/components/app/icon"
import { EmptyState, PageBody, PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { diffDays, shortDate } from "@/lib/dates"
import { useMemberMap, useProjects, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import { HEALTH_META, projectStats } from "@/domains/tasks/selectors"
import { ProjectSwatch } from "@/domains/tasks/components/glyphs"
import { PROJECT_STATUSES, PROJECT_STATUS_META, type ProjectStatus } from "../data"
import { ProjectForm } from "./project-form"
import { ProjectMenu } from "./project-menu"

type Tab = ProjectStatus | "all" | "archived"

/** The portfolio: every project, its health, its progress and who's on it. */
export function ProjectsPage() {
  const projects = useProjects()
  const tasks = useTasks()
  const members = useMemberMap()
  const today = useToday()
  const [tab, setTab] = useState<Tab>("active")
  const [creating, setCreating] = useState(false)

  // Archived projects live in their own tab; every other tab leaves them out.
  const rows = useMemo(
    () =>
      projects
        .filter((p) => (tab === "archived" ? p.archived : !p.archived && (tab === "all" || p.status === tab)))
        .map((p) => ({ p, s: projectStats(p, tasks, today) }))
        .sort((a, b) => a.p.name.localeCompare(b.p.name)),
    [projects, tasks, today, tab],
  )
  const counts = useMemo(() => {
    const live = projects.filter((p) => !p.archived)
    const c: Record<string, number> = { all: live.length, archived: projects.length - live.length }
    for (const s of PROJECT_STATUSES) c[s] = live.filter((p) => p.status === s).length
    return c
  }, [projects])

  return (
    <>
      <PageHeader
        title="Projects"
        icon={Folder02Icon}
        actions={
          <Button size="sm" onClick={() => setCreating(true)} className="h-7 gap-1.5 px-2.5">
            <Icon icon={Add01Icon} size={14} />
            New project
          </Button>
        }
      />
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-3 sm:px-4">
        {(["active", "planned", "paused", "closed", "all", "archived"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium",
              tab === t ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
            )}
          >
            {t === "all" ? "All" : t === "archived" ? "Archived" : PROJECT_STATUS_META[t].label}
            <span className="text-fg-3 tabular">{counts[t]}</span>
          </button>
        ))}
      </div>
      <PageBody>
        {rows.length === 0 ? (
          <EmptyState
            icon={Folder02Icon}
            title={tab === "archived" ? "Nothing is archived" : "No projects here"}
            description={
              tab === "archived"
                ? "Archive a project from its ⋯ menu to hide it everywhere without losing anything."
                : "Projects group tasks for a client or an internal goal."
            }
          />
        ) : (
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="h-9 border-b border-line text-left text-xs text-fg-3">
                <th className="pl-4 font-normal sm:pl-6">Project</th>
                <th className="w-28 font-normal">Health</th>
                <th className="w-48 font-normal">Progress</th>
                <th className="w-24 font-normal">Open</th>
                <th className="w-20 font-normal">Late</th>
                <th className="w-40 font-normal">Owner</th>
                <th className="w-32 font-normal">Members</th>
                <th className="w-28 font-normal">Ends</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s }) => {
                const owner = p.owner_id ? members.get(p.owner_id) : null
                const daysLeft = p.target_date ? diffDays(p.target_date, today) : null
                return (
                  <tr key={p.id} className="group h-14 border-b border-line/60 hover:bg-hover">
                    <td className="pl-4 sm:pl-6">
                      <Link href={`/projects/${p.id}`} className="flex min-w-0 items-center gap-3">
                        <ProjectSwatch color={p.color} size={10} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">{p.name}</span>
                          <span className="block truncate text-xs text-fg-3">
                            {p.kind === "client" ? `Client · ${p.client_name ?? "Unnamed"}` : "Internal"}
                            {p.status !== "active" && ` · ${PROJECT_STATUS_META[p.status as ProjectStatus].label}`}
                            {p.archived && " · Archived"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: HEALTH_META[s.health].color }}>
                        <span className="size-1.5 rounded-full" style={{ background: HEALTH_META[s.health].color }} />
                        {p.status === "closed" ? <span className="text-fg-3">Closed</span> : HEALTH_META[s.health].label}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2.5 pr-6">
                        <Progress value={s.progress} />
                        <span className="w-14 shrink-0 text-xs text-fg-3 tabular">
                          {s.done}/{s.total}
                        </span>
                      </span>
                    </td>
                    <td className="text-xs text-fg-2 tabular">{s.open}</td>
                    <td className={cn("text-xs tabular", s.overdue ? "text-danger" : "text-fg-4")}>{s.overdue || "—"}</td>
                    <td className="text-xs text-fg-2">{owner ? displayName(owner) : "—"}</td>
                    <td>
                      <AvatarStack people={p.members.map((m) => ({ id: m.user_id, name: displayName(members.get(m.user_id)) }))} />
                    </td>
                    <td className="text-xs tabular">
                      {p.target_date ? (
                        <span className={cn(daysLeft !== null && daysLeft < 0 && p.status !== "closed" ? "text-danger" : "text-fg-2")}>
                          {shortDate(p.target_date, today)}
                        </span>
                      ) : (
                        <span className="text-fg-4">Ongoing</span>
                      )}
                    </td>
                    <td className="pr-3">
                      <ProjectMenu
                        project={p}
                        triggerClassName="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </PageBody>
      <ProjectForm open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
