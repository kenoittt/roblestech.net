"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getSupabase } from "@/lib/supabase/client"
import { Command as Cmdk } from "cmdk"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useTheme } from "next-themes"
import {
  Activity01Icon,
  Add01Icon,
  BookOpen01Icon,
  Calendar03Icon,
  ComputerIcon,
  Folder02Icon,
  Home06Icon,
  InboxIcon,
  LayoutTemplateIcon,
  Moon02Icon,
  Search01Icon,
  Settings01Icon,
  Sun03Icon,
  Task01Icon,
  TaskDone01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { useMe, useMembers, useProjects, useTasks } from "@/domains/workspace/provider"
import { displayName, isAdminRole } from "@/domains/workspace/types"
import { taskKey } from "@/domains/tasks/config"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { sortTemplates, useTaskTemplates } from "@/domains/templates/data"
import { ProjectSwatch, StatusIcon } from "@/domains/tasks/components/glyphs"
import { Avatar } from "./avatar"
import { Icon, type IconSvgElement } from "./icon"
import { Kbd } from "./page"
import { useUI } from "./ui-state"

/**
 * Cmd K: go anywhere, find any task, do anything. Opened many times a day, so
 * it appears without animation (Emil Kowalski: frequent actions don't animate).
 */
export function CommandMenu() {
  const { commandOpen, setCommandOpen } = useUI()
  return (
    <DialogPrimitive.Root open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Popup className="fixed top-[16vh] left-1/2 z-50 w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl bg-raised shadow-popover outline-none">
          <DialogPrimitive.Title className="sr-only">Search and commands</DialogPrimitive.Title>
          {commandOpen && <Palette onClose={() => setCommandOpen(false)} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const me = useMe()
  const tasks = useTasks()
  const projects = useProjects()
  const members = useMembers()
  const { openCreateTask, setShortcutsOpen } = useUI()
  const { open } = useTaskPanel()
  const { setTheme } = useTheme()
  const [query, setQuery] = useState("")
  const { data: templates = [] } = useTaskTemplates()
  // Your templates first. With nothing typed, the first five; typing searches them all.
  const templateItems = useMemo(() => {
    const sorted = sortTemplates(templates, me.id)
    return query.trim() ? sorted : sorted.slice(0, 5)
  }, [templates, me.id, query])
  // Handbook titles, fetched once per session the first time the menu opens.
  const { data: articles = [] } = useQuery({
    queryKey: ["handbook", "titles"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await getSupabase().from("kb_articles").select("slug,title,status").order("title")
      return (data ?? []) as { slug: string; title: string; status: string }[]
    },
  })

  const run = (fn: () => void) => {
    onClose()
    fn()
  }
  const go = (href: string) => run(() => router.push(href))

  const taskMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q) || taskKey(t).toLowerCase().includes(q) || String(t.number) === q)
      .slice(0, 8)
  }, [tasks, query])

  return (
    <Cmdk loop label="Search and commands" className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <Icon icon={Search01Icon} className="text-fg-3" />
        <Cmdk.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search tasks, projects and people, or type a command"
          className="h-12 w-full bg-transparent text-md text-fg outline-none placeholder:text-fg-4"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Cmdk.List className="max-h-[min(440px,60vh)] overflow-y-auto p-1.5">
        <Cmdk.Empty className="px-4 py-8 text-center text-sm text-fg-3">Nothing matches “{query}”.</Cmdk.Empty>

        {taskMatches.length > 0 && (
          <Group heading="Tasks">
            {taskMatches.map((t) => (
              <Item key={t.id} value={`task ${t.title} ${taskKey(t)}`} onSelect={() => run(() => open(t.number))}>
                <StatusIcon status={t.status} />
                <span className="truncate">{t.title}</span>
                <span className="ml-auto font-mono text-xs text-fg-4">{taskKey(t)}</span>
              </Item>
            ))}
          </Group>
        )}

        <Group heading="Create">
          <Item value="new task create" onSelect={() => run(() => openCreateTask())} icon={Add01Icon} shortcut="C">New task</Item>
          <Item value="assign myself new task" onSelect={() => run(() => openCreateTask({ assignee_id: me.id }))} icon={TaskDone01Icon}>New task for me</Item>
          {templateItems.map((t) => (
            <Item key={t.id} value={`template new task from ${t.name} ${t.title}`} onSelect={() => run(() => openCreateTask({}, { templateId: t.id }))} icon={LayoutTemplateIcon}>
              <span className="truncate">New task from <span className="text-fg">{t.name}</span></span>
            </Item>
          ))}
          <Item value="new task template save routine" onSelect={() => run(() => openCreateTask({}, { asTemplate: {} }))} icon={LayoutTemplateIcon}>New task template</Item>
          <Item value="plan time calendar block" onSelect={() => go("/calendar")} icon={Calendar03Icon}>Plan time on the calendar</Item>
          {isAdminRole(me.role) && <Item value="invite person member" onSelect={() => go("/people")} icon={UserAdd01Icon}>Invite someone</Item>}
        </Group>

        <Group heading="Go to">
          <Item value="home dashboard" onSelect={() => go("/")} icon={Home06Icon} shortcut="G H">Home</Item>
          <Item value="inbox notifications" onSelect={() => go("/inbox")} icon={InboxIcon} shortcut="G I">Inbox</Item>
          <Item value="my tasks" onSelect={() => go("/my-tasks")} icon={TaskDone01Icon} shortcut="G M">My tasks</Item>
          <Item value="all tasks" onSelect={() => go("/tasks")} icon={Task01Icon} shortcut="G T">All tasks</Item>
          <Item value="calendar schedule" onSelect={() => go("/calendar")} icon={Calendar03Icon} shortcut="G C">Calendar</Item>
          <Item value="projects portfolio" onSelect={() => go("/projects")} icon={Folder02Icon} shortcut="G P">Projects</Item>
          <Item value="people team members" onSelect={() => go("/people")} icon={UserGroupIcon} shortcut="G E">People</Item>
          <Item value="activity log history" onSelect={() => go("/activity")} icon={Activity01Icon} shortcut="G A">Activity</Item>
          <Item value="handbook knowledge base articles" onSelect={() => go("/handbook")} icon={BookOpen01Icon} shortcut="G B">Handbook</Item>
          <Item value="settings profile account" onSelect={() => go("/settings")} icon={Settings01Icon}>Settings</Item>
        </Group>

        {query.trim().length >= 2 && articles.length > 0 && (
          <Group heading="Handbook">
            {articles.map((a) => (
              <Item key={a.slug} value={`article ${a.title}`} onSelect={() => go(`/handbook/${a.slug}`)} icon={BookOpen01Icon}>
                <span className="truncate">{a.title}</span>
                {a.status !== "ready" && <span className="ml-auto text-xs text-fg-4">{a.status === "draft" ? "Draft" : "To write"}</span>}
              </Item>
            ))}
          </Group>
        )}

        <Group heading="Projects">
          {projects.filter((p) => p.status !== "closed" && !p.archived).map((p) => (
            <Item key={p.id} value={`project ${p.name} ${p.client_name ?? ""}`} onSelect={() => go(`/projects/${p.id}`)}>
              <ProjectSwatch color={p.color} size={9} className="mx-[3.5px]" />
              {p.name}
            </Item>
          ))}
        </Group>

        <Group heading="People">
          {members.filter((m) => !m.deactivated_at).map((m) => (
            <Item key={m.id} value={`person ${displayName(m)} ${m.email ?? ""}`} onSelect={() => go(`/people/${m.id}`)}>
              <Avatar id={m.id} name={displayName(m)} size="xs" className="mx-0.5" />
              {displayName(m)}
            </Item>
          ))}
        </Group>

        <Group heading="Appearance">
          <Item value="theme system follow" onSelect={() => run(() => setTheme("system"))} icon={ComputerIcon}>Follow the system theme</Item>
          <Item value="theme dark mode" onSelect={() => run(() => setTheme("dark"))} icon={Moon02Icon}>Dark theme</Item>
          <Item value="theme light mode" onSelect={() => run(() => setTheme("light"))} icon={Sun03Icon}>Light theme</Item>
          <Item value="keyboard shortcuts help" onSelect={() => run(() => setShortcutsOpen(true))} icon={Search01Icon} shortcut="?">Keyboard shortcuts</Item>
        </Group>
      </Cmdk.List>
    </Cmdk>
  )
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Cmdk.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-3"
    >
      {children}
    </Cmdk.Group>
  )
}

function Item({
  value,
  onSelect,
  icon,
  shortcut,
  children,
}: {
  value: string
  onSelect: () => void
  icon?: IconSvgElement
  shortcut?: string
  children: React.ReactNode
}) {
  return (
    <Cmdk.Item
      value={value}
      onSelect={onSelect}
      className="flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm text-fg-2 outline-none data-[selected=true]:bg-selected data-[selected=true]:text-fg"
    >
      {icon && <Icon icon={icon} className="text-fg-3" />}
      {children}
      {shortcut && (
        <span className="ml-auto flex gap-1">
          {shortcut.split(" ").map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </span>
      )}
    </Cmdk.Item>
  )
}
