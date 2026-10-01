import { cn } from "@/lib/utils"

// Initials on a quiet tint, picked from the person's id so it never changes.
// Blues and slates only: colour in this app means status, not decoration.
const TINTS = [
  "bg-[#1f3b6e] text-[#c9dcff]",
  "bg-[#2a3350] text-[#c8d0f0]",
  "bg-[#173f4f] text-[#bfe6f2]",
  "bg-[#33305a] text-[#d6d2ff]",
  "bg-[#24384a] text-[#cfe0ee]",
  "bg-[#1d4a63] text-[#c4e4f7]",
]

function tintFor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return TINTS[Math.abs(hash) % TINTS.length]
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZES = {
  xs: "size-4 text-[7px]",
  sm: "size-5 text-[8.5px]",
  md: "size-6 text-[10px]",
  lg: "size-8 text-xs",
  xl: "size-10 text-sm",
  "2xl": "size-14 text-lg",
} as const

export function Avatar({
  id,
  name,
  size = "md",
  muted = false,
  className,
}: {
  id: string
  name: string
  size?: keyof typeof SIZES
  /** Deactivated people fade out but stay recognisable. */
  muted?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-[0.02em]",
        SIZES[size],
        tintFor(id),
        muted && "opacity-45 grayscale",
        className,
      )}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/** Overlapping avatars for a project's members; the rest become "+3". */
export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: { id: string; name: string }[]
  max?: number
  size?: keyof typeof SIZES
}) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className="flex items-center">
      {shown.map((p, i) => (
        <Avatar
          key={p.id}
          id={p.id}
          name={p.name}
          size={size}
          className={cn("ring-2 ring-surface", i > 0 && "-ml-1.5")}
        />
      ))}
      {rest > 0 && <span className="ml-1.5 text-xs text-fg-3 tabular">+{rest}</span>}
    </span>
  )
}
