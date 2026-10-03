import type { ReactNode } from "react"
import { AppShell } from "@/components/app/shell"
import { UIProvider } from "@/components/app/ui-state"
import { CommandMenu } from "@/components/app/command-menu"
import { Shortcuts } from "@/components/app/shortcuts"
import { getBootstrap } from "@/domains/workspace/server"
import { WorkspaceProvider } from "@/domains/workspace/provider"
import { TaskPanel } from "@/domains/tasks/components/task-panel"
import { CreateTaskDialog } from "@/domains/tasks/components/create-task-dialog"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const bootstrap = await getBootstrap()
  return (
    <WorkspaceProvider bootstrap={bootstrap}>
      <UIProvider>
        <AppShell>
          {children}
          <TaskPanel />
        </AppShell>
        <CreateTaskDialog />
        <CommandMenu />
        <Shortcuts />
      </UIProvider>
    </WorkspaceProvider>
  )
}
