"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase/client"
import { useUid } from "@/domains/workspace/provider"
import { explain } from "@/domains/tasks/data"

/** A calendar entry as the team view returns it: masked where its owner chose privacy. */
export type CalEvent = {
  id: string
  owner_id: string
  kind: "block" | "meeting"
  title: string
  notes: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  task_id: string | null
  visibility: "public" | "busy" | "private"
  auto_complete: boolean
  completed_at: string | null
  location: string | null
  /** True when you're seeing only that the person is busy. */
  masked: boolean
  attendee_ids: string[]
}

export type PrivacyRange = { id: string; user_id: string; starts_on: string; ends_on: string; mode: "busy" | "private" }

/** Done means ticked, or set to tick itself and its time has passed. */
export function isEventDone(e: CalEvent, now: number) {
  return Boolean(e.completed_at) || (e.auto_complete && new Date(e.ends_at).getTime() <= now)
}

export function useCalendar(rangeStart: string, rangeEnd: string) {
  return useQuery({
    queryKey: ["calendar", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc("cal_team_events", {
        range_start: rangeStart,
        range_end: rangeEnd,
      })
      if (error) throw error
      return (data ?? []) as CalEvent[]
    },
  })
}

export function usePrivacyRanges() {
  const uid = useUid()
  return useQuery({
    queryKey: ["calendar", "privacy", uid],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("cal_privacy_ranges")
        .select("id,user_id,starts_on,ends_on,mode")
        .eq("user_id", uid)
        .order("starts_on")
      if (error) throw error
      return (data ?? []) as PrivacyRange[]
    },
  })
}

export type NewEvent = {
  kind: "block" | "meeting"
  title: string
  notes?: string | null
  starts_at: string
  ends_at: string
  task_id?: string | null
  visibility: "public" | "busy" | "private"
  auto_complete: boolean
  attendees?: string[]
}

export function useCalendarActions() {
  const qc = useQueryClient()
  const uid = useUid()
  const refresh = () => qc.invalidateQueries({ queryKey: ["calendar"] })

  const create = useMutation({
    mutationFn: async (input: NewEvent) => {
      const supabase = getSupabase()
      const { attendees = [], ...row } = input
      const { data, error } = await supabase
        .from("cal_events")
        .insert({ ...row, owner_id: uid })
        .select("id")
        .single()
      if (error) throw error
      const others = attendees.filter((a) => a !== uid)
      if (input.kind === "meeting") {
        const { error: aErr } = await supabase
          .from("cal_event_attendees")
          .insert([uid, ...others].map((user_id) => ({ event_id: data.id, user_id })))
        if (aErr) throw aErr
      }
      return data.id as string
    },
    onSuccess: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<NewEvent, "attendees">> & { completed_at?: string | null } }) => {
      const { error } = await getSupabase().from("cal_events").update(patch).eq("id", id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["calendar"] })
      qc.setQueriesData<CalEvent[]>({ queryKey: ["calendar"] }, (old) =>
        Array.isArray(old) ? old.map((e) => (e.id === id ? ({ ...e, ...patch } as CalEvent) : e)) : old,
      )
    },
    onSettled: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("cal_events").delete().eq("id", id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["calendar"] })
      qc.setQueriesData<CalEvent[]>({ queryKey: ["calendar"] }, (old) =>
        Array.isArray(old) ? old.filter((e) => e.id !== id) : old,
      )
    },
    onSettled: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  const setRange = useMutation({
    mutationFn: async ({ startsOn, endsOn, mode }: { startsOn: string; endsOn: string; mode: "busy" | "private" | "public" }) => {
      const supabase = getSupabase()
      // Replace whatever covered these days with the new choice.
      const { error: dErr } = await supabase
        .from("cal_privacy_ranges")
        .delete()
        .eq("user_id", uid)
        .lte("starts_on", endsOn)
        .gte("ends_on", startsOn)
      if (dErr) throw dErr
      if (mode !== "public") {
        const { error } = await supabase
          .from("cal_privacy_ranges")
          .insert({ user_id: uid, starts_on: startsOn, ends_on: endsOn, mode })
        if (error) throw error
      }
    },
    onSuccess: refresh,
    onError: (e) => toast.error(explain(e)),
  })

  return { create, update, remove, setRange }
}
