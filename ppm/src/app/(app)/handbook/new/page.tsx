import { redirect } from "next/navigation"
import { getHandbookNav } from "@/domains/handbook/server"
import { getBootstrap } from "@/domains/workspace/server"
import { ArticleEditor } from "@/domains/handbook/components/article-editor"

export default async function NewArticle() {
  const [nav, bootstrap] = await Promise.all([getHandbookNav(), getBootstrap()])
  const me = bootstrap.members.find((m) => m.id === bootstrap.uid)
  if (me?.role !== "admin" && me?.role !== "super_admin") redirect("/handbook")
  return <ArticleEditor article={null} categories={nav.categories} />
}
