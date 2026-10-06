import { cn } from "@/lib/utils"

export type Swatch<T> = {
  value: T
  /** What a screen reader says, and the tooltip: "Teal". */
  label: string
  /** The colour as a token class (bg-cal-teal), or as a value for data colours (a project's). */
  className?: string
  color?: string
}

/**
 * A colour for something, chosen from a few swatches: one click, beside the
 * name it belongs to. Projects and time blocks both use it; each brings its
 * own colours.
 */
export function SwatchPicker<T extends string | null>({
  options,
  value,
  onChange,
  label = "Colour",
}: {
  options: Swatch<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
          className={cn(
            "size-5 rounded-[5px] ring-offset-2 ring-offset-raised transition-shadow",
            o.className,
            value === o.value ? "ring-2 ring-fg-2" : "hover:ring-2 hover:ring-line-strong",
          )}
          style={o.color ? { background: o.color } : undefined}
        />
      ))}
    </div>
  )
}
