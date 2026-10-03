"use client"

import { useCallback, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase/client"
import { useMe } from "./provider"
import type { Member, Prefs } from "./types"

/**
 * Personal preferences (each view's layout, grouping, and so on), saved to the
 * person's profile so they follow them to any computer. The screen updates at
 * once and the save goes straight out, so leaving the page never loses it.
 */
export function usePrefs() {
  const me = useMe()
  const qc = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefs = (me.prefs ?? {}) as Prefs

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const setPrefs = useCallback(
    (update: (p: Prefs) => Prefs) => {
      let next: Prefs = {}
      qc.setQueryData<Member[]>(["members"], (old) =>
        old?.map((m) => {
          if (m.id !== me.id) return m
          next = update((m.prefs ?? {}) as Prefs)
          return { ...m, prefs: next as Member["prefs"] }
        }),
      )
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        getSupabase().from("profiles").update({ prefs: next as Member["prefs"] }).eq("id", me.id).then(() => {})
      }, 0)
    },
    [qc, me.id],
  )

  return { prefs, setPrefs }
}
