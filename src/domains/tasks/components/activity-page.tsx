"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity01Icon } from "@hugeicons/core-free-icons"
import { Avatar } from "@/components/app/avatar"
import { EmptyState, PageBody, PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { addDays, clockTime, diffDays, isoDay, longDate, manilaInstant } from "@/lib/dates"
import { getSupabase } from "@/lib/supabase/client"
import { useMemberMap, useProjectMap, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName } from "@/domains/workspace/types"
import { taskKey } from "../config"
import type { TaskEvent } from "../data"
import { useTaskPanel } from "../panel-state"
import { PickerMenu, usePeopleOptions, useProjectOptions } from "./pickers"
import { ProjectSwatch } from "./glyphs"
import { describeEvent } from "./history"

const KINDS = [
  { key: "all", label: "Everything", types: null },
  { key: "status", label: "Status changes", types: ["status_changed"] },
  { key: "assign", label: "Assignments", types: ["assigned"] },
  { key: "new", label: "New tasks", types: ["created"] },
  { key: "comments", label: "Comments", types: ["commented"] },
] as const

const RANGES = [
  { key: 1, label: "Today" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
] as const

/** Everything that happened to the team's tasks, newest first, filterable. */
export function ActivityPage() {
  const today = useToday()
  const members = useMemberMap()
  const projects = useProjectMap()
  const tasks = useTasks()
  const { open } = useTaskPanel()
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("all")
  const [range, setRange] = useState<number>(7)
  const [person, setPerson] = useState<string>("anyone")
  const [project, setProject] = useState<string>("any")
  const people = usePeopleOptions({ noneLabel: "Anyone" }).map((o) => (o.value === "none" ? { ...o, value: "anyone" } : o))
  const projectOptions = useProjectOptions().map((o) => (o.value === "none" ? { ...o, value: "any", label: "Any project" } : o))

  const since = manilaInstant(addDays(today, -(range - 1)), 0)
  const types = KINDS.find((k) => k.key === kind)?.types

  const { data = [], isLoading } = useQuery({
    queryKey: ["activity", kind, range, person],
    queryFn: async () => {
      let q = getSupabase()
        .from("ppm_task_events")
        .select("id,task_id,actor_id,type,from_status,to_status,meta,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(400)
      if (types) q = q.in("type", types as unknown as string[])
      if (person !== "anyone") q = q.eq("actor_id", person)
      const { data, error } = await q
      if (error) throw error
      return data as TaskEvent[]
    },
  })

  const byTask = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const rows = data.filter((e) => {
    const t = e.task_id ? byTask.get(e.task_id) : null
    if (!t) return false
    return project === "any" || t.project_id === project
  })

  const days = useMemo(() => {
    const out: { day: string; items: TaskEvent[] }[] = []
    for (const e of rows) {
      const day = isoDay(e.created_at)
      const last = out.at(-1)
      if (last?.day === day) last.items.push(e)
      else out.push({ day, items: [e] })
    }
    return out
  }, [rows])

  const chosenPerson = people.find((p) => p.value === person)
  const chosenProject = projectOptions.find((p) => p.value === project)
  const chip = "pressable inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg data-popup-open:bg-hover"

  return (
    <>
      <PageHeader title="Activity" icon={Activity01Icon}>
        <span className="text-xs text-fg-3 tabular">{rows.length} events</span>
      </PageHeader>
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-1.5 sm:px-4">
        <div className="flex items-center gap-0.5">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={cn(
                "pressable inline-flex h-7 items-center rounded-md px-2 text-xs font-medium",
                kind === k.key ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <span className="h-4 w-px bg-line" />
        <PickerMenu triggerLabel="Who" triggerClassName={chip} trigger={<>{chosenPerson?.icon}{chosenPerson?.label ?? "Anyone"}</>}
          options={people} value={person} placeholder="Who did it…" width="w-80" onSelect={setPerson} />
        <PickerMenu triggerLabel="Project" triggerClassName={chip} trigger={<>{chosenProject?.icon}{chosenProject?.label ?? "Any project"}</>}
          options={projectOptions} value={project} placeholder="Which project…" onSelect={setProject} />
        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-hover p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "pressable h-6 rounded-[5px] px-2 text-xs font-medium",
                range === r.key ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <PageBody>
        {!isLoading && rows.length === 0 ? (
          <EmptyState icon={Activity01Icon} title="Nothing happened here" description="Try a longer time range, or clear the filters." />
        ) : (
          <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6">
            {days.map(({ day, items }) => (
              <section key={day} className="mb-7">
                <h2 className="mb-1.5 px-2 text-xs font-medium text-fg-3">
                  {diffDays(today, day) === 0 ? "Today" : diffDays(today, day) === 1 ? "Yesterday" : longDate(day)}
                </h2>
                <ul>
                  {items.map((e) => {
                    const t = byTask.get(e.task_id!)!
                    const actor = members.get(e.actor_id ?? "")
                    const p = t.project_id ? projects.get(t.project_id) : null
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => open(t.number)}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-hover"
                        >
                          <span className="w-16 shrink-0 text-xs text-fg-4 tabular">{clockTime(e.created_at)}</span>
                          <Avatar id={actor?.id ?? "x"} name={displayName(actor)} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm text-fg-3">
                            <span className="font-medium text-fg-2">{displayName(actor)}</span>{" "}
                            {describeEvent(e, members, projects)}
                            <span className="text-fg-4"> · </span>
                            <span className="text-fg">{t.title}</span>
                          </span>
                          {p && (
                            <span className="hidden shrink-0 items-center gap-1.5 text-xs text-fg-3 md:flex">
                              <ProjectSwatch color={p.color} size={8} />
                              {p.name}
                            </span>
                          )}
                          <span className="w-14 shrink-0 text-right font-mono text-xs text-fg-4">{taskKey(t)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
