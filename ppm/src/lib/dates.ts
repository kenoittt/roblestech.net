import { TIMEZONE } from "@/lib/env"

// Dates in the PPM are either calendar days ("2026-10-02", for due dates) or
// instants (ISO timestamps, for activity). Calendar days are compared as plain
// strings and day numbers, never through the browser's own timezone, so a due
// date means the same day in Manila whatever machine shows it.

const MS_DAY = 86_400_000

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** The calendar day of an instant, in Manila: "2026-10-02". */
export function isoDay(instant: Date | string | number = new Date()): string {
  return dayFormatter.format(new Date(instant))
}

/** Day number since 1970 for a "YYYY-MM-DD" string, for arithmetic. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / MS_DAY)
}

export function fromDayNumber(n: number): string {
  return new Date(n * MS_DAY).toISOString().slice(0, 10)
}

export function addDays(day: string, amount: number): string {
  return fromDayNumber(dayNumber(day) + amount)
}

export function diffDays(a: string, b: string): number {
  return dayNumber(a) - dayNumber(b)
}

/** 0 = Monday ... 6 = Sunday. */
export function weekday(day: string): number {
  return (dayNumber(day) + 3) % 7
}

export function startOfWeek(day: string): string {
  return addDays(day, -weekday(day))
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`
}

export function addMonths(day: string, amount: number): string {
  const [y, m] = day.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1 + amount, 1))
  return date.toISOString().slice(0, 10)
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function weekdayName(day: string, long = false) {
  return (long ? WEEKDAYS_LONG : WEEKDAYS)[weekday(day)]
}

export function monthName(day: string, long = false) {
  return (long ? MONTHS_LONG : MONTHS)[Number(day.slice(5, 7)) - 1]
}

/** "Oct 12", or "Oct 12, 2027" when it isn't this year. */
export function shortDate(day: string, today: string) {
  const label = `${monthName(day)} ${Number(day.slice(8, 10))}`
  return day.slice(0, 4) === today.slice(0, 4) ? label : `${label}, ${day.slice(0, 4)}`
}

/** "Friday, 2 October" */
export function longDate(day: string) {
  return `${weekdayName(day, true)}, ${Number(day.slice(8, 10))} ${monthName(day, true)}`
}

export type DueState = "overdue" | "today" | "soon" | "later" | "none"

export function dueState(due: string | null, today: string): DueState {
  if (!due) return "none"
  const diff = diffDays(due, today)
  if (diff < 0) return "overdue"
  if (diff === 0) return "today"
  if (diff <= 3) return "soon"
  return "later"
}

/** How a due date reads in a list: "Today", "Tomorrow", "Wed", "Oct 12", "3 days late". */
export function dueLabel(due: string, today: string): string {
  const diff = diffDays(due, today)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  if (diff > 1 && diff < 7) return weekdayName(due)
  return shortDate(due, today)
}

/** Short relative time, like Linear: "now", "5m", "3h", "2d", then a date. */
export function ago(instant: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(instant).getTime()) / 1000))
  if (seconds < 45) return "now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  return shortDate(isoDay(instant), isoDay(now))
}

/** Longer relative time for sentences: "5 minutes ago", "yesterday", "on Sep 30". */
export function agoLong(instant: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(instant).getTime()) / 1000))
  if (seconds < 45) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = diffDays(isoDay(now), isoDay(instant))
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return `on ${shortDate(isoDay(instant), isoDay(now))}`
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
})

/** "9:30 AM" in Manila. */
export function clockTime(instant: Date | string | number): string {
  return timeFormatter.format(new Date(instant))
}

/** "9 AM", "9:30 AM": drops ":00" for a quieter calendar. */
export function compactTime(instant: Date | string | number): string {
  return clockTime(instant).replace(":00", "")
}

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  hourCycle: "h23",
})

/** Minutes since midnight in Manila. */
export function minutesOfDay(instant: Date | string | number): number {
  const d = new Date(instant)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(d)
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0)
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  return h * 60 + m
}

export function greeting(now: number): string {
  const hour = Number(hourFormatter.format(new Date(now)))
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

/** Manila is UTC+8 all year (no daylight saving), so a day and a time make an instant. */
export function manilaInstant(day: string, minutes: number): string {
  const [y, m, d] = day.split("-").map(Number)
  const utc = Date.UTC(y, m - 1, d, 0, minutes) - 8 * 60 * 60 * 1000
  return new Date(utc).toISOString()
}
