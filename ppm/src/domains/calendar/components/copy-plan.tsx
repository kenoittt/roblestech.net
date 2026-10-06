"use client"

import { useState } from "react"
import { ArrowDown01Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Icon } from "@/components/app/icon"
import { splitButton } from "@/components/app/split-button"
import { cn } from "@/lib/utils"
import { usePrefs } from "@/domains/workspace/prefs"
import { chipClass } from "@/domains/tasks/components/pickers"
import {
  DONE_STYLES,
  PLAN_DEFAULTS,
  copyPlanLines,
  planLines,
  type CopyPlanPrefs,
  type PlanEntry,
  type PlanLine,
} from "../plan-text"

const SHOW: { key: "heading" | "times" | "codes" | "due"; label: string }[] = [
  { key: "heading", label: "Title line" },
  { key: "times", label: "Times" },
  { key: "codes", label: "Task codes" },
  { key: "due", label: "Tasks due" },
]

const field =
  "w-full resize-none rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-brand"

/**
 * "Copy my plan", for the team's chat. One click copies it the way you like it;
 * the arrow is where you choose that way, with a preview of what you'll paste.
 */
export function CopyPlan({
  heading,
  entries,
  due,
  className,
}: {
  /** "Kyan's plan for Wednesday, 7 October". */
  heading: string
  entries: PlanEntry[]
  due: { title: string; code: string }[]
  className?: string
}) {
  const { prefs, setPrefs } = usePrefs()
  const saved = { ...PLAN_DEFAULTS, ...prefs.copyPlan }
  const [open, setOpen] = useState(false)
  // The two messages are kept here while you type, and saved when you leave the box.
  const [opening, setOpening] = useState(saved.opening)
  const [closing, setClosing] = useState(saved.closing)
  const split = splitButton("plain")

  const update = (patch: Partial<CopyPlanPrefs>) => setPrefs((p) => ({ ...p, copyPlan: { ...p.copyPlan, ...patch } }))
  const options = { ...saved, opening: open ? opening : saved.opening, closing: open ? closing : saved.closing }
  const lines = planLines({ heading, entries, due }, options)

  const copy = async () => {
    try {
      await copyPlanLines(lines)
      toast("Your plan is copied", {
        description: "Paste it in the group chat.",
        // Until someone has made it their own, point to where they can.
        action: open || prefs.copyPlan ? undefined : { label: "Change how it reads", onClick: () => openOptions(true) },
      })
    } catch {
      toast.error("Couldn't reach the clipboard. Try again.")
    }
  }

  const openOptions = (next: boolean) => {
    if (next) {
      setOpening(saved.opening)
      setClosing(saved.closing)
    } else if (opening !== saved.opening || closing !== saved.closing) {
      update({ opening, closing })
    }
    setOpen(next)
  }

  return (
    <div className={cn(split.group, className)}>
      <button type="button" onClick={copy} className={split.main}>
        <Icon icon={Copy01Icon} size={14} />
        <span className="hidden sm:inline">Copy my plan</span>
      </button>
      <span aria-hidden className={split.seam} />
      <Popover open={open} onOpenChange={openOptions}>
        <PopoverTrigger aria-label="Choose how your plan reads" className={split.arrow}>
          <Icon icon={ArrowDown01Icon} size={14} />
        </PopoverTrigger>
        <PopoverContent align="end" className="max-h-(--available-height) w-[22rem] gap-3 overflow-y-auto p-3">
          <div>
            <p className="text-sm font-medium text-fg">How your plan reads</p>
            <p className="text-xs text-fg-3">Saved for next time, on any computer.</p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-fg-2">Before the plan</span>
            <textarea
              rows={2}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              onBlur={() => opening !== saved.opening && update({ opening })}
              placeholder="Good morning, team"
              className={field}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">Show</span>
            <div className="flex flex-wrap gap-1.5">
              {SHOW.map((s) => {
                const on = options[s.key]
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ [s.key]: !on })}
                    className={cn(chipClass, on && "border-brand/50 text-fg")}
                  >
                    <span
                      aria-hidden
                      className={cn("flex size-3.5 items-center justify-center rounded-[4px] border", on ? "border-brand-solid bg-brand-solid" : "border-line-strong")}
                    >
                      {on && (
                        <svg viewBox="0 0 10 10" className="size-2.5 text-white">
                          <path d="M2 5.2 4 7.2 8 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">What's done</span>
            <div role="radiogroup" aria-label="What's done" className="flex gap-1 rounded-md bg-hover p-0.5">
              {DONE_STYLES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={options.done === d.value}
                  onClick={() => update({ done: d.value })}
                  className={cn(
                    "pressable h-7 flex-1 rounded-[5px] text-xs font-medium whitespace-nowrap",
                    options.done === d.value ? "bg-raised text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-3 hover:text-fg",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-fg-2">After the plan</span>
            <textarea
              rows={2}
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              onBlur={() => closing !== saved.closing && update({ closing })}
              placeholder="Shout if you need me"
              className={field}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-fg-2">What you'll paste</span>
            <Preview lines={lines} />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={copy}>
              Copy plan
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Preview({ lines }: { lines: PlanLine[] }) {
  return (
    <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-inset px-2.5 py-2 text-xs leading-5 text-fg-2">
      {lines.map((l, i) =>
        "text" in l ? (
          <p key={i} className="min-h-5 break-words whitespace-pre-wrap">
            {l.text}
          </p>
        ) : (
          <p key={i} className="break-words">
            {l.prefix}
            <span className={cn(l.struck && "line-through decoration-fg-3")}>{l.what}</span>
            {l.suffix}
          </p>
        ),
      )}
    </div>
  )
}
