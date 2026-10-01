"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "./icon"
import { Kbd } from "./page"
import { useUI } from "./ui-state"

const GO: Record<string, string> = {
  h: "/",
  i: "/inbox",
  m: "/my-tasks",
  t: "/tasks",
  c: "/calendar",
  p: "/projects",
  e: "/people",
  b: "/handbook",
}

const LIST: { keys: string[]; does: string }[] = [
  { keys: ["⌘", "K"], does: "Search, or run any command" },
  { keys: ["C"], does: "Create a task" },
  { keys: ["G", "H"], does: "Go home" },
  { keys: ["G", "I"], does: "Go to the inbox" },
  { keys: ["G", "M"], does: "Go to my tasks" },
  { keys: ["G", "T"], does: "Go to all tasks" },
  { keys: ["G", "C"], does: "Go to the calendar" },
  { keys: ["G", "P"], does: "Go to projects" },
  { keys: ["G", "E"], does: "Go to people" },
  { keys: ["G", "B"], does: "Go to the handbook" },
  { keys: ["J", "K"], does: "Move down and up a list" },
  { keys: ["Enter"], does: "Open the selected task" },
  { keys: ["X"], does: "Select the task, for changing several at once" },
  { keys: ["I"], does: "Assign the selected task to yourself" },
  { keys: ["Esc"], does: "Close the panel or clear the selection" },
  { keys: ["⌘", "Enter"], does: "Save: create a task, post a comment" },
]

/** App-wide keys. None of them fire while you're typing. */
export function Shortcuts() {
  const router = useRouter()
  const { setCommandOpen, openCreateTask, shortcutsOpen, setShortcutsOpen } = useUI()
  const pendingG = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCommandOpen(true)
        return
      }
      const target = e.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=menu], [role=listbox]")) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (pendingG.current && GO[e.key.toLowerCase()]) {
        e.preventDefault()
        window.clearTimeout(pendingG.current)
        pendingG.current = null
        router.push(GO[e.key.toLowerCase()])
        return
      }
      if (e.key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200)
        return
      }
      if (e.key === "c") {
        e.preventDefault()
        openCreateTask()
      } else if (e.key === "?") {
        setShortcutsOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, setCommandOpen, openCreateTask, setShortcutsOpen])

  return (
    <DialogPrimitive.Root open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup className="ui-dialog fixed top-[12vh] left-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl bg-raised shadow-popover outline-none">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <DialogPrimitive.Title className="text-md font-semibold text-fg">Keyboard shortcuts</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>
          <ul className="px-5 pb-5">
            {LIST.map((row) => (
              <li key={row.does} className="flex items-center justify-between gap-4 border-b border-line/60 py-2 text-sm text-fg-2 last:border-0">
                {row.does}
                <span className="flex shrink-0 gap-1">
                  {row.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
