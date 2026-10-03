"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/app/icon"
import { getSupabase } from "@/lib/supabase/client"
import { slugify } from "./markdown"
import type { KbArticleLite, KbCategory } from "../server"

const input =
  "h-8 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-brand"

/** Admins arrange the handbook's shelves: name them, describe them, order them. */
export function ShelvesDialog({
  open,
  onClose,
  categories,
  articles,
}: {
  open: boolean
  onClose: () => void
  categories: KbCategory[]
  articles: KbArticleLite[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [newTitle, setNewTitle] = useState("")
  const count = (id: string) => articles.filter((a) => a.category_id === id).length

  const run = (fn: () => PromiseLike<{ error: { message: string } | null }>, done?: string) =>
    start(async () => {
      const { error } = await fn()
      if (error) return void toast.error(error.message)
      if (done) toast(done)
      router.refresh()
    })

  const move = (c: KbCategory, dir: -1 | 1) => {
    const i = categories.findIndex((x) => x.id === c.id)
    const other = categories[i + dir]
    if (!other) return
    start(async () => {
      const supabase = getSupabase()
      await supabase.from("kb_categories").update({ sort: other.sort }).eq("id", c.id)
      await supabase.from("kb_categories").update({ sort: c.sort }).eq("id", other.id)
      router.refresh()
    })
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-backdrop fixed inset-0 z-50 bg-black/45" />
        <DialogPrimitive.Popup className="ui-dialog fixed top-[8vh] left-1/2 z-50 flex max-h-[84vh] w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-xl bg-raised shadow-popover outline-none">
          <div className="flex items-center justify-between px-5 pt-4">
            <DialogPrimitive.Title className="text-md font-semibold text-fg">Shelves</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
              <Icon icon={Cancel01Icon} />
            </DialogPrimitive.Close>
          </div>
          <p className="px-5 pt-1 text-sm text-fg-3">Shelves group the articles in the sidebar. Changes save as you go.</p>
          <ul className="mt-3 min-h-0 flex-1 overflow-y-auto border-y border-line">
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-start gap-2 border-b border-line/60 px-5 py-3 last:border-0">
                <div className="flex flex-col">
                  <button type="button" aria-label="Move up" disabled={i === 0 || pending} onClick={() => move(c, -1)} className="text-fg-4 hover:text-fg disabled:opacity-30">
                    <Icon icon={ArrowUp01Icon} size={14} />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === categories.length - 1 || pending} onClick={() => move(c, 1)} className="text-fg-4 hover:text-fg disabled:opacity-30">
                    <Icon icon={ArrowDown01Icon} size={14} />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <input
                    defaultValue={c.title}
                    aria-label="Shelf name"
                    className={input}
                    onBlur={(e) => {
                      const title = e.target.value.trim()
                      if (title && title !== c.title) run(() => getSupabase().from("kb_categories").update({ title }).eq("id", c.id), "Shelf renamed")
                    }}
                  />
                  <input
                    defaultValue={c.blurb ?? ""}
                    aria-label="Description"
                    placeholder="One line on what belongs here"
                    className={input}
                    onBlur={(e) => {
                      const blurb = e.target.value.trim() || null
                      if (blurb !== c.blurb) run(() => getSupabase().from("kb_categories").update({ blurb }).eq("id", c.id))
                    }}
                  />
                </div>
                <div className="flex w-24 shrink-0 flex-col items-end gap-1.5 pt-1.5">
                  <span className="text-xs text-fg-3 tabular">{count(c.id)} {count(c.id) === 1 ? "article" : "articles"}</span>
                  <button
                    type="button"
                    disabled={pending || count(c.id) > 0}
                    title={count(c.id) > 0 ? "Move or delete its articles first" : "Delete this shelf"}
                    onClick={() => run(() => getSupabase().from("kb_categories").delete().eq("id", c.id), "Shelf deleted")}
                    className="inline-flex items-center gap-1 text-xs text-fg-4 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Icon icon={Delete02Icon} size={13} />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="flex items-center gap-2 px-5 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              const title = newTitle.trim()
              if (!title) return
              const sort = (categories.at(-1)?.sort ?? 0) + 1
              run(() => getSupabase().from("kb_categories").insert({ title, slug: slugify(title), sort }), `Added ${title}`)
              setNewTitle("")
            }}
          >
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New shelf name" className={input} />
            <Button type="submit" disabled={pending || !newTitle.trim()}>Add shelf</Button>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
