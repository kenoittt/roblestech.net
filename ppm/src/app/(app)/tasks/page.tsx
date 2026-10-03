import type { Metadata } from "next"
import { AllTasks } from "@/domains/tasks/components/task-pages"

export const metadata: Metadata = { title: "All tasks" }

export default function TasksPage() {
  return <AllTasks />
}
