import "server-only"
import { cache } from "react"
import { createSupabaseServer } from "@/lib/supabase/server"

export type KbCategory = { id: string; slug: string; title: string; blurb: string | null; color: string; sort: number }
export type KbArticleLite = {
  id: string
  slug: string
  title: string
  summary: string | null
  status: "ready" | "draft" | "needed"
  category_id: string | null
  updated_at: string
}
export type KbArticle = KbArticleLite & {
  body: string
  owner: string | null
  keywords: string | null
  created_at: string
  updated_by: string | null
}

/** Everything the handbook's sidebar needs, once per request. */
export const getHandbookNav = cache(async () => {
  const supabase = await createSupabaseServer()
  const [cats, arts] = await Promise.all([
    supabase.from("kb_categories").select("id,slug,title,blurb,color,sort").order("sort"),
    supabase.from("kb_articles").select("id,slug,title,summary,status,category_id,updated_at").order("title"),
  ])
  return {
    categories: (cats.data ?? []) as KbCategory[],
    articles: (arts.data ?? []) as KbArticleLite[],
  }
})

export const getArticle = cache(async (slug: string) => {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from("kb_articles")
    .select("id,slug,title,summary,status,category_id,updated_at,body,owner,keywords,created_at,updated_by")
    .eq("slug", slug)
    .maybeSingle()
  return data as KbArticle | null
})

export async function getMyVote(articleId: string) {
  const supabase = await createSupabaseServer()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims?.sub
  if (!uid) return null
  const { data } = await supabase
    .from("kb_feedback")
    .select("helpful")
    .eq("article_id", articleId)
    .eq("user_id", uid)
    .maybeSingle()
  return data ? (data.helpful as boolean) : null
}

export async function searchArticles(query: string) {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from("kb_articles")
    .select("id,slug,title,summary,status,category_id,updated_at")
    .textSearch("search", query, { type: "websearch", config: "english" })
    .limit(20)
  return (data ?? []) as KbArticleLite[]
}
