"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ModalShell } from "@/components/app/modal"
import { NativeSelect, fieldClass } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase/client"
import { Markdown, slugify } from "./markdown"
import type { KbArticle, KbCategory } from "../server"

const input = fieldClass

/** Write in Markdown on the left; see the page as the team will on the right. */
export function ArticleEditor({ article, categories }: { article: KbArticle | null; categories: KbCategory[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [title, setTitle] = useState(article?.title ?? "")
  const [summary, setSummary] = useState(article?.summary ?? "")
  const [body, setBody] = useState(article?.body ?? "")
  const [categoryId, setCategoryId] = useState(article?.category_id ?? categories[0]?.id ?? "")
  const [status, setStatus] = useState<KbArticle["status"]>(article?.status ?? "draft")
  const [owner, setOwner] = useState(article?.owner ?? "")
  const [keywords, setKeywords] = useState(article?.keywords ?? "")
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [confirming, setConfirming] = useState(false)

  const remove = () =>
    start(async () => {
      if (!article) return
      const { error } = await getSupabase().from("kb_articles").delete().eq("id", article.id)
      if (error) return void toast.error(error.message)
      setConfirming(false)
      toast("Article deleted")
      router.push("/handbook")
      router.refresh()
    })

  const save = () =>
    start(async () => {
      if (!title.trim()) return void toast.error("Give the article a title.")
      const supabase = getSupabase()
      const { data: user } = await supabase.auth.getUser()
      const row = {
        title: title.trim(),
        summary: summary.trim() || null,
        body,
        category_id: categoryId || null,
        status,
        owner: owner.trim() || null,
        keywords: keywords.trim() || null,
        updated_by: user.user?.id ?? null,
        updated_at: new Date().toISOString(),
      }
      if (article) {
        const { error } = await supabase.from("kb_articles").update(row).eq("id", article.id)
        if (error) return void toast.error(error.message)
        toast("Saved")
        router.push(`/handbook/${article.slug}`)
      } else {
        const slug = slugify(title)
        const { error } = await supabase.from("kb_articles").insert({ ...row, slug, created_by: user.user?.id ?? null })
        if (error) return void toast.error(error.message.includes("duplicate") ? "An article with that title already exists." : error.message)
        toast("Published")
        router.push(`/handbook/${slug}`)
      }
      router.refresh()
    })

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">{article ? "Edit article" : "New article"}</h2>
        <div className="flex gap-2">
          {article && (
            <Button variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-fg-2">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="What the article answers" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Shelf</span>
          <NativeSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Status</span>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as KbArticle["status"])}>
            <option value="ready">Ready: settled procedure</option>
            <option value="draft">Draft: being written</option>
            <option value="needed">Needed: not written yet</option>
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-fg-2">Summary</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} className={input} placeholder="One sentence, shown under the title" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Owner</span>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} className={input} placeholder="Who keeps it current" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Extra search words</span>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={input} placeholder="Words people might search" />
        </label>
      </div>

      <div className="mt-6 flex gap-1 lg:hidden">
        {(["write", "preview"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn("pressable h-7 rounded-md px-2.5 text-xs font-medium", tab === t ? "bg-selected text-fg" : "text-fg-3 hover:text-fg")}>
            {t === "write" ? "Write" : "Preview"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"## A heading\n\nWrite in Markdown: **bold**, lists, tables, links."}
          className={cn(
            "min-h-[60vh] w-full resize-y rounded-lg border border-line-strong bg-surface p-4 font-mono text-[13px] leading-6 text-fg outline-none focus:border-brand",
            tab === "preview" && "hidden lg:block",
          )}
        />
        <div className={cn("min-h-[60vh] rounded-lg border border-line p-6", tab === "write" && "hidden lg:block")}>
          {body.trim() ? <Markdown source={body} /> : <p className="text-sm text-fg-4">The preview appears here.</p>}
        </div>
      </div>
      {article && (
        <ModalShell open={confirming} onClose={() => setConfirming(false)} title="Delete this article?">
          <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
            <p className="text-sm text-fg-3">“{article.title}” leaves the handbook for everyone. This can't be undone.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
