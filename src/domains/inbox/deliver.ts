"use client"

import { deliverNotifications } from "./actions"

let timer: ReturnType<typeof setTimeout> | null = null

/**
 * After a change that can notify someone, ask the server to email what's
 * waiting. Quick bursts (a bulk edit, a few clicks) become one request.
 */
export function nudgeDelivery() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    deliverNotifications().catch(() => {})
  }, 400)
}
