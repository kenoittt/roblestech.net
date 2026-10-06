import { cn } from "@/lib/utils"

// A main action with its variants behind an arrow: one button with two
// parts, not two buttons side by side. The outer shape, height and 1px clear
// edge match a small Button, so it lines up with the app's other actions;
// each part lights up on its own, with one hairline between them.

type Tone = "primary" | "plain"

const GROUP: Record<Tone, string> = {
  primary: "border-transparent bg-brand-solid bg-clip-padding text-white",
  plain: "border-line text-fg-2",
}

const PART: Record<Tone, string> = {
  primary: "hover:bg-brand-solid-hover data-popup-open:bg-brand-solid-hover",
  plain: "hover:bg-hover hover:text-fg data-popup-open:bg-hover data-popup-open:text-fg",
}

const SEAM: Record<Tone, string> = {
  primary: "bg-[color-mix(in_oklab,var(--brand-solid),black_24%)]",
  plain: "bg-line",
}

export function splitButton(tone: Tone = "primary") {
  return {
    group: cn("inline-flex h-7 shrink-0 items-stretch rounded-[min(var(--radius-md),12px)] border", GROUP[tone]),
    /** The main action: icon and label. */
    main: cn(
      "inline-flex items-center gap-1.5 rounded-l-[calc(min(var(--radius-md),12px)-1px)] pr-2.5 pl-2 text-[0.8rem] font-medium whitespace-nowrap transition-colors",
      PART[tone],
    ),
    /** The hairline between the two parts. */
    seam: cn("w-px shrink-0 self-stretch", SEAM[tone]),
    /** The arrow that opens the variants. */
    arrow: cn(
      "inline-flex w-6 items-center justify-center rounded-r-[calc(min(var(--radius-md),12px)-1px)] transition-colors",
      PART[tone],
    ),
  }
}
