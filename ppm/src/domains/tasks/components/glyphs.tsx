import { cn } from "@/lib/utils"
import { STATUS_META, type Priority, type Status } from "../config"

// Drawn by hand rather than taken from an icon set: a status is a circle that
// fills as work moves forward, so the eye reads progress before the label.

export function StatusIcon({ status, size = 14, className }: { status: string; size?: number; className?: string }) {
  const s = (status in STATUS_META ? status : "todo") as Status
  const color = STATUS_META[s].color
  const r = 5.5
  const c = 7

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
      style={{ color }}
    >
      {s === "backlog" && (
        <circle cx={c} cy={c} r={r} stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 2.05" />
      )}
      {s === "todo" && <circle cx={c} cy={c} r={r} stroke="currentColor" strokeWidth="1.5" />}
      {(s === "in_progress" || s === "in_review") && (
        <>
          <circle cx={c} cy={c} r={r} stroke="currentColor" strokeWidth="1.5" />
          <path
            d={
              s === "in_progress"
                ? "M7 3.5 A3.5 3.5 0 0 1 7 10.5 Z"
                : "M7 3.5 A3.5 3.5 0 1 1 3.5 7 L7 7 Z"
            }
            fill="currentColor"
          />
        </>
      )}
      {s === "done" && (
        <>
          <circle cx={c} cy={c} r={6.25} fill="currentColor" />
          <path d="M4.4 7.2 6.2 9 9.7 5.3" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {s === "cancelled" && (
        <>
          <circle cx={c} cy={c} r={6.25} fill="currentColor" />
          <path d="M5 5 9 9M9 5 5 9" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/** Three bars that fill with priority; urgent is a filled square with a mark. */
export function PriorityIcon({ priority, size = 14, className }: { priority: string; size?: number; className?: string }) {
  const p = priority as Priority
  if (p === "urgent") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" className={cn("shrink-0", className)} aria-hidden>
        <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--priority-urgent)" />
        <path d="M7 3.8v4" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="10.1" r="0.95" fill="var(--surface)" />
      </svg>
    )
  }
  if (p === "none" || !p) {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" className={cn("shrink-0 text-fg-4", className)} aria-hidden>
        <path d="M2.5 7h1.6M6.2 7h1.6M9.9 7h1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  const level = p === "high" ? 3 : p === "medium" ? 2 : 1
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className={cn("shrink-0", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 3.6}
          y={9.5 - i * 3}
          width="2.4"
          height={3 + i * 3}
          rx="0.8"
          fill={i < level ? "var(--fg-2)" : "var(--fg-4)"}
          opacity={i < level ? 1 : 0.55}
        />
      ))}
    </svg>
  )
}

/** A project's colour, as a small rounded square (never a pill). */
export function ProjectSwatch({ color, size = 10, className }: { color: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-[3px]", className)}
      style={{ width: size, height: size, background: color ?? "var(--fg-4)" }}
    />
  )
}
