"use client"

import { Home06Icon } from "@hugeicons/core-free-icons"
import { PageBody, PageHeader } from "@/components/app/page"

export function HomeDashboard() {
  return (
    <>
      <PageHeader title="Home" icon={Home06Icon} />
      <PageBody className="p-6">
        <p className="text-sm text-fg-2">Dashboard coming together.</p>
      </PageBody>
    </>
  )
}
