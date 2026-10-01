"use client"

import { useSyncExternalStore } from "react"

const query = "(max-width: 767px)"

/** True on phone-width screens. False on the server, so the first render matches. */
export function useIsNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
