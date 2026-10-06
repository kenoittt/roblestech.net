"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase/client"
import { useUid } from "@/domains/workspace/provider"
import { explain } from "@/domains/tasks/data"
import { nudgeDelivery } from "@/domains/inbox/deliver"

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
  /** A block's colour, by name; empty is the usual blue. Hidden when masked. */
  color: BlockColor | null
}

export type BlockColor = "teal" | "purple" | "pink" | "slate"

/**
 * The colours a block can have, with what each looks like. Mirrors the check
 * on cal_events.color. The shades are tokens, so each theme draws its own.
 */
export const BLOCK_COLORS: { value: BlockColor | null; label: string; swatch: string; tone: string; bar: string }[] = [
  { value: null, label: "Blue", swatch: "bg-brand", tone: "border-brand/70 bg-[color-mix(in_oklab,var(--brand)_14%,var(--surface))]", bar: "bg-brand" },
  { value: "teal", label: "Teal", swatch: "bg-cal-teal", tone: "border-cal-teal/70 bg-[color-mix(in_oklab,var(--cal-teal)_14%,var(--surface))]", bar: "bg-cal-teal" },
  { value: "purple", label: "Purple", swatch: "bg-cal-purple", tone: "border-cal-purple/70 bg-[color-mix(in_oklab,var(--cal-purple)_14%,var(--surface))]", bar: "bg-cal-purple" },
  { value: "pink", label: "Pink", swatch: "bg-cal-pink", tone: "border-cal-pink/70 bg-[color-mix(in_oklab,var(--cal-pink)_14%,var(--surface))]", bar: "bg-cal-pink" },
  { value: "slate", label: "Slate", swatch: "bg-cal-slate", tone: "border-cal-slate/70 bg-[color-mix(in_oklab,var(--cal-slate)_14%,var(--surface))]", bar: "bg-cal-slate" },
]

export function blockColor(color: string | null | undefined) {
  return BLOCK_COLORS.find((c) => c.value === (color ?? null)) ?? BLOCK_COLORS[0]
}

/**
 * Colours came with a database update (20261007000200). Until it's on a
 * database, a block saved with a colour is saved without one, and says so.
 */
function colourMissing(error: unknown) {
  const e = error as { code?: string; message?: string } | null
  return e?.code === "PGRST204" && Boolean(e.message?.includes("'color'"))
}

export async function withoutMissingColour<R extends { color?: string | null }, T>(row: R, write: (row: R) => Promise<T>): Promise<T> {
  try {
    return await write(row)
  } catch (error) {
    if (!("color" in row) || !colourMissing(error)) throw error
    const rest = { ...row }
    delete rest.color
    toast("Saved without its colour", { description: "Colours need a database update first. Let an admin know." })
    return write(rest)
  }
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
  color?: BlockColor | null
}

export function useCalendarActions() {
  const qc = useQueryClient()
  const uid = useUid()
  const refresh = () => qc.invalidateQueries({ queryKey: ["calendar"] })

  const create = useMutation({
    mutationFn: async (input: NewEvent) => {
      const supabase = getSupabase()
      const { attendees = [], ...row } = input
      const data = await withoutMissingColour(row, async (r) => {
        const { data, error } = await supabase
          .from("cal_events")
          .insert({ ...r, owner_id: uid })
          .select("id")
          .single()
        if (error) throw error
        return data
      })
      const others = attendees.filter((a) => a !== uid)
      if (input.kind === "meeting") {
        const { error: aErr } = await supabase
          .from("cal_event_attendees")
          .insert([uid, ...others].map((user_id) => ({ event_id: data.id, user_id })))
        if (aErr) throw aErr
      }
      return data.id as string
    },
    onSuccess: () => {
      refresh()
      nudgeDelivery()
    },
    onError: (e) => toast.error(explain(e)),
  })

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<NewEvent, "attendees">> & { completed_at?: string | null } }) => {
      await withoutMissingColour(patch, async (p) => {
        const { error } = await getSupabase().from("cal_events").update(p).eq("id", id)
        if (error) throw error
      })
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
