"use client"

import type { ReactNode } from "react"
import { Menu01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Icon, type IconSvgElement } from "./icon"
import { useUI } from "./ui-state"

// The page frame inside the main sheet: a header bar, an optional toolbar,
// then the scrolling body. Pages compose these instead of inventing layouts.

export function PageHeader({
  title,
  icon,
  crumbs,
  actions,
  children,
}: {
  title: ReactNode
  icon?: IconSvgElement
  /** Parent pages, shown muted before the title. */
  crumbs?: ReactNode
  actions?: ReactNode
  /** Extra content beside the title, such as a count. */
  children?: ReactNode
}) {
  const { setNavOpen } = useUI()
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
      <button
        type="button"
        onClick={() => setNavOpen(true)}
        className="pressable -ml-1 inline-flex size-8 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg lg:hidden"
        aria-label="Open navigation"
      >
        <Icon icon={Menu01Icon} />
      </button>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {crumbs}
        {icon && <Icon icon={icon} className="text-fg-3" />}
        <h1 className="truncate font-medium text-fg">{title}</h1>
        {children}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
    </header>
  )
}

export function Crumb({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: () => void }) {
  const cls = "truncate text-fg-3 transition-colors hover:text-fg"
  return (
    <>
      {href ? (
        <a href={href} className={cls}>
          {children}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={cls}>
          {children}
        </button>
      )}
      <span className="text-fg-4" aria-hidden>
        /
      </span>
    </>
  )
}

export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-11 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4", className)}>
      {children}
    </div>
  )
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto", className)}>{children}</div>
}

/**
 * A titled block of content. No border, no card: hierarchy comes from the
 * heading and the space around it.
 */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {(title || actions) && (
        <div className="mb-3 flex min-h-7 items-end justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** For empty lists and first runs: an icon, a sentence, and the next step. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconSvgElement
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <span className="mb-3 inline-flex size-9 items-center justify-center rounded-lg border border-line text-fg-3">
          <Icon icon={icon} size={18} />
        </span>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-hover px-1 font-sans text-[10.5px] font-medium text-fg-3",
        className,
      )}
    >
      {children}
    </kbd>
  )
}
