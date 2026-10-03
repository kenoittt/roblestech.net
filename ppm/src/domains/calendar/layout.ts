import { isoDay, minutesOfDay } from "@/lib/dates"
import type { CalEvent } from "./data"

// The visible day runs 7 AM to 10 PM; earlier and later entries are clamped
// to the edges. One hour is 56px: tall enough for a two-line entry at 30 minutes.
export const DAY_START = 7 * 60
export const DAY_END = 22 * 60
export const HOUR_PX = 56
export const PX_PER_MIN = HOUR_PX / 60
export const SNAP = 15

export function minuteToY(minute: number) {
  return (Math.max(DAY_START, Math.min(DAY_END, minute)) - DAY_START) * PX_PER_MIN
}

export function yToMinute(y: number) {
  const raw = DAY_START + y / PX_PER_MIN
  return Math.max(DAY_START, Math.min(DAY_END, Math.round(raw / SNAP) * SNAP))
}

export type Placed = { event: CalEvent; top: number; height: number; lane: number; lanes: number; start: number; end: number }

/**
 * Lays out one column's entries. Overlapping entries share the width in
 * lanes, like any calendar; entries that don't overlap get the full width.
 */
export function placeEvents(events: CalEvent[], day: string): Placed[] {
  const items = events
    .filter((e) => !e.all_day && isoDay(e.starts_at) === day)
    .map((event) => {
      const start = minutesOfDay(event.starts_at)
      const sameDay = isoDay(event.ends_at) === day
      const end = sameDay ? Math.max(start + 15, minutesOfDay(event.ends_at)) : DAY_END
      return { event, start, end }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const placed: Placed[] = []
  let cluster: (typeof items[number] & { lane: number })[] = []
  let clusterEnd = -1

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    for (const c of cluster) {
      const top = minuteToY(c.start)
      placed.push({
        event: c.event,
        start: c.start,
        end: c.end,
        top,
        height: Math.max(20, minuteToY(c.end) - top - 2),
        lane: c.lane,
        lanes,
      })
    }
    cluster = []
  }

  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    const used = new Set(cluster.filter((c) => c.end > item.start).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ ...item, lane })
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  if (cluster.length) flush()
  return placed
}

export function formatMinute(minute: number) {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  const suffix = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`
}

export function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}
