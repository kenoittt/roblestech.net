import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getArticle, getHandbookNav, getMyVote } from "@/domains/handbook/server"
import { getBootstrap } from "@/domains/workspace/server"
import { Markdown, headingsOf } from "@/domains/handbook/components/markdown"
import { Feedback } from "@/domains/handbook/components/feedback"
import { STATUS_LABEL } from "@/domains/handbook/config"
import { isoDay, shortDate } from "@/lib/dates"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  return { title: article?.title ?? "Handbook" }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [article, nav, bootstrap] = await Promise.all([getArticle(slug), getHandbookNav(), getBootstrap()])
  if (!article) notFound()
  const vote = await getMyVote(article.id)
  const me = bootstrap.members.find((m) => m.id === bootstrap.uid)
  const canEdit = me?.role === "admin" || me?.role === "super_admin"
  const category = nav.categories.find((c) => c.id === article.category_id)
  const siblings = nav.articles.filter((a) => a.category_id === article.category_id)
  const i = siblings.findIndex((a) => a.id === article.id)
  const prev = i > 0 ? siblings[i - 1] : null
  const next = i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : null
  const toc = headingsOf(article.body)
  const today = isoDay()

  return (
    <div className="mx-auto flex w-full max-w-[1100px] gap-12 px-6 py-10 sm:px-10">
      <article className="min-w-0 max-w-[700px] flex-1">
        <p className="text-xs font-medium text-fg-3">{category?.title ?? "Unfiled"}</p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-fg">{article.title}</h2>
        {article.summary && <p className="mt-2 text-md leading-7 text-fg-2">{article.summary}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
          <span
            className={
              article.status === "ready" ? "text-status-done" : article.status === "draft" ? "text-warning" : "text-fg-3"
            }
          >
            {STATUS_LABEL[article.status]}
          </span>
          {article.owner && <span>Kept by {article.owner}</span>}
          <span>Updated {shortDate(isoDay(article.updated_at), today)}</span>
          {canEdit && (
            <Link href={`/handbook/${article.slug}/edit`} className="font-medium text-brand hover:underline">
              Edit
            </Link>
          )}
        </p>

        <div className="mt-8 border-t border-line pt-8">
          {article.body.trim() ? (
            <Markdown source={article.body} />
          ) : (
            <p className="text-sm leading-6 text-fg-3">
              This article isn't written yet. {article.owner ? `${article.owner} is down to write it.` : ""}
              {canEdit && (
                <>
                  {" "}
                  <Link href={`/handbook/${article.slug}/edit`} className="font-medium text-brand hover:underline">
                    Write it now
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <div className="mt-12">
          <Feedback articleId={article.id} initial={vote} />
        </div>

        {(prev || next) && (
          <nav className="mt-8 grid grid-cols-2 gap-4 text-sm" aria-label="More on this shelf">
            {prev ? (
              <Link href={`/handbook/${prev.slug}`} className="group rounded-md py-2">
                <span className="block text-xs text-fg-4">Previous</span>
                <span className="text-fg-2 group-hover:text-fg">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/handbook/${next.slug}`} className="group rounded-md py-2 text-right">
                <span className="block text-xs text-fg-4">Next</span>
                <span className="text-fg-2 group-hover:text-fg">{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>

      {toc.length > 1 && (
        <aside className="hidden w-52 shrink-0 xl:block">
          <div className="sticky top-10">
            <p className="text-xs font-medium text-fg-3">On this page</p>
            <ul className="mt-2 flex flex-col gap-1.5 border-l border-line">
              {toc.map((h) => (
                <li key={h.id} className={h.level === 3 ? "pl-6" : "pl-3"}>
                  <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-0 text-xs leading-5 text-fg-3 hover:text-fg">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  )
}
