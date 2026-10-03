import type { Metadata } from "next"
import { PeoplePage } from "@/domains/people/components/people-page"

export const metadata: Metadata = { title: "People" }

export default function Page() {
  return <PeoplePage />
}
