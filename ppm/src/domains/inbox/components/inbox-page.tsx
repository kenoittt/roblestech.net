"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { InboxIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { EmptyState, PageBody, PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { ago, clockTime, diffDays, isoDay, shortDate } from "@/lib/dates"
import { useMemberMap, useNow, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName, firstName } from "@/domains/workspace/types"
import { taskKey } from "@/domains/tasks/config"
import { useTaskPanel } from "@/domains/tasks/panel-state"
import { useMarkRead, useNotifications, type Notification } from "../data"

/** Everything that happened to you: assignments, sign-offs, comments, meetings. */
export function InboxPage() {
  const { data = [], isLoading } = useNotifications()
  const markRead = useMarkRead()
  const today = useToday()
  const [tab, setTab] = useState<"unread" | "all">("unread")
  const unread = data.filter((n) => !n.read_at)
  const shown = tab === "unread" ? unread : data

  const groups = useMemo(() => {
    const out: { label: string; items: Notification[] }[] = []
    for (const n of shown) {
      const age = diffDays(today, isoDay(n.created_at))
      const label = age === 0 ? "Today" : age === 1 ? "Yesterday" : age < 7 ? "This week" : "Earlier"
      const group = out.find((g) => g.label === label)
      if (group) group.items.push(n)
      else out.push({ label, items: [n] })
    }
    return out
  }, [shown, today])

  return (
    <>
      <PageHeader
        title="Inbox"
        icon={InboxIcon}
        actions={
          unread.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5" onClick={() => markRead.mutate(unread.map((n) => n.id))}>
              <Icon icon={Tick02Icon} size={14} />
              Mark all read
            </Button>
          )
        }
      >
        {unread.length > 0 && <span className="text-xs text-fg-3 tabular">{unread.length} unread</span>}
      </PageHeader>
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-3 sm:px-4">
        {(["unread", "all"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium",
              tab === t ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
            )}
          >
            {t === "unread" ? "Unread" : "All"}
            <span className="text-fg-3 tabular">{t === "unread" ? unread.length : data.length}</span>
          </button>
        ))}
      </div>
      <PageBody>
        {!isLoading && shown.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={tab === "unread" ? "You're all caught up" : "Nothing yet"}
            description="When someone assigns you work, asks for your sign-off, comments or invites you to a meeting, it lands here."
          />
        ) : (
          <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6">
            {groups.map((g) => (
              <section key={g.label} className="mb-6">
                <h2 className="mb-1 px-2 text-xs font-medium text-fg-3">{g.label}</h2>
                <ul>
                  {g.items.map((n) => (
                    <Row key={n.id} n={n} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}

function Row({ n }: { n: Notification }) {
  const members = useMemberMap()
  const tasks = useTasks()
  const now = useNow()
  const today = useToday()
  const markRead = useMarkRead()
  const { open } = useTaskPanel()
  const router = useRouter()
  const actor = n.actor_id ? members.get(n.actor_id) : null
  const task = n.task_id ? tasks.find((t) => t.id === n.task_id) : null
  const meta = (n.meta ?? {}) as { excerpt?: string; title?: string; starts_at?: string }
  const strong = (s: ReactNode) => <span className="font-medium text-fg">{s}</span>
  const subject = task ? strong(task.title) : strong("a task")

  const sentence: ReactNode = (() => {
    switch (n.type) {
      case "assigned": return <>assigned you {subject}</>
      case "unassigned": return <>took you off {subject}</>
      case "completed": return <>finished {subject}</>
      case "reopened": return <>reopened {subject}</>
      case "review": return <>asked you to sign off {subject}</>
      case "comment": return <>commented on {subject}</>
      case "mention": return <>mentioned you on {subject}</>
      case "meeting": return <>invited you to {strong(meta.title ?? "a meeting")}</>
      default: return <>updated {subject}</>
    }
  })()

  const detail =
    (n.type === "comment" || n.type === "mention") && meta.excerpt
      ? `“${meta.excerpt}”`
      : n.type === "meeting" && meta.starts_at
        ? `${shortDate(isoDay(meta.starts_at), today)} at ${clockTime(meta.starts_at)}`
        : task
          ? taskKey(task)
          : null

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (!n.read_at) markRead.mutate([n.id])
          if (task) open(task.number)
          else if (n.type === "meeting") router.push("/calendar")
        }}
        className="group flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-hover"
      >
        <span className="mt-2 flex w-2 shrink-0 justify-center">
          {!n.read_at && <span className="size-1.5 rounded-full bg-brand" aria-label="Unread" />}
        </span>
        <Avatar id={actor?.id ?? "x"} name={displayName(actor)} size="md" />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm leading-5", n.read_at ? "text-fg-3" : "text-fg-2")}>
            <span className="font-medium text-fg">{firstName(actor)}</span> {sentence}
          </span>
          {detail && <span className="mt-0.5 block truncate text-xs text-fg-3">{detail}</span>}
        </span>
        <span className="mt-0.5 shrink-0 text-xs text-fg-4 tabular">{ago(n.created_at, now)}</span>
      </button>
    </li>
  )
}
