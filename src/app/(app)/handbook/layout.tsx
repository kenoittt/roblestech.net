import type { ReactNode } from "react"
import { getBootstrap } from "@/domains/workspace/server"
import { getHandbookNav } from "@/domains/handbook/server"
import { HandbookShell } from "@/domains/handbook/components/handbook-shell"

export default async function HandbookLayout({ children }: { children: ReactNode }) {
  const [{ categories, articles }, bootstrap] = await Promise.all([getHandbookNav(), getBootstrap()])
  const me = bootstrap.members.find((m) => m.id === bootstrap.uid)
  const canEdit = me?.role === "admin" || me?.role === "super_admin"
  return (
    <HandbookShell categories={categories} articles={articles} canEdit={canEdit}>
      {children}
    </HandbookShell>
  )
}
