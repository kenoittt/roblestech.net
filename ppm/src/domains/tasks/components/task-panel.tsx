"use client"

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Delete02Icon,
  LayoutTemplateIcon,
  Link01Icon,
  LockKeyIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar } from "@/components/app/avatar"
import { Icon } from "@/components/app/icon"
import { Kbd } from "@/components/app/page"
import { cn } from "@/lib/utils"
import { ago, dueLabel, shortDate } from "@/lib/dates"
import { useMarkRead, useNotifications } from "@/domains/inbox/data"
import { useMe, useMemberMap, useNow, useProjectMap, useTasks, useToday } from "@/domains/workspace/provider"
import { displayName, firstName, type Member } from "@/domains/workspace/types"
import {
  POLICY_META,
  PRIORITY_META,
  REPEAT_META,
  STATUS_META,
  canComplete,
  isOpen,
  signsOffAsAdmin,
  taskKey,
  upcomingDue,
  type Policy,
  type Priority,
  type Repeat,
  type Status,
  type Task,
} from "../config"
import {
  useChecklistActions,
  useDeleteComment,
  useDeleteTask,
  useSaveDescription,
  useTaskDetail,
  useUpdateTask,
  type Comment,
  type TaskEvent,
} from "../data"
import { useTaskPanel } from "../panel-state"
import { describeEvent } from "./history"
import { CommentComposer, withMentions } from "./comment-composer"
import { TaskFiles } from "./task-files"
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./glyphs"
import { DueDatePicker, PickerMenu, policyOptions, priorityOptions, repeatOptions, statusOptions, usePeopleOptions, useProjectOptions } from "./pickers"
import { useAdminSignOffNote, useDoneBlock } from "./task-properties"
import { useUI } from "@/components/app/ui-state"
import { dueOffset } from "@/domains/templates/data"

export function TaskPanel() {
  return (
    <Suspense fallback={null}>
      <PanelHost />
    </Suspense>
  )
}

function PanelHost() {
  const { current, close } = useTaskPanel()
  const tasks = useTasks()
  const task = current ? tasks.find((t) => t.number === current) ?? null : null
  const reduce = useReducedMotion()

  return (
    <AnimatePresence>
      {task && (
        <motion.aside
          key="task-panel"
          role="complementary"
          aria-label={`${taskKey(task)}: ${task.title}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateX(28px)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateX(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateX(20px)", transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-surface shadow-[-24px_0_48px_-24px_rgb(0_0_0/0.45)] sm:w-[min(640px,92%)]"
        >
          <PanelBody task={task} onClose={close} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function PanelBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const me = useMe()
  const members = useMemberMap()
  const projects = useProjectMap()
  const tasks = useTasks()
  const { open } = useTaskPanel()
  const update = useUpdateTask()
  const del = useDeleteTask()
  const detail = useTaskDetail(task.id)
  const { openCreateTask } = useUI()
  const block = useDoneBlock(task)
  const { data: notifications } = useNotifications()
  const markRead = useMarkRead()
  const project = task.project_id ? projects.get(task.project_id) : null

  // Opening a task clears its notifications.
  useEffect(() => {
    const unread = notifications?.filter((n) => n.task_id === task.id && !n.read_at).map((n) => n.id) ?? []
    if (unread.length) markRead.mutate(unread)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, notifications?.length])

  // Escape closes; Alt+Up/Down steps through the open tasks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.closest("input, textarea, [contenteditable]")
      if (e.key === "Escape" && !typing && !document.querySelector("[data-open][role=dialog], [role=menu], [role=listbox]")) {
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const siblings = useMemo(() => tasks.filter((t) => isOpen(t.status)).sort((a, b) => a.number - b.number), [tasks])
  const index = siblings.findIndex((t) => t.id === task.id)
  const step = (d: number) => {
    const next = siblings[index + d]
    if (next) open(next.number)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/tasks?task=${task.number}`)
    toast("Link copied", { description: `${taskKey(task)} · ${task.title}` })
  }

  const closed = !isOpen(task.status)
  const canDone = canComplete(task, me.id, me.role)
  const asAdmin = signsOffAsAdmin(task, me.id, me.role)
  const adminNote = useAdminSignOffNote(task)
  const primary = (() => {
    if (task.status === "done") return { label: "Reopen", patch: { status: "todo" }, done: false }
    if (task.status === "cancelled") return { label: "Restore", patch: { status: "todo" }, done: false }
    if (canDone) return { label: asAdmin ? "Sign off as admin" : "Mark done", patch: { status: "done" }, done: true }
    if (task.status !== "in_review") return { label: "Request sign-off", patch: { status: "in_review" }, done: false }
    return null
  })()

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-line px-3">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          {project ? (
            <a href={`/projects/${project.id}`} className="hidden min-w-0 items-center gap-1.5 text-fg-3 hover:text-fg sm:flex">
              <ProjectSwatch color={project.color} size={9} />
              <span className="truncate">{project.name}</span>
            </a>
          ) : (
            <span className="hidden text-fg-3 sm:inline">No project</span>
          )}
          <span className="hidden text-fg-4 sm:inline">/</span>
          <span className="font-mono text-xs whitespace-nowrap text-fg-2 tabular">{taskKey(task)}</span>
          {task.is_private && (
            <span title="Private: only the creator and the assignee see it" className="ml-1 text-fg-3">
              <Icon icon={LockKeyIcon} size={13} />
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {primary && (
            <button
              type="button"
              onClick={() => update.mutate({ id: task.id, patch: primary.patch })}
              title={primary.done && adminNote ? adminNote : undefined}
              className={cn(
                "pressable mr-1.5 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap",
                primary.done
                  ? "bg-brand-solid text-white hover:bg-brand-solid-hover"
                  : "border border-line text-fg-2 hover:bg-hover hover:text-fg",
              )}
            >
              {primary.done && <StatusIcon status="done" size={13} className="[&_circle]:fill-white [&_path]:stroke-[var(--brand-solid)]" />}
              {primary.label}
            </button>
          )}
          <span className="hidden sm:contents">
            <HeaderButton label="Previous task" icon={ArrowUp01Icon} onClick={() => step(-1)} disabled={index <= 0} />
            <HeaderButton label="Next task" icon={ArrowDown01Icon} onClick={() => step(1)} disabled={index === -1 || index >= siblings.length - 1} />
          </span>
          <HeaderButton label="Copy link" icon={Link01Icon} onClick={copyLink} />
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More actions" className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg data-popup-open:bg-hover">
              <Icon icon={MoreHorizontalIcon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {task.created_by === me.id && (
                <DropdownMenuItem onClick={() => update.mutate({ id: task.id, patch: { is_private: !task.is_private } })}>
                  <Icon icon={task.is_private ? ViewIcon : LockKeyIcon} className="text-fg-3" />
                  {task.is_private ? "Show to the team" : "Make private"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={copyLink}>
                <Icon icon={Link01Icon} className="text-fg-3" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  // The new-task dialog, saving a template: everything this task has, to change before saving.
                  openCreateTask(
                    {
                      title: task.title,
                      description: detail.data?.task.description ?? null,
                      status: task.status,
                      priority: task.priority,
                      project_id: task.project_id,
                      assignee_id: task.assignee_id,
                      reviewer_id: task.reviewer_id,
                      completion_policy: task.completion_policy,
                      completion_approvers: task.completion_approvers,
                      is_private: task.is_private,
                    },
                    {
                      asTemplate: {
                        checklist: (detail.data?.checklist ?? []).map((c) => c.title),
                        dueInDays: dueOffset(task),
                        // Your own routine goes to whoever uses it; someone else's stays theirs.
                        assign: task.assignee_id === me.id ? "user" : task.assignee_id ? "person" : "nobody",
                      },
                    },
                  )
                }
              >
                <Icon icon={LayoutTemplateIcon} className="text-fg-3" />
                Save as template…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  del.mutate(task)
                  onClose()
                }}
              >
                <Icon icon={Delete02Icon} />
                Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <HeaderButton label="Close" shortcut="Esc" icon={Cancel01Icon} onClick={onClose} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 pt-5 pb-4">
          <TitleEditor task={task} closed={closed} />
          {block && !closed && (
            <p className="mt-2 text-xs text-fg-3">{block}</p>
          )}
        </div>

        <Properties task={task} />

        <div className="px-6 py-5">
          <Description taskId={task.id} description={detail.data?.task.description ?? null} loading={detail.isLoading} />
        </div>

        <Checklist taskId={task.id} items={detail.data?.checklist ?? []} />

        <TaskFiles taskId={task.id} />

        <Activity
          task={task}
          events={detail.data?.events ?? []}
          comments={detail.data?.comments ?? []}
          members={members}
        />
      </div>
    </>
  )
}

function HeaderButton({
  label,
  icon,
  onClick,
  disabled,
  shortcut,
}: {
  label: string
  icon: typeof Cancel01Icon
  onClick: () => void
  disabled?: boolean
  shortcut?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className="pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg disabled:opacity-35"
      >
        <Icon icon={icon} />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut && <Kbd className="ml-1">{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

function TitleEditor({ task, closed }: { task: Task; closed: boolean }) {
  const update = useUpdateTask()
  const [draft, setDraft] = useState(task.title)
  const ref = useRef<HTMLTextAreaElement>(null)

  // A new task, or someone else's rename, replaces the draft.
  const [shownFor, setShownFor] = useState(task.id + task.title)
  if (shownFor !== task.id + task.title) {
    setShownFor(task.id + task.title)
    setDraft(task.title)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  const save = () => {
    const title = draft.trim()
    if (!title) return setDraft(task.title)
    if (title !== task.title) update.mutate({ id: task.id, patch: { title } })
  }

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      aria-label="Title"
      onChange={(e) => setDraft(e.target.value.replace(/\n/g, ""))}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        }
        if (e.key === "Escape") {
          setDraft(task.title)
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent text-xl font-semibold tracking-[-0.015em] outline-none placeholder:text-fg-4",
        closed ? "text-fg-2" : "text-fg",
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Properties: two quiet columns of label and value; every value is a picker
// ---------------------------------------------------------------------------
const valueButton =
  "pressable -mx-1.5 inline-flex h-7 max-w-full min-w-0 items-center gap-2 rounded-md px-1.5 text-sm text-fg hover:bg-hover data-popup-open:bg-hover"

function Properties({ task }: { task: Task }) {
  const update = useUpdateTask()
  const members = useMemberMap()
  const projects = useProjectMap()
  const today = useToday()
  const now = useNow()
  const block = useDoneBlock(task)
  const adminNote = useAdminSignOffNote(task)
  const statusOpts = useMemo(() => statusOptions(block), [block])
  const priorityOpts = useMemo(() => priorityOptions(), [])
  const people = usePeopleOptions({ projectId: task.project_id })
  const reviewers = usePeopleOptions({ projectId: task.project_id, noneLabel: "No reviewer" })
  const approvers = usePeopleOptions({ projectId: task.project_id, includeNone: false })
  const projectOpts = useProjectOptions()
  const policyOpts = useMemo(() => policyOptions(), [])
  const repeatOpts = useMemo(() => repeatOptions(), [])
  const nextOne = isOpen(task.status) ? upcomingDue(task, today) : null
  const patch = (p: Parameters<typeof update.mutate>[0]["patch"]) => update.mutate({ id: task.id, patch: p })

  const assignee = task.assignee_id ? members.get(task.assignee_id) : null
  const reviewer = task.reviewer_id ? members.get(task.reviewer_id) : null
  const creator = task.created_by ? members.get(task.created_by) : null
  const project = task.project_id ? projects.get(task.project_id) : null
  // "Chosen people" isn't saved until someone is chosen: an empty list would leave
  // a task only admins could finish. Until then the picker below asks for a name.
  const [choosingFor, setChoosingFor] = useState<string | null>(null)
  const choosingPeople = choosingFor === task.id
  const setChoosingPeople = (on: boolean) => setChoosingFor(on ? task.id : null)
  const policy = (choosingPeople ? "specific" : task.completion_policy) as Policy

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-0.5 border-y border-line px-6 py-3 sm:grid-cols-2">
      <Prop label="Status">
        <PickerMenu
          triggerLabel="Status"
          triggerClassName={valueButton}
          trigger={<><StatusIcon status={task.status} /><span>{STATUS_META[task.status as Status]?.label}</span></>}
          options={statusOpts}
          value={task.status}
          placeholder="Change status…"
          onSelect={(status) => status !== task.status && patch({ status })}
          footer={block ?? adminNote ?? undefined}
        />
      </Prop>
      <Prop label="Priority">
        <PickerMenu
          triggerLabel="Priority"
          triggerClassName={valueButton}
          trigger={<><PriorityIcon priority={task.priority} /><span className={task.priority === "none" ? "text-fg-3" : ""}>{PRIORITY_META[task.priority as Priority]?.label}</span></>}
          options={priorityOpts}
          value={task.priority}
          placeholder="Set priority…"
          onSelect={(priority) => patch({ priority })}
        />
      </Prop>
      <Prop label="Assignee">
        <PickerMenu
          triggerLabel="Assignee"
          triggerClassName={valueButton}
          trigger={<Person member={assignee} empty="Unassigned" />}
          options={people}
          value={task.assignee_id ?? "none"}
          placeholder="Assign to…"
          width="w-80"
          onSelect={(v) => patch({ assignee_id: v === "none" ? null : v })}
        />
      </Prop>
      <Prop label="Due date">
        <DueDatePicker
          value={task.due_date}
          onChange={(due_date) => patch({ due_date })}
          triggerClassName={valueButton}
          trigger={
            task.due_date ? (
              <span className={cn(isOpen(task.status) && task.due_date < today ? "text-danger" : "")}>
                {dueLabel(task.due_date, today)}
                {dueLabel(task.due_date, today) !== shortDate(task.due_date, today) && (
                  <span className="ml-1.5 text-fg-3">{shortDate(task.due_date, today)}</span>
                )}
              </span>
            ) : (
              <span className="text-fg-3">No due date</span>
            )
          }
        />
      </Prop>
      <Prop label="Project">
        <PickerMenu
          triggerLabel="Project"
          triggerClassName={valueButton}
          trigger={project ? <><ProjectSwatch color={project.color} size={9} /><span className="truncate">{project.name}</span></> : <span className="text-fg-3">No project</span>}
          options={projectOpts}
          value={task.project_id ?? "none"}
          placeholder="Move to project…"
          onSelect={(v) => patch({ project_id: v === "none" ? null : v })}
        />
      </Prop>
      <Prop label="Repeats">
        <PickerMenu
          triggerLabel="Repeats"
          triggerClassName={valueButton}
          trigger={
            task.repeat ? (
              <>
                <Icon icon={RepeatIcon} size={14} className="text-fg-3" />
                <span>{REPEAT_META[task.repeat as Repeat]?.label}</span>
              </>
            ) : (
              <span className="text-fg-3">Doesn't repeat</span>
            )
          }
          options={repeatOpts}
          value={task.repeat ?? "none"}
          placeholder="Repeat…"
          onSelect={(v) => patch({ repeat: v === "none" ? null : v })}
          footer={
            nextOne
              ? `When it's done, the next one is made for you, due ${shortDate(nextOne, today)}.`
              : "When a repeating task is done, the next one is made for you."
          }
        />
      </Prop>
      <Prop label="Reviewer">
        <PickerMenu
          triggerLabel="Reviewer"
          triggerClassName={valueButton}
          trigger={<Person member={reviewer} empty="No reviewer" />}
          options={reviewers}
          value={task.reviewer_id ?? "none"}
          placeholder="Choose a reviewer…"
          width="w-80"
          onSelect={(v) => patch({ reviewer_id: v === "none" ? null : v })}
        />
      </Prop>
      <Prop label="Sign-off" hint="Who can mark this task done">
        <PickerMenu
          triggerLabel="Who can mark it done"
          triggerClassName={valueButton}
          trigger={<span className={policy === "anyone" ? "text-fg-2" : ""}>{POLICY_META[policy]?.label}</span>}
          options={policyOpts}
          value={policy}
          placeholder="Who can mark it done?"
          width="w-80"
          onSelect={(v) => {
            if (v === "specific" && !task.completion_approvers.length) {
              setChoosingPeople(true)
              return
            }
            setChoosingPeople(false)
            patch({ completion_policy: v })
          }}
          footer={POLICY_META[policy]?.hint}
        />
      </Prop>
      {policy === "specific" ? (
        <Prop label="Signed off by">
          <PickerMenu
            triggerLabel="People who can sign it off"
            triggerClassName={valueButton}
            multiple
            trigger={
              task.completion_approvers.length ? (
                <span className="truncate">{task.completion_approvers.map((id) => displayName(members.get(id))).join(", ")}</span>
              ) : (
                <span className={choosingPeople ? "text-warning" : "text-fg-3"}>Choose people</span>
              )
            }
            options={approvers}
            value={task.completion_approvers}
            placeholder="Who can sign it off?"
            width="w-80"
            onSelect={(v) => {
              const set = new Set(task.completion_approvers)
              if (set.has(v)) set.delete(v)
              else set.add(v)
              if (!set.size) {
                toast.error("Keep at least one person", { description: "Or change who can mark it done." })
                return
              }
              if (choosingPeople) {
                setChoosingPeople(false)
                patch({ completion_policy: "specific", completion_approvers: [...set] })
              } else patch({ completion_approvers: [...set] })
            }}
            footer={choosingPeople ? "Pick at least one person. The rule changes once you do." : undefined}
          />
        </Prop>
      ) : (
        <Prop label="Created">
          <span className="flex h-7 min-w-0 items-center gap-2 text-sm text-fg-2">
            {creator && <Avatar id={creator.id} name={displayName(creator)} size="sm" />}
            <span className="truncate">
              {displayName(creator)} <span className="text-fg-3">· {ago(task.created_at, now)}</span>
            </span>
          </span>
        </Prop>
      )}
    </dl>
  )
}

function Prop({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 min-w-0 items-center gap-3">
      <dt className="w-[84px] shrink-0 text-xs text-fg-3" title={hint}>
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

function Person({ member, empty }: { member: Member | null | undefined; empty: string }) {
  if (!member) return <span className="text-fg-3">{empty}</span>
  return (
    <>
      <Avatar id={member.id} name={displayName(member)} size="sm" muted={Boolean(member.deactivated_at)} />
      <span className="truncate">{displayName(member)}</span>
    </>
  )
}

// ---------------------------------------------------------------------------
// Description: reads as formatted text, edits as plain Markdown
// ---------------------------------------------------------------------------
function Description({ taskId, description, loading }: { taskId: string; description: string | null; loading: boolean }) {
  const save = useSaveDescription()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.max(96, el.scrollHeight)}px`
  }, [draft, editing])

  if (loading) return <div className="h-16" />

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setDraft(description ?? "")
          setEditing(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setDraft(description ?? "")
            setEditing(true)
          }
        }}
        className="-mx-2 cursor-text rounded-md px-2 py-1.5 hover:bg-hover"
      >
        {description?.trim() ? (
          <div className="prose-app">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-fg-4">Add a description…</p>
        )}
      </div>
    )
  }

  const commit = () => {
    setEditing(false)
    if (draft !== (description ?? "")) save.mutate({ id: taskId, description: draft })
  }

  return (
    <div>
      <textarea
        ref={ref}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit()
          if (e.key === "Escape") setEditing(false)
        }}
        placeholder="Add a description… Markdown works: lists, **bold**, links."
        className="-mx-2 w-[calc(100%+1rem)] resize-none rounded-md border border-line-strong bg-transparent px-2 py-1.5 text-sm leading-6 text-fg outline-none placeholder:text-fg-4"
      />
      <p className="mt-1 text-xs text-fg-4">
        Saves when you click away. <Kbd>⌘</Kbd> <Kbd>Enter</Kbd> to finish.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------
function Checklist({ taskId, items }: { taskId: string; items: { id: string; title: string; done: boolean; task_id: string; sort: number }[] }) {
  const { add, toggle, remove } = useChecklistActions(taskId)
  const [draft, setDraft] = useState("")
  const [adding, setAdding] = useState(false)
  const done = items.filter((i) => i.done).length

  if (items.length === 0 && !adding) {
    return (
      <div className="px-6 pb-4">
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-fg-3 hover:text-fg">
          + Add a checklist
        </button>
      </div>
    )
  }

  return (
    <section className="border-t border-line px-6 py-4">
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-xs font-medium text-fg-2">Checklist</h3>
        <span className="text-xs text-fg-3 tabular">
          {done}/{items.length}
        </span>
        <span className="h-1 max-w-32 flex-1 overflow-hidden rounded-full bg-chart-track">
          <span
            className="block h-full rounded-full bg-status-done transition-[width] duration-300 ease-out"
            style={{ width: items.length ? `${(done / items.length) * 100}%` : "0%" }}
          />
        </span>
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group/item -mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 hover:bg-hover">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle.mutate(item)}
              aria-label={item.title}
              className="size-3.5 accent-[var(--brand-solid)]"
            />
            <span className={cn("min-w-0 flex-1 truncate text-sm", item.done ? "text-fg-3 line-through decoration-fg-4" : "text-fg")}>
              {item.title}
            </span>
            <button
              type="button"
              aria-label={`Remove ${item.title}`}
              onClick={() => remove.mutate(item)}
              className="text-fg-4 opacity-0 group-hover/item:opacity-100 hover:text-fg focus-visible:opacity-100"
            >
              <Icon icon={Cancel01Icon} size={12} />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const title = draft.trim()
          if (!title) return
          add.mutate(title)
          setDraft("")
        }}
        className="mt-1"
      >
        <input
          autoFocus={adding}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => !draft && setAdding(false)}
          placeholder="Add an item, then Enter"
          className="h-8 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
        />
      </form>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Activity: the task's history and its comments, in one timeline
// ---------------------------------------------------------------------------
function Activity({
  task,
  events,
  comments,
  members,
}: {
  task: Task
  events: TaskEvent[]
  comments: Comment[]
  members: Map<string, Member>
}) {
  const now = useNow()
  const projects = useProjectMap()
  const me = useMe()
  const remove = useDeleteComment()

  const items = useMemo(() => {
    const list: ({ kind: "event"; at: string; e: TaskEvent } | { kind: "comment"; at: string; c: Comment })[] = [
      ...events.filter((e) => e.type !== "commented").map((e) => ({ kind: "event" as const, at: e.created_at, e })),
      ...comments.map((c) => ({ kind: "comment" as const, at: c.created_at, c })),
    ]
    return list.sort((a, b) => (a.at < b.at ? -1 : 1))
  }, [events, comments])

  return (
    <section className="border-t border-line px-6 pt-4 pb-8">
      <h3 className="mb-3 text-xs font-medium text-fg-2">Activity</h3>
      <ol className="flex flex-col gap-3">
        {items.map((item) =>
          item.kind === "event" ? (
            <li key={item.e.id} className="flex items-start gap-2.5 text-xs text-fg-3">
              <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center">
                <span className="size-1.5 rounded-full bg-fg-4" />
              </span>
              <span className="min-w-0 leading-5">
                <span className="font-medium text-fg-2">{displayName(members.get(item.e.actor_id ?? ""))}</span>{" "}
                {describeEvent(item.e, members, projects)}
                <span className="text-fg-4"> · {ago(item.e.created_at, now)}</span>
              </span>
            </li>
          ) : (
            <li key={item.c.id} className="group/comment flex items-start gap-2.5">
              <Avatar id={item.c.author_id ?? "x"} name={displayName(members.get(item.c.author_id ?? ""))} size="sm" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-fg">{displayName(members.get(item.c.author_id ?? ""))}</span>
                  <span className="text-fg-4">{ago(item.c.created_at, now)}</span>
                  {item.c.author_id === me.id && (
                    <button
                      type="button"
                      onClick={() => remove.mutate({ id: item.c.id, taskId: task.id })}
                      className="ml-auto text-fg-4 opacity-0 group-hover/comment:opacity-100 hover:text-danger"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="prose-app mt-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {withMentions(item.c.body, item.c.mentions ?? [], (id) => firstName(members.get(id)))}
                  </ReactMarkdown>
                </div>
              </div>
            </li>
          ),
        )}
      </ol>

      <div className="mt-5 flex items-start gap-2.5">
        <Avatar id={me.id} name={displayName(me)} size="sm" className="mt-1.5" />
        <CommentComposer taskId={task.id} />
      </div>
    </section>
  )
}
