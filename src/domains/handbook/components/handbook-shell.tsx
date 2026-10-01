"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, type ReactNode } from "react"
import { Add01Icon, BookOpen01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/app/icon"
import { PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"
import type { KbArticleLite, KbCategory } from "../server"

/**
 * Documentation layout: every shelf and article on the left, the page on the
 * right. The handbook is Kenneth's internal knowledge base; this is its home.
 */
export function HandbookShell({
  categories,
  articles,
  canEdit,
  children,
}: {
  categories: KbCategory[]
  articles: KbArticleLite[]
  canEdit: boolean
  children: ReactNode
}) {
  const pathname = usePathname()
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const groups = useMemo(() => {
    return categories
      .map((c) => ({
        category: c,
        articles: articles.filter(
          (a) =>
            a.category_id === c.id &&
            (!q || a.title.toLowerCase().includes(q) || (a.summary ?? "").toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.articles.length > 0)
  }, [categories, articles, q])

  return (
    <>
      <PageHeader
        title="Handbook"
        icon={BookOpen01Icon}
        actions={
          canEdit && (
            <Link
              href="/handbook/new"
              className="pressable inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2.5 text-xs font-medium text-fg-2 hover:bg-hover hover:text-fg"
            >
              <Icon icon={Add01Icon} size={14} />
              New article
            </Link>
          )
        }
      />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Handbook" className="hidden w-[260px] shrink-0 flex-col border-r border-line md:flex">
          <div className="p-3">
            <label className="flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-fg-3 focus-within:border-line-strong">
              <Icon icon={Search01Icon} size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter articles"
                aria-label="Filter articles"
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
            <Link
              href="/handbook"
              className={cn(
                "mb-2 flex h-8 items-center rounded-md px-2 text-[13px] font-medium",
                pathname === "/handbook" ? "bg-selected text-fg" : "text-fg-2 hover:bg-hover hover:text-fg",
              )}
            >
              Overview
            </Link>
            {groups.map(({ category, articles }) => (
              <div key={category.id} className="mb-3">
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-fg-3">{category.title}</p>
                <ul className="flex flex-col gap-px">
                  {articles.map((a) => {
                    const active = pathname === `/handbook/${a.slug}` || pathname.startsWith(`/handbook/${a.slug}/`)
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/handbook/${a.slug}`}
                          className={cn(
                            "flex min-h-8 items-center gap-2 rounded-md px-2 py-1 text-[13px] leading-5",
                            active ? "bg-selected text-fg" : "text-fg-2 hover:bg-hover hover:text-fg",
                          )}
                        >
                          <span className="min-w-0 flex-1">{a.title}</span>
                          {a.status !== "ready" && (
                            <span className="shrink-0 text-[10px] font-medium text-fg-4">{a.status === "draft" ? "Draft" : "To write"}</span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p className="px-2 py-4 text-sm text-fg-3">No articles match.</p>}
          </div>
        </nav>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}
