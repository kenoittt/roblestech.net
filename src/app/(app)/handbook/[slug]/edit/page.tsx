import { notFound, redirect } from "next/navigation"
import { getArticle, getHandbookNav } from "@/domains/handbook/server"
import { getBootstrap } from "@/domains/workspace/server"
import { ArticleEditor } from "@/domains/handbook/components/article-editor"

export default async function EditArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [article, nav, bootstrap] = await Promise.all([getArticle(slug), getHandbookNav(), getBootstrap()])
  if (!article) notFound()
  const me = bootstrap.members.find((m) => m.id === bootstrap.uid)
  if (me?.role !== "admin" && me?.role !== "super_admin") redirect(`/handbook/${slug}`)
  return <ArticleEditor article={article} categories={nav.categories} />
}
