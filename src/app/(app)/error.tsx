"use client"

import { useEffect } from "react"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { EmptyState, PageHeader } from "@/components/app/page"

/** When a screen fails, say so plainly and offer the way back. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <>
      <PageHeader title="Something went wrong" icon={Alert02Icon} />
      <EmptyState
        icon={Alert02Icon}
        title="This screen didn't load"
        description="Nothing you saved is lost. Try again, and if it keeps happening, tell Kyan what you were doing."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>Go home</Button>
            <Button onClick={reset}>Try again</Button>
          </div>
        }
      />
    </>
  )
}
