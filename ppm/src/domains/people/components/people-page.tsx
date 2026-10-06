"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Key01Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserRemove01Icon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { StackedBar } from "@/components/app/charts"
import { Icon } from "@/components/app/icon"
import { ModalShell } from "@/components/app/modal"
import { EmptyState, PageBody, PageHeader } from "@/components/app/page"
import { fieldClass } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/dates"
import { useMe, useMembers, useNow, useTasks, useToday } from "@/domains/workspace/provider"
import { ROLE_META, displayName, isAdminRole, type Member, type Role } from "@/domains/workspace/types"
import { LOAD_LIMIT, workload } from "@/domains/tasks/selectors"
import { PickerMenu, usePeopleOptions } from "@/domains/tasks/components/pickers"
import { changeRole, deactivateMember, inviteMember, reactivateMember, resendInvite, sendPasswordReset } from "../actions"

/** Who can change whom: admins manage staff, super admins manage everyone. */
export function canManage(me: Pick<Member, "id" | "role">, them: Pick<Member, "id" | "role">) {
  if (me.id === them.id) return false
  if (me.role === "super_admin") return true
  return me.role === "admin" && them.role === "staff"
}

export function PeoplePage() {
  const me = useMe()
  const members = useMembers()
  const tasks = useTasks()
  const today = useToday()
  const now = useNow()
  const [tab, setTab] = useState<"active" | "deactivated">("active")
  const [query, setQuery] = useState("")
  const [inviting, setInviting] = useState(false)
  const [deactivating, setDeactivating] = useState<Member | null>(null)
  const load = useMemo(() => workload(tasks, members, today), [tasks, members, today])
  const admin = isAdminRole(me.role)

  const active = members.filter((m) => !m.deactivated_at)
  const deactivated = members.filter((m) => m.deactivated_at)
  const rows = (tab === "active" ? active : deactivated)
    .filter((m) => {
      const q = query.trim().toLowerCase()
      return !q || displayName(m).toLowerCase().includes(q) || (m.email ?? "").includes(q) || (m.title ?? "").toLowerCase().includes(q)
    })
    .sort((a, b) => (ROLE_META[b.role as Role]?.rank ?? 0) - (ROLE_META[a.role as Role]?.rank ?? 0) || displayName(a).localeCompare(displayName(b)))
  const max = Math.max(LOAD_LIMIT + 2, ...[...load.values()].map((l) => l.active))

  return (
    <>
      <PageHeader
        title="People"
        icon={UserGroupIcon}
        actions={
          admin && (
            <Button size="sm" onClick={() => setInviting(true)} className="h-7 gap-1.5 px-2.5">
              <Icon icon={UserAdd01Icon} size={14} />
              Invite
            </Button>
          )
        }
      >
        <span className="text-xs text-fg-3 tabular">{active.length} active</span>
      </PageHeader>

      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
        {(["active", "deactivated"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium",
              tab === t ? "bg-selected text-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
            )}
          >
            {t === "active" ? "Active" : "Deactivated"}
            <span className="text-fg-3 tabular">{t === "active" ? active.length : deactivated.length}</span>
          </button>
        ))}
        <label className="ml-auto flex h-7 w-52 items-center gap-1.5 rounded-md border border-line px-2 text-fg-3 focus-within:border-line-strong">
          <Icon icon={Search01Icon} size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-fg-4"
          />
        </label>
      </div>

      <PageBody>
        {rows.length === 0 ? (
          <EmptyState icon={UserGroupIcon} title={tab === "active" ? "No one matches" : "No one is deactivated"} />
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="h-9 border-b border-line text-left text-xs text-fg-3">
                <th className="pl-4 font-normal sm:pl-6">Person</th>
                <th className="w-36 font-normal">Role</th>
                <th className="w-[280px] font-normal">Workload</th>
                <th className="w-28 font-normal">Due this week</th>
                <th className="w-28 font-normal">Done this week</th>
                <th className="w-28 font-normal">Last active</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const l = load.get(m.id)
                const manageable = canManage(me, m)
                return (
                  <tr key={m.id} className="group h-14 border-b border-line/60 hover:bg-hover">
                    <td className="pl-4 sm:pl-6">
                      <Link href={`/people/${m.id}`} className="flex min-w-0 items-center gap-3">
                        <Avatar id={m.id} name={displayName(m)} size="lg" muted={Boolean(m.deactivated_at)} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">
                            {displayName(m)}
                            {m.id === me.id && <span className="ml-1.5 text-xs font-normal text-fg-3">You</span>}
                          </span>
                          <span className="block truncate text-xs text-fg-3">
                            {m.title ? `${m.title} · ` : ""}
                            {m.email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <RoleCell member={m} editable={manageable && !m.deactivated_at} viewerIsSuper={me.role === "super_admin"} />
                    </td>
                    <td>
                      {l && !m.deactivated_at ? (
                        <div className="flex items-center gap-3 pr-6">
                          <StackedBar
                            max={max}
                            marker={LOAD_LIMIT}
                            height={6}
                            segments={[
                              { key: "p", label: "In progress", value: l.inProgress, color: "var(--status-in-progress)" },
                              { key: "r", label: "In review", value: l.inReview, color: "var(--status-in-review)" },
                              { key: "t", label: "Todo", value: l.todo, color: "var(--fg-4)" },
                            ]}
                          />
                          <span className="w-24 shrink-0 text-xs tabular">
                            <span className={cn(l.active > LOAD_LIMIT ? "text-warning" : "text-fg")}>{l.active}</span>
                            <span className="text-fg-3"> open</span>
                            {l.overdue > 0 && <span className="text-danger"> · {l.overdue} late</span>}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-fg-4">—</span>
                      )}
                    </td>
                    <td className="text-xs text-fg-2 tabular">{l?.dueThisWeek ?? 0}</td>
                    <td className="text-xs text-fg-2 tabular">{l?.doneThisWeek ?? 0}</td>
                    <td className="text-xs text-fg-3 tabular">
                      {m.deactivated_at ? "Deactivated" : m.last_seen_at ? ago(m.last_seen_at, now) : <span className="text-warning">Invited</span>}
                    </td>
                    <td className="pr-3">
                      {(manageable || m.id === me.id) && <RowMenu member={m} onDeactivate={() => setDeactivating(m)} self={m.id === me.id} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <RoleGuide />
      </PageBody>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} viewerRole={me.role as Role} />
      <DeactivateDialog member={deactivating} onClose={() => setDeactivating(null)} openCount={deactivating ? load.get(deactivating.id)?.active ?? 0 : 0} />
    </>
  )
}

function RoleCell({ member, editable, viewerIsSuper }: { member: Member; editable: boolean; viewerIsSuper: boolean }) {
  const qc = useQueryClient()
  const [pending, start] = useTransition()
  const role = member.role as Role
  if (!editable) return <span className="text-xs text-fg-2">{ROLE_META[role]?.label ?? role}</span>
  const choices: Role[] = viewerIsSuper ? ["super_admin", "admin", "staff"] : ["staff"]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "pressable -ml-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-fg-2 hover:bg-selected hover:text-fg data-popup-open:bg-selected",
          pending && "opacity-50",
        )}
      >
        {ROLE_META[role]?.label}
        <svg viewBox="0 0 10 10" className="size-2.5 text-fg-4"><path d="M2.5 4 5 6.5 7.5 4" stroke="currentColor" fill="none" strokeWidth="1.3" strokeLinecap="round" /></svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuRadioGroup
          value={role}
          onValueChange={(v) =>
            start(async () => {
              const res = await changeRole(member.id, v as Role)
              if (!res.ok) toast.error(res.error)
              else toast(`${displayName(member)} is now ${ROLE_META[v as Role].label.toLowerCase()}`)
              // Either way, show the roles as the database has them now: a refusal can
              // mean this screen was out of date (someone's role changed since it loaded).
              qc.invalidateQueries({ queryKey: ["members"] })
            })
          }
        >
          <DropdownMenuLabel>Role</DropdownMenuLabel>
          {choices.map((r) => (
            <DropdownMenuRadioItem key={r} value={r} className="items-start py-1.5">
              <span className="flex flex-col">
                <span className="text-fg">{ROLE_META[r].label}</span>
                <span className="text-xs text-fg-3">{ROLE_META[r].hint}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {!viewerIsSuper && <p className="px-2 pt-1 pb-1.5 text-xs text-fg-4">You're an admin. Only a super admin can make someone an admin.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RowMenu({ member, onDeactivate, self }: { member: Member; onDeactivate: () => void; self: boolean }) {
  const qc = useQueryClient()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else if (res.message) toast(res.message)
      qc.invalidateQueries({ queryKey: ["members"] })
    })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${displayName(member)}`}
        className={cn(
          "pressable inline-flex size-7 items-center justify-center rounded-md text-fg-3 opacity-0 group-hover:opacity-100 hover:bg-selected hover:text-fg focus-visible:opacity-100 data-popup-open:opacity-100",
          pending && "opacity-50",
        )}
      >
        <Icon icon={MoreHorizontalIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!member.last_seen_at && !member.deactivated_at ? (
          <DropdownMenuItem onClick={() => run(() => resendInvite(member.id))}>
            <Icon icon={Mail01Icon} className="text-fg-3" />
            Resend invitation
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => run(() => sendPasswordReset(member.id))}>
            <Icon icon={Key01Icon} className="text-fg-3" />
            Send password reset
          </DropdownMenuItem>
        )}
        {!self && (
          <>
            <DropdownMenuSeparator />
            {member.deactivated_at ? (
              <DropdownMenuItem onClick={() => run(() => reactivateMember(member.id))}>
                <Icon icon={UserCheck01Icon} className="text-fg-3" />
                Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onClick={onDeactivate}>
                <Icon icon={UserRemove01Icon} />
                Deactivate…
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RoleGuide() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 py-12 text-xs text-fg-3 sm:grid-cols-3">
      {(["super_admin", "admin", "staff"] as Role[]).map((r) => (
        <div key={r}>
          <p className="font-medium text-fg-2">{ROLE_META[r].label}</p>
          <p className="mt-1 leading-5">
            {r === "super_admin" && "Everything an admin can do, plus making, changing and removing admins."}
            {r === "admin" && "Invites staff, changes their roles, deactivates them, and manages every project."}
            {r === "staff" && "Creates, assigns and finishes tasks, plans their calendar, and manages projects they own."}
          </p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------
const inputClass = fieldClass

function InviteDialog({ open, onClose, viewerRole }: { open: boolean; onClose: () => void; viewerRole: Role }) {
  const qc = useQueryClient()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<Role>("staff")
  const choices: Role[] = viewerRole === "super_admin" ? ["staff", "admin", "super_admin"] : ["staff"]

  return (
    <ModalShell open={open} onClose={onClose} title="Invite someone">
      <form
        action={(form) =>
          start(async () => {
            setError(null)
            const res = await inviteMember({
              email: String(form.get("email") ?? ""),
              fullName: String(form.get("name") ?? ""),
              title: String(form.get("title") ?? ""),
              role,
            })
            if (!res.ok) return setError(res.error)
            toast(res.message ?? "Invitation sent")
            qc.invalidateQueries({ queryKey: ["members"] })
            onClose()
          })
        }
        className="flex flex-col gap-4 px-5 pt-3 pb-5"
      >
        <p className="text-sm text-fg-3">They get an email with a link to set their password. Nobody else ever sees it.</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Name</span>
          <input name="name" required placeholder="Full name" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Email</span>
          <input name="email" type="email" required placeholder="name@roblestech.net" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-2">Title <span className="font-normal text-fg-4">(optional)</span></span>
          <input name="title" placeholder="What they do, for example Content writer" className={inputClass} />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-fg-2">Role</legend>
          <div className="flex flex-col gap-1">
            {choices.map((r) => (
              <label
                key={r}
                className={cn(
                  "flex cursor-default items-start gap-2.5 rounded-md border px-3 py-2 transition-colors",
                  role === r ? "border-brand/60 bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 accent-[var(--brand-solid)]" />
                <span>
                  <span className="block text-sm text-fg">{ROLE_META[r].label}</span>
                  <span className="block text-xs text-fg-3">{ROLE_META[r].hint}</span>
                </span>
              </label>
            ))}
          </div>
          {viewerRole !== "super_admin" && <p className="text-xs text-fg-4">You're an admin. Only a super admin can invite an admin.</p>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send invitation"}</Button>
        </div>
      </form>
    </ModalShell>
  )
}

function DeactivateDialog({ member, onClose, openCount }: { member: Member | null; onClose: () => void; openCount: number }) {
  const qc = useQueryClient()
  const router = useRouter()
  const people = usePeopleOptions({ noneLabel: "Leave them unassigned" }).filter((o) => o.value !== member?.id)
  const [to, setTo] = useState<string>("none")
  const [pending, start] = useTransition()
  const chosen = people.find((p) => p.value === to)

  return (
    <ModalShell open={Boolean(member)} onClose={onClose} title={`Deactivate ${member ? displayName(member) : ""}?`}>
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
        <p className="text-sm text-fg-3">
          They won't be able to sign in. Their history stays: everything they did keeps their name. You can reactivate them later.
        </p>
        {openCount > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-2">
              Hand over their {openCount} open {openCount === 1 ? "task" : "tasks"} to
            </span>
            <PickerMenu
              triggerLabel="Hand over to"
              triggerClassName="pressable flex h-9 w-full items-center gap-2 rounded-md border border-line-strong px-3 text-left text-sm text-fg hover:bg-hover"
              trigger={<>{chosen?.icon}<span className="truncate">{chosen?.label ?? "Choose"}</span></>}
              options={people}
              value={to}
              placeholder="Hand over to…"
              width="w-80"
              onSelect={setTo}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !member}
            onClick={() =>
              start(async () => {
                const res = await deactivateMember(member!.id, to === "none" ? null : to)
                if (!res.ok) return void toast.error(res.error)
                toast(res.message ?? "Deactivated")
                qc.invalidateQueries({ queryKey: ["members"] })
                qc.invalidateQueries({ queryKey: ["tasks"] })
                router.refresh()
                onClose()
              })
            }
          >
            {pending ? "Deactivating…" : "Deactivate"}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

