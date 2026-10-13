import { clockTime, compactTime, isoDay, manilaInstant, weekdayName } from "@/lib/dates"
import type { CalEvent } from "./data"

// The visible day runs all 24 hours: the team works at any hour, and a block
// can run past midnight. One hour is 56px: tall enough for a two-line entry at
// 30 minutes.
export const DAY_START = 0
export const DAY_END = 24 * 60
export const HOUR_PX = 56
export const PX_PER_MIN = HOUR_PX / 60
export const SNAP = 15
/** The shortest piece the calendar draws: a shorter entry still gets a block you can see and click. */
const MIN_MINUTES = SNAP
/** The space left under each entry, so two in a row read as two. */
const GAP_PX = 2
const MS_DAY = 86_400_000

export function minuteToY(minute: number) {
  return (Math.max(DAY_START, Math.min(DAY_END, minute)) - DAY_START) * PX_PER_MIN
}

export function yToMinute(y: number) {
  const raw = DAY_START + y / PX_PER_MIN
  return Math.max(DAY_START, Math.min(DAY_END, Math.round(raw / SNAP) * SNAP))
}

/**
 * The part of an entry that falls on one day, in minutes after that day's
 * midnight in Manila. An entry can run past midnight or over several days:
 * each day shows its own piece, and `before` and `after` say it carries on.
 */
export function spanOn(e: Pick<CalEvent, "starts_at" | "ends_at">, day: string) {
  const dayStart = Date.parse(manilaInstant(day, 0))
  const dayEnd = dayStart + MS_DAY
  const starts = Date.parse(e.starts_at)
  const ends = Date.parse(e.ends_at)
  if (ends <= dayStart || starts >= dayEnd) return null
  return {
    start: starts <= dayStart ? DAY_START : Math.round((starts - dayStart) / 60_000),
    end: ends >= dayEnd ? DAY_END : Math.round((ends - dayStart) / 60_000),
    before: starts < dayStart,
    after: ends > dayEnd,
  }
}

/** How many of an entry's minutes fall on this day. */
export function minutesOn(e: Pick<CalEvent, "starts_at" | "ends_at">, day: string) {
  const span = spanOn(e, day)
  return span ? span.end - span.start : 0
}

/** An entry's whole length, across days. */
export function entryMinutes(e: Pick<CalEvent, "starts_at" | "ends_at">) {
  return Math.round((Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60_000)
}

/**
 * "9:00 AM to 10:00 AM", "9:00 PM to 1:00 AM" overnight, "Mon 9:00 AM to Wed
 * 5:00 PM" over days. Compact drops ":00" for the calendar's narrow blocks.
 */
export function entryTimes(e: Pick<CalEvent, "starts_at" | "ends_at">, { compact = false } = {}) {
  const time = compact ? compactTime : clockTime
  const from = isoDay(e.starts_at)
  const to = isoDay(e.ends_at)
  const nights = Math.round((Date.parse(manilaInstant(to, 0)) - Date.parse(manilaInstant(from, 0))) / MS_DAY)
  // Ending at midnight, or early the next morning, reads naturally without days.
  if (nights === 0 || (nights === 1 && entryMinutes(e) < DAY_END)) return `${time(e.starts_at)} to ${time(e.ends_at)}`
  return `${weekdayName(from)} ${time(e.starts_at)} to ${weekdayName(to)} ${time(e.ends_at)}`
}

export type Placed = {
  event: CalEvent
  top: number
  height: number
  lane: number
  lanes: number
  /** Minutes after midnight on this day: the piece shown here. */
  start: number
  end: number
  /** It started on an earlier day, or carries on into the next. */
  before: boolean
  after: boolean
}

/** Entries that didn't fit side by side, gathered behind one "+3" in the last lane. */
export type Overflow = {
  key: string
  events: CalEvent[]
  top: number
  height: number
  lane: number
  lanes: number
}

/** The narrowest an entry gets before the rest of its group folds into "+N". */
export const MIN_LANE_PX = 60

/** How tall a piece is drawn: exactly its time, less the gap. Never more, or it would cover the next one. */
function pieceHeight(start: number, end: number) {
  return minuteToY(end) - minuteToY(start) - GAP_PX
}

/**
 * Lays out one column's entries. Overlapping entries share the width in
 * lanes, like any calendar; entries that don't overlap get the full width.
 * At most `maxLanes` sit side by side, so a column never turns into slivers:
 * past that, the last lane holds a "+N" for the entries that didn't fit
 * (an entry on its own there is simply shown).
 *
 * An entry is drawn in the time it's laid out in, and no taller: 15 minutes
 * is 12px, enough for one line. A floor above that once drew a 15-minute
 * block over the top of the next one.
 */
export function placeEvents(events: CalEvent[], day: string, maxLanes = Infinity): { placed: Placed[]; overflow: Overflow[] } {
  const items = events
    .filter((e) => !e.all_day)
    .flatMap((event) => {
      const span = spanOn(event, day)
      if (!span) return []
      // Shorter than 15 minutes still takes 15, kept inside the day at its very end.
      const end = Math.min(DAY_END, Math.max(span.start + MIN_MINUTES, span.end))
      return [{ event, ...span, start: Math.min(span.start, end - MIN_MINUTES), end }]
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const placed: Placed[] = []
  const overflow: Overflow[] = []
  type Item = (typeof items)[number] & { lane: number }
  let cluster: Item[] = []
  let clusterEnd = -1

  const place = (c: Item, lane: number, lanes: number) => {
    placed.push({
      event: c.event,
      start: c.start,
      end: c.end,
      before: c.before,
      after: c.after,
      top: minuteToY(c.start),
      height: pieceHeight(c.start, c.end),
      lane,
      lanes,
    })
  }

  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    const cap = Math.max(2, maxLanes)
    if (lanes <= cap) {
      for (const c of cluster) place(c, c.lane, lanes)
    } else {
      // Show the first lanes as they are; fold the rest into the last one,
      // one "+N" for each stretch of time where they overlap.
      const last = cap - 1
      const hidden = cluster.filter((c) => c.lane >= last)
      for (const c of cluster) if (c.lane < last) place(c, c.lane, cap)
      let group: Item[] = []
      let groupEnd = -1
      const close = () => {
        if (group.length === 1) place(group[0], last, cap)
        else if (group.length > 1) {
          const start = Math.min(...group.map((g) => g.start))
          const end = Math.max(...group.map((g) => g.end))
          overflow.push({
            key: group.map((g) => g.event.id).join(","),
            events: group.map((g) => g.event),
            top: minuteToY(start),
            height: pieceHeight(start, end),
            lane: last,
            lanes: cap,
          })
        }
        group = []
      }
      for (const h of hidden) {
        if (group.length && h.start >= groupEnd) close()
        group.push(h)
        groupEnd = Math.max(group.length > 1 ? groupEnd : -1, h.end)
      }
      close()
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
  return { placed, overflow }
}

export function formatMinute(minute: number) {
  const h = Math.floor(minute / 60) % 24
  const m = minute % 60
  const suffix = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`
}

export function durationLabel(minutes: number) {
  const d = Math.floor(minutes / DAY_END)
  const h = Math.floor((minutes % DAY_END) / 60)
  const m = minutes % 60
  if (d) return h ? `${d}d ${h}h` : `${d}d`
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}
