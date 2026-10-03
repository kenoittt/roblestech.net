"use client"

import type { ReactNode } from "react"
import { Dialog as DrawerPrimitive } from "@base-ui/react/dialog"
import { Sidebar } from "./sidebar"
import { useUI } from "./ui-state"

/**
 * The frame: the sidebar sits on the canvas, and every page lives on one
 * raised sheet beside it. The sheet is the only container; nothing inside it
 * gets a second border box.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { navOpen, setNavOpen } = useUI()

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside className="hidden w-[244px] shrink-0 lg:flex">
        <Sidebar />
      </aside>

      {/* Small screens: the same sidebar, as a drawer. */}
      <DrawerPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/40 lg:hidden" />
          <DrawerPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] bg-canvas shadow-popover transition-transform duration-300 ease-drawer data-ending-style:-translate-x-full data-starting-style:-translate-x-full lg:hidden">
            <DrawerPrimitive.Title className="sr-only">Navigation</DrawerPrimitive.Title>
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>

      <main className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface lg:rounded-xl lg:shadow-sheet">
          {children}
        </div>
      </main>
    </div>
  )
}
