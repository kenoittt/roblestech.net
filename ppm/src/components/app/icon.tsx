import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { cn } from "@/lib/utils"

export type { IconSvgElement }

/** Every icon in the app goes through here: one size, one stroke, one look. */
export function Icon({
  icon,
  size = 16,
  strokeWidth = 1.7,
  className,
}: {
  icon: IconSvgElement
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  )
}
