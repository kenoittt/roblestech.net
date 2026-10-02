"use client"

import type { ReactNode } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "./icon"

/** The app's small dialog: a title, a close button, and whatever goes inside. */
export function ModalShell({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup className="ui-dialog fixed top-[14vh] left-1/2 z-50 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl bg-raised shadow-popover outline-none">
          <div className="flex items-center justify-between px-5 pt-4">
            <DialogPrimitive.Title className="text-md font-semibold text-fg">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
