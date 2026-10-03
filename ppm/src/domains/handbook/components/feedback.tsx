"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase/client"

/**
 * "Was this helpful?" The vote has a name on it on purpose: the point isn't a
 * score, it's knowing which articles fail the people who needed them.
 */
export function Feedback({ articleId, initial }: { articleId: string; initial: boolean | null }) {
  const [vote, setVote] = useState<boolean | null>(initial)
  const [pending, start] = useTransition()

  const cast = (helpful: boolean) =>
    start(async () => {
      const supabase = getSupabase()
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const previous = vote
      setVote(helpful)
      const { error } = await supabase
        .from("kb_feedback")
        .upsert({ article_id: articleId, user_id: data.user.id, helpful }, { onConflict: "article_id,user_id" })
      if (error) {
        setVote(previous)
        toast.error("Your vote didn't save. Try again.")
      }
    })

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6 text-sm">
      <span className="text-fg-2">{vote === null ? "Was this helpful?" : vote ? "Thanks. Glad it helped." : "Thanks. The owner will see it needs work."}</span>
      <div className="flex gap-1.5">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            disabled={pending}
            onClick={() => cast(v)}
            aria-pressed={vote === v}
            className={cn(
              "pressable h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
              vote === v ? "border-brand/60 bg-brand-soft text-fg" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
            )}
          >
            {v ? "Yes" : "Not really"}
          </button>
        ))}
      </div>
    </div>
  )
}
