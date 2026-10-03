import type { Metadata } from "next"
import { ActivityPage } from "@/domains/tasks/components/activity-page"

export const metadata: Metadata = { title: "Activity" }

export default function Page() {
  return <ActivityPage />
}
