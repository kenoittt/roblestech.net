"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { useTheme } from "next-themes"
import {
  Activity01Icon,
  ArrowDown01Icon,
  BookOpen01Icon,
  Calendar03Icon,
  ComputerIcon,
  Folder02Icon,
  Home06Icon,
  InboxIcon,
  KeyboardIcon,
  Logout01Icon,
  Moon02Icon,
  PencilEdit02Icon,
  Search01Icon,
  Settings01Icon,
  Sun03Icon,
  Task01Icon,
  TaskDone01Icon,
  UserGroupIcon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { DEMO_MODE } from "@/lib/env"
import { signOut, switchAccount } from "@/domains/auth/actions"
import { useUnreadCount } from "@/domains/inbox/data"
import { isActive } from "@/domains/tasks/config"
import { ProjectSwatch } from "@/domains/tasks/components/glyphs"
import { useMe, useMembers, useProjects, useTasks } from "@/domains/workspace/provider"
import { ROLE_META, displayName, type Role } from "@/domains/workspace/types"
import { Avatar } from "./avatar"
import { Icon, type IconSvgElement } from "./icon"
import { Kbd } from "./page"
import { useUI } from "./ui-state"

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const me = useMe()
  const tasks = useTasks()
  const projects = useProjects()
  const unread = useUnreadCount()
  const { setCommandOpen, openCreateTask } = useUI()
  const [projectsOpen, setProjectsOpen] = useState(true)

  const myActive = useMemo(
    () => tasks.filter((t) => t.assignee_id === me.id && isActive(t.status)).length,
    [tasks, me.id],
  )
  // Your projects first: the ones you belong to that are still running.
  const myProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status !== "closed" && !p.archived && p.members.some((m) => m.user_id === me.id))
        .slice(0, 8),
    [projects, me.id],
  )

  const is = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"))

  return (
    <nav className="flex h-full w-full flex-col gap-0.5 px-2.5 pb-2.5 text-sm" aria-label="Main">
      <div className="flex h-12 shrink-0 items-center gap-1">
        <Link
          href="/"
          onClick={onNavigate}
          className="pressable flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-hover"
        >
          <Image src="/brand/rtc-mark-64.png" alt="" width={22} height={22} className="size-[22px] shrink-0" priority />
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">Robles Tech</span>
        </Link>
        <SidebarIconButton icon={Search01Icon} label="Search" shortcut="⌘K" onClick={() => setCommandOpen(true)} />
        <SidebarIconButton icon={PencilEdit02Icon} label="New task" shortcut="C" onClick={() => openCreateTask()} />
      </div>

      <div className="flex flex-col gap-px pt-1">
        <NavItem href="/" icon={Home06Icon} label="Home" active={is("/")} onNavigate={onNavigate} />
        <NavItem href="/inbox" icon={InboxIcon} label="Inbox" active={is("/inbox")} onNavigate={onNavigate} count={unread} strongCount />
        <NavItem href="/my-tasks" icon={TaskDone01Icon} label="My tasks" active={is("/my-tasks")} onNavigate={onNavigate} count={myActive} />
        <NavItem href="/calendar" icon={Calendar03Icon} label="Calendar" active={is("/calendar")} onNavigate={onNavigate} />
      </div>

      <SectionLabel>Workspace</SectionLabel>
      <div className="flex flex-col gap-px">
        <NavItem href="/tasks" icon={Task01Icon} label="All tasks" active={is("/tasks")} onNavigate={onNavigate} />
        <NavItem href="/projects" icon={Folder02Icon} label="Projects" active={pathname === "/projects"} onNavigate={onNavigate} />
        <NavItem href="/people" icon={UserGroupIcon} label="People" active={is("/people")} onNavigate={onNavigate} />
        <NavItem href="/activity" icon={Activity01Icon} label="Activity" active={is("/activity")} onNavigate={onNavigate} />
        <NavItem href="/handbook" icon={BookOpen01Icon} label="Handbook" active={is("/handbook")} onNavigate={onNavigate} />
      </div>

      {myProjects.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setProjectsOpen((o) => !o)}
            className="group mt-4 flex items-center gap-1 rounded-md px-2 py-1 text-left text-xs font-medium text-fg-3 hover:text-fg-2"
            aria-expanded={projectsOpen}
          >
            Your projects
            <Icon
              icon={ArrowDown01Icon}
              size={12}
              className={cn("transition-transform duration-150", !projectsOpen && "-rotate-90")}
            />
          </button>
          {projectsOpen && (
            <div className="flex flex-col gap-px">
              {myProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                    pathname.startsWith(`/projects/${p.id}`)
                      ? "bg-selected text-fg"
                      : "text-fg-2 hover:bg-hover hover:text-fg",
                  )}
                >
                  <span className="flex size-4 items-center justify-center">
                    <ProjectSwatch color={p.color} size={9} />
                  </span>
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-3">
        {DEMO_MODE && (
          <p className="px-2 pb-1 text-[11px] leading-4 text-fg-4">
            Local preview with sample data.
          </p>
        )}
        <AccountMenu name={displayName(me)} id={me.id} role={me.role as Role} />
      </div>
    </nav>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 px-2 py-1 text-xs font-medium text-fg-3">{children}</div>
}

function NavItem({
  href,
  icon,
  label,
  active,
  count,
  strongCount,
  onNavigate,
}: {
  href: string
  icon: IconSvgElement
  label: string
  active: boolean
  count?: number
  strongCount?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
        active ? "bg-selected text-fg" : "text-fg-2 hover:bg-hover hover:text-fg",
      )}
    >
      <Icon icon={icon} className={active ? "text-fg" : "text-fg-3"} />
      <span className="truncate">{label}</span>
      {Boolean(count) && (
        <span className={cn("ml-auto text-xs tabular", strongCount ? "font-semibold text-brand" : "text-fg-3")}>
          {count}
        </span>
      )}
    </Link>
  )
}

function SidebarIconButton({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: IconSvgElement
  label: string
  shortcut: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-label={label}
        className="pressable inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
      >
        <Icon icon={icon} />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label} <Kbd className="ml-1">{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function AccountMenu({ name, id, role }: { name: string; id: string; role: Role }) {
  const { theme, setTheme } = useTheme()
  const { setShortcutsOpen } = useUI()
  const members = useMembers()
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "pressable flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-hover data-popup-open:bg-hover",
          pending && "opacity-60",
        )}
      >
        <Avatar id={id} name={name} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">{name}</span>
          <span className="block truncate text-xs text-fg-3">{ROLE_META[role]?.label ?? role}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Icon icon={Settings01Icon} className="text-fg-3" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Icon icon={theme === "light" ? Sun03Icon : theme === "dark" ? Moon02Icon : ComputerIcon} className="text-fg-3" />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
            <Icon icon={KeyboardIcon} className="text-fg-3" />
            Keyboard shortcuts
            <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {DEMO_MODE && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icon icon={UserSwitchIcon} className="text-fg-3" />
                Switch account
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-60">
                <DropdownMenuLabel>Sample accounts</DropdownMenuLabel>
                {members
                  .filter((m) => m.id !== id && !m.deactivated_at && m.email)
                  .map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={() => startTransition(() => switchAccount(m.email!))}
                    >
                      <Avatar id={m.id} name={displayName(m)} size="sm" />
                      <span className="truncate">{displayName(m)}</span>
                      <span className="ml-auto text-xs text-fg-3">{ROLE_META[m.role as Role]?.label}</span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => startTransition(() => signOut())}>
          <Icon icon={Logout01Icon} className="text-fg-3" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
