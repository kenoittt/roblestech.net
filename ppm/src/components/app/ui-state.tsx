"use client"

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react"
import type { NewTask } from "@/domains/tasks/data"

// App-wide UI that any screen can open: the command menu, the new-task dialog,
// the shortcuts sheet and, on small screens, the navigation drawer.
type UIState = {
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
  createTask: { open: boolean; defaults: Partial<NewTask> }
  openCreateTask: (defaults?: Partial<NewTask>) => void
  closeCreateTask: () => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  navOpen: boolean
  setNavOpen: (open: boolean) => void
}

const Ctx = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [createTask, setCreateTask] = useState<UIState["createTask"]>({ open: false, defaults: {} })
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  const openCreateTask = useCallback((defaults: Partial<NewTask> = {}) => setCreateTask({ open: true, defaults }), [])
  const closeCreateTask = useCallback(() => setCreateTask((s) => ({ ...s, open: false })), [])

  const value = useMemo(
    () => ({
      commandOpen, setCommandOpen,
      createTask, openCreateTask, closeCreateTask,
      shortcutsOpen, setShortcutsOpen,
      navOpen, setNavOpen,
    }),
    [commandOpen, createTask, openCreateTask, closeCreateTask, shortcutsOpen, navOpen],
  )
  return <Ctx value={value}>{children}</Ctx>
}

export function useUI() {
  const ctx = use(Ctx)
  if (!ctx) throw new Error("UIProvider is missing.")
  return ctx
}
