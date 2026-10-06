import type { ComponentProps } from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/app/icon"
import { cn } from "@/lib/utils"

// Form fields, defined once: every text field and select in a form looks the
// same, and changing one line here changes all of them.

/** A form's text field. */
export const fieldClass =
  "h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-brand"

const SELECT = {
  field: {
    select: "h-9 w-full rounded-md border border-line-strong bg-surface pr-9 pl-3 text-sm text-fg transition-colors focus:border-brand",
    arrow: "right-3",
    size: 14,
  },
  compact: {
    select: "h-7 rounded-md border border-line bg-surface pr-7 pl-2 text-xs text-fg focus:border-line-strong",
    arrow: "right-2",
    size: 12,
  },
} as const

/**
 * A choice from a short list, as a native select: phones keep their own
 * pickers and the keyboard works as everywhere else. The browser's arrow sits
 * hard against the edge (on a Mac especially), so it's replaced by the app's,
 * inset like every other control's icon.
 */
export function NativeSelect({
  className,
  variant = "field",
  ...props
}: ComponentProps<"select"> & {
  /** field: a form's full-width select. compact: a small one in a popover or toolbar. */
  variant?: keyof typeof SELECT
}) {
  const look = SELECT[variant]
  return (
    <span className={cn("relative flex", variant === "field" && "w-full")}>
      <select className={cn("cursor-default appearance-none outline-none", look.select, className)} {...props} />
      <Icon
        icon={ArrowDown01Icon}
        size={look.size}
        className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-3", look.arrow)}
      />
    </span>
  )
}
