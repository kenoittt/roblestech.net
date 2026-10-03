import type { Metadata } from "next"
import Link from "next/link"
import { getHandbookNav, searchArticles } from "@/domains/handbook/server"
import { STATUS_LABEL } from "@/domains/handbook/config"

export const metadata: Metadata = { title: "Handbook" }

export default async function HandbookHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const { categories, articles } = await getHandbookNav()
  const results = q?.trim() ? await searchArticles(q.trim()) : null
  const recent = articles
    .filter((a) => a.status !== "needed")
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 6)
  const needed = articles.filter((a) => a.status === "needed")
  const shelf = (id: string | null) => categories.find((c) => c.id === id)?.title ?? "Unfiled"

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 py-10 sm:px-10">
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Handbook</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-6 text-fg-2">
        How RTC works: procedures, pricing, tools and quick answers. Each article says whether it's settled,
        still a draft, or not written yet.
      </p>
      <form action="/handbook" className="mt-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search every article, including the text inside them"
          aria-label="Search the handbook"
          className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-brand"
        />
      </form>

      {results ? (
        <section className="mt-8">
          <h3 className="text-xs font-medium text-fg-3">
            {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
          </h3>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {results.map((a) => (
              <li key={a.id}>
                <Link href={`/handbook/${a.slug}`} className="block py-3 hover:bg-hover">
                  <span className="block text-sm font-medium text-fg">{a.title}</span>
                  <span className="mt-0.5 block text-xs text-fg-3">
                    {shelf(a.category_id)} · {STATUS_LABEL[a.status]}
                    {a.summary ? ` · ${a.summary}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="mt-10">
            <h3 className="text-xs font-medium text-fg-3">Recently updated</h3>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link href={`/handbook/${a.slug}`} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg hover:text-brand">{a.title}</span>
                      {a.summary && <span className="mt-0.5 block truncate text-xs text-fg-3">{a.summary}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-fg-4">{shelf(a.category_id)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
            {categories.map((c) => {
              const count = articles.filter((a) => a.category_id === c.id)
              return (
                <div key={c.id}>
                  <p className="text-sm font-medium text-fg">{c.title}</p>
                  {c.blurb && <p className="mt-1 text-xs leading-5 text-fg-3">{c.blurb}</p>}
                  <p className="mt-1.5 text-[11px] text-fg-4">
                    {count.length === 0
                      ? "No articles yet"
                      : `${count.filter((a) => a.status === "ready").length} ready · ${count.filter((a) => a.status !== "ready").length} in progress`}
                  </p>
                </div>
              )
            })}
          </section>

          {needed.length > 0 && (
            <section className="mt-10">
              <h3 className="text-xs font-medium text-fg-3">Waiting to be written</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {needed.map((a) => (
                  <li key={a.id} className="text-sm">
                    <Link href={`/handbook/${a.slug}`} className="text-fg-2 hover:text-fg">{a.title}</Link>
                    <span className="text-xs text-fg-4"> · {shelf(a.category_id)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
