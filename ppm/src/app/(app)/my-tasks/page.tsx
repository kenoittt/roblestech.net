import type { Metadata } from "next"
import { MyTasks } from "@/domains/tasks/components/task-pages"

export const metadata: Metadata = { title: "My tasks" }

export default function MyTasksPage() {
  return <MyTasks />
}
