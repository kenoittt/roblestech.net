"use client"

import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase/client"
import { isoDay } from "@/lib/dates"
import { AvatarPhotos } from "@/components/app/avatar"
import { TASK_COLUMNS, type Task } from "@/domains/tasks/config"
import {
  fetchMembers,
  fetchProjects,
  fetchTasks,
  type Bootstrap,
  type Member,
  type Project,
} from "./types"

type WorkspaceContext = { uid: string; serverNow: number }
const Ctx = createContext<WorkspaceContext | null>(null)

export function WorkspaceProvider({ bootstrap, children }: { bootstrap: Bootstrap; children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
      },
    })
    // The server already fetched these; the cache starts warm so nothing spins.
    client.setQueryData(["members"], bootstrap.members)
    client.setQueryData(["projects"], bootstrap.projects)
    client.setQueryData(["tasks"], bootstrap.tasks)
    return client
  })
  const value = useMemo(() => ({ uid: bootstrap.uid, serverNow: bootstrap.serverNow }), [bootstrap.uid, bootstrap.serverNow])

  return (
    <QueryClientProvider client={queryClient}>
      <Ctx value={value}>
        <LiveUpdates uid={bootstrap.uid} />
        <Photos>{children}</Photos>
      </Ctx>
    </QueryClientProvider>
  )
}

/** Everyone's photo address, rebuilt when someone changes theirs. */
function Photos({ children }: { children: ReactNode }) {
  const members = useMembers()
  const photos = useMemo(
    () =>
      new Map(
        members
          .filter((m) => m.avatar_url)
          .map((m) => [m.id, `/api/avatar/${m.id}?v=${encodeURIComponent(m.avatar_url!.split("?v=")[1] ?? "1")}`]),
      ),
    [members],
  )
  return <AvatarPhotos value={photos}>{children}</AvatarPhotos>
}

function useWorkspaceContext() {
  const ctx = use(Ctx)
  if (!ctx) throw new Error("WorkspaceProvider is missing.")
  return ctx
}

// ---------------------------------------------------------------------------
// Data hooks
// ---------------------------------------------------------------------------
export function useMembers() {
  return useQuery({ queryKey: ["members"], queryFn: () => fetchMembers(getSupabase()) }).data ?? []
}

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects(getSupabase()) }).data ?? []
}

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks(getSupabase()) }).data ?? []
}

export function useMe(): Member {
  const { uid } = useWorkspaceContext()
  const members = useMembers()
  const me = members.find((m) => m.id === uid)
  if (!me) throw new Error("Signed-in member not found.")
  return me
}

export function useUid() {
  return useWorkspaceContext().uid
}

/** Lookups by id, rebuilt only when the lists change. */
export function useMemberMap() {
  const members = useMembers()
  return useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
}

export function useProjectMap() {
  const projects = useProjects()
  return useMemo(() => new Map<string, Project>(projects.map((p) => [p.id, p])), [projects])
}

/**
 * "Now", starting from the server's clock so the first render matches the
 * server's HTML, then ticking every minute.
 */
export function useNow(intervalMs = 60_000) {
  const { serverNow } = useWorkspaceContext()
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function useToday() {
  return isoDay(useNow())
}

// ---------------------------------------------------------------------------
// Live updates: someone else's change lands in the cache without a refresh
// ---------------------------------------------------------------------------
function LiveUpdates({ uid }: { uid: string }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = getSupabase()
    let cancelled = false
    // Realtime checks the database rules as the signed-in person, so it needs
    // their token before joining; without it every change is filtered out.
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null)
    })
    const channel = supabase
      .channel("ppm-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ppm_tasks" }, (payload) => {
        queryClient.setQueryData<Task[]>(["tasks"], (old = []) => {
          if (payload.eventType === "DELETE") {
            const gone = (payload.old as { id?: string }).id
            return old.filter((t) => t.id !== gone)
          }
          const row = pick(payload.new as Record<string, unknown>)
          if (row.deleted_at) return old.filter((t) => t.id !== row.id)
          const i = old.findIndex((t) => t.id === row.id)
          if (i === -1) return [...old, row]
          // Ignore echoes of our own optimistic writes that are already newer.
          if (old[i].updated_at > row.updated_at) return old
          const next = old.slice()
          next[i] = row
          return next
        })
        const id = (payload.new as { id?: string })?.id
        if (id) queryClient.invalidateQueries({ queryKey: ["task", id] })
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ppm_notifications", filter: `user_id=eq.${uid}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "ppm_task_comments" }, (payload) => {
        const taskId = (payload.new as { task_id?: string })?.task_id
        if (taskId) queryClient.invalidateQueries({ queryKey: ["task", taskId] })
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cal_events" }, () =>
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      )
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      supabase.realtime.setAuth(data.session?.access_token ?? null)
      channel.subscribe()
    })
    return () => {
      cancelled = true
      auth.subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [queryClient, uid])

  return null
}

const TASK_FIELDS = TASK_COLUMNS.split(",")
function pick(row: Record<string, unknown>): Task {
  const out: Record<string, unknown> = {}
  for (const key of TASK_FIELDS) out[key] = row[key]
  return out as Task
}
