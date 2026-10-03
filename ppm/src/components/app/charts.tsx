"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

// Small, hand-drawn charts. No gradients, no 3D, no legends where a label will
// do: thin marks, a quiet track, and the number you need right next to it.

export type Bar = { key: string; label: string; value: number; highlight?: boolean; title?: string }

/** Vertical bars over time. The hovered bar shows its exact value. */
export function BarChart({
  bars,
  height = 120,
  className,
  format = (v: number) => String(v),
}: {
  bars: Bar[]
  height?: number
  className?: string
  format?: (v: number) => string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(1, ...bars.map((b) => b.value))
  const nice = Math.ceil(max / 2) * 2 || 2
  const hovered = bars.find((b) => b.key === hover)

  return (
    <div className={cn("relative", className)}>
      <div className="relative" style={{ height }}>
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-fg-4 tabular">{Math.round(nice * f)}</span>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-line-strong" />
        <div className="absolute inset-0 flex items-end gap-[3px] pr-6">
          {bars.map((b) => {
            const h = (b.value / nice) * 100
            return (
              <div
                key={b.key}
                className="group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(b.key)}
                onMouseLeave={() => setHover(null)}
                title={b.title}
              >
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-[height,background-color] duration-300 ease-out",
                    b.value === 0 && "min-h-px",
                    b.highlight ? "bg-brand" : hover === b.key ? "bg-[color-mix(in_oklab,var(--brand)_75%,transparent)]" : "bg-[color-mix(in_oklab,var(--brand)_42%,transparent)]",
                  )}
                  style={{ height: `${Math.max(h, b.value ? 3 : 0.5)}%` }}
                />
              </div>
            )
          })}
        </div>
        {hovered && (
          <div className="pointer-events-none absolute -top-7 left-0 right-6 flex justify-center">
            <span className="rounded-md bg-raised px-2 py-1 text-xs text-fg shadow-popover tabular">
              {hovered.title ?? hovered.label}: <span className="font-semibold">{format(hovered.value)}</span>
            </span>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex gap-[3px] pr-6">
        {bars.map((b, i) => (
          <span key={b.key} className={cn("flex-1 text-center text-[10px] tabular", b.highlight ? "font-medium text-fg-2" : "text-fg-4")}>
            {i % 2 === bars.length % 2 || b.highlight ? b.label : ""}
          </span>
        ))}
      </div>
    </div>
  )
}

export type Segment = { key: string; value: number; color: string; label: string }

/** One horizontal bar split into parts, with an optional marker line. */
export function StackedBar({
  segments,
  max,
  marker,
  height = 8,
  className,
}: {
  segments: Segment[]
  max: number
  marker?: number
  height?: number
  className?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <div className="absolute inset-0 rounded-[3px] bg-chart-track" />
      <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-[3px]" style={{ width: `${Math.min(100, (total / max) * 100)}%` }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.value}`}
              className="h-full border-r border-surface/70 last:border-r-0 transition-[flex-grow] duration-300 ease-out"
              style={{ flexGrow: s.value, background: s.color }}
            />
          ))}
      </div>
      {marker !== undefined && marker < max && (
        <div
          className="absolute -inset-y-1 w-px bg-fg-3/70"
          style={{ left: `${(marker / max) * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  )
}

/** A thin progress line. */
export function Progress({ value, color = "var(--status-done)", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-chart-track", className)}>
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  )
}

/** A small ring for a single share, like a project's progress. */
export function Ring({ value, size = 18, stroke = 2.5, color = "var(--status-done)" }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-track)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  )
}
