// "Copy my plan": the day's plan as text to paste in the team's chat. Each
// person chooses how it reads (saved in their preferences); the preview and
// the clipboard both come from the lines built here, so they always match.

/** How someone likes their plan to read. Missing values mean the defaults below. */
export type CopyPlanPrefs = {
  /** Said before the plan: "Good morning, team". */
  opening?: string
  /** Said after it: "Shout if you need me". */
  closing?: string
  /** "Kyan's plan for Wednesday, 7 October". */
  heading?: boolean
  /** "9:00 AM to 10:00 AM:" before each entry. */
  times?: boolean
  /** "(RTC-12)" after an entry for a task. */
  codes?: boolean
  /** The tasks due that day, on a line of their own. */
  due?: boolean
  /** How finished entries show. */
  done?: DoneStyle
}

export type DoneStyle = "plain" | "strike" | "check" | "word"

export const DONE_STYLES: { value: DoneStyle; label: string }[] = [
  { value: "plain", label: "As is" },
  { value: "strike", label: "Strike out" },
  { value: "check", label: "Add ✓" },
  { value: "word", label: "Add DONE" },
]

export const PLAN_DEFAULTS: Required<CopyPlanPrefs> = {
  opening: "",
  closing: "",
  heading: true,
  times: true,
  codes: true,
  due: true,
  done: "plain",
}

export type PlanEntry = { times: string; title: string; code: string | null; done: boolean }

/** One line of the plan: plain words, or an entry whose finished part may be struck out. */
export type PlanLine = { text: string } | { prefix: string; what: string; struck: boolean; suffix: string }

export function planLines(
  input: { heading: string; entries: PlanEntry[]; due: { title: string; code: string }[] },
  prefs: CopyPlanPrefs = {},
): PlanLine[] {
  const p = { ...PLAN_DEFAULTS, ...prefs }
  const lines: PlanLine[] = []
  const words = (text: string) => text.split("\n").map((t) => ({ text: t.trimEnd() }))
  if (p.opening.trim()) lines.push(...words(p.opening.trim()))
  if (p.heading) lines.push({ text: input.heading })
  if (!input.entries.length) lines.push({ text: "Nothing blocked yet" })
  for (const e of input.entries) {
    const what = `${e.title}${p.codes && e.code ? ` (${e.code})` : ""}`
    lines.push({
      prefix: p.times ? `${e.times}: ` : "",
      what,
      struck: e.done && p.done === "strike",
      suffix: e.done && p.done === "check" ? " ✓" : e.done && p.done === "word" ? " DONE" : "",
    })
  }
  if (p.due && input.due.length) {
    lines.push({ text: "" }, { text: `Due: ${input.due.map((t) => `${t.title}${p.codes ? ` (${t.code})` : ""}`).join(", ")}` })
  }
  if (p.closing.trim()) lines.push({ text: "" }, ...words(p.closing.trim()))
  return lines
}

/** Plain text. A struck-out part uses the combining stroke, which most apps show as strikethrough. */
export function planText(lines: PlanLine[]) {
  return lines
    .map((l) => ("text" in l ? l.text : `${l.prefix}${l.struck ? [...l.what].map((c) => `${c}̶`).join("") : l.what}${l.suffix}`))
    .join("\n")
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Rich text for chats that take it (Teams does): line breaks, and a real strikethrough. */
export function planHtml(lines: PlanLine[]) {
  const body = lines
    .map((l) => ("text" in l ? escape(l.text) : `${escape(l.prefix)}${l.struck ? `<s>${escape(l.what)}</s>` : escape(l.what)}${escape(l.suffix)}`))
    .join("<br>")
  return `<div>${body}</div>`
}

/** Puts the plan on the clipboard as rich text and plain text, so each app takes what it reads best. */
export async function copyPlanLines(lines: PlanLine[]) {
  const text = planText(lines)
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([planHtml(lines)], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(text)
  }
}
