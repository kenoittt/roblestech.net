"use client"

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** How long a delete waits for its second press before it forgets the first. */
const FORGET_MS = 4000

/**
 * A delete that asks first, in place. The first press arms it: the button
 * turns red and says what the next press will do. The second press, within a
 * few seconds, does it; left alone, it goes back to how it was.
 *
 * For small things that can't be brought back: a calendar entry, a comment, a
 * file, a template. Bigger ones ask in a dialog that says exactly what goes
 * (a project, an article, a person's account).
 */
export function useConfirm(action: () => void) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), FORGET_MS)
    return () => clearTimeout(timer)
  }, [armed])

  return {
    armed,
    press: () => {
      if (!armed) return setArmed(true)
      setArmed(false)
      action()
    },
  }
}

/** How an armed delete looks, wherever it is. */
export const armedClass = "bg-danger-soft text-danger"

/**
 * A quiet delete inside a row: its usual face (an x, or a word), then the
 * answer in red once it's pressed ("Remove", "Yes, delete").
 */
export function ConfirmDelete({
  label,
  answer,
  onConfirm,
  className,
  children,
  ...props
}: {
  /** What it deletes, for screen readers: "Remove budget.pdf". */
  label: string
  /** What the button reads once armed. */
  answer: string
  onConfirm: () => void
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "aria-label">) {
  const del = useConfirm(onConfirm)
  return (
    <button
      type="button"
      {...props}
      aria-label={del.armed ? `Confirm: ${label}` : label}
      onClick={del.press}
      className={cn(className, del.armed && "text-xs font-medium text-danger opacity-100 hover:text-danger")}
    >
      {del.armed ? answer : children}
    </button>
  )
}
