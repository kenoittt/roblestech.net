"use client"

import { useCallback } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * The open task lives in the address (?task=12), so a task can be linked,
 * the back button closes it, and opening one never reloads the page: the URL
 * changes through the history API, which Next keeps in sync without a request.
 */
export function useTaskPanel() {
  const params = useSearchParams()
  const pathname = usePathname()
  const raw = params.get("task")
  const current = raw && /^\d+$/.test(raw) ? Number(raw) : null

  const open = useCallback(
    (number: number) => {
      const next = new URLSearchParams(window.location.search)
      next.set("task", String(number))
      window.history.pushState(null, "", `${pathname}?${next}`)
    },
    [pathname],
  )

  const close = useCallback(() => {
    const next = new URLSearchParams(window.location.search)
    next.delete("task")
    const qs = next.toString()
    window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

  return { current, open, close }
}
