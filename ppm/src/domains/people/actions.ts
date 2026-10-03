"use server"

import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServer } from "@/lib/supabase/server"
import { APP_URL } from "@/lib/env"
import type { Role } from "@/domains/workspace/types"
import { deliverNotifications } from "@/domains/inbox/actions"

// Managing people needs the service role (inviting, banning, changing roles),
// which skips the database's rules. So every action here checks the caller's
// role first, and the rules match the live PPM's: only a super admin makes,
// changes or removes an admin.

type Result = { ok: true; message?: string } | { ok: false; error: string }

const RANK: Record<Role, number> = { staff: 1, admin: 2, super_admin: 3 }

/** One of the PPM's three roles, and nothing else ("client" belongs to the portal). */
function isRole(value: unknown): value is Role {
  return typeof value === "string" && Object.hasOwn(RANK, value)
}

async function caller() {
  const supabase = await createSupabaseServer()
  const { data } = await supabase.auth.getClaims()
  const uid = data?.claims?.sub
  if (!uid) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,deactivated_at")
    .eq("id", uid)
    .single()
  if (!profile || profile.deactivated_at) return null
  return { uid, role: profile.role as Role, supabase }
}

async function target(userId: string) {
  const admin = createSupabaseAdmin()
  const { data } = await admin.from("profiles").select("id,role,email,full_name,deactivated_at").eq("id", userId).single()
  return data as { id: string; role: Role; email: string | null; full_name: string | null; deactivated_at: string | null } | null
}

/** Admins manage staff; only a super admin manages admins and super admins. */
function mayManage(me: Role, them: Role) {
  if (me === "super_admin") return true
  return me === "admin" && them === "staff"
}

export async function inviteMember(input: { email: string; fullName: string; role: Role; title?: string }): Promise<Result> {
  const me = await caller()
  if (!me || RANK[me.role] < RANK.admin) return { ok: false, error: "Only admins can invite people." }
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That doesn't look like an email address." }
  if (!isRole(input.role)) return { ok: false, error: "Choose a role." }
  if (RANK[input.role] >= RANK.admin && me.role !== "super_admin") {
    return { ok: false, error: "Only a super admin can invite an admin." }
  }

  const admin = createSupabaseAdmin()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: input.fullName.trim() },
    redirectTo: `${APP_URL}/auth/confirm?next=/welcome`,
  })
  if (error || !data.user) {
    const taken = error?.message?.toLowerCase().includes("already")
    return { ok: false, error: taken ? "Someone with that email already has an account." : error?.message ?? "The invitation didn't send." }
  }

  const { error: pErr } = await admin.from("profiles").upsert({
    id: data.user.id,
    role: input.role,
    full_name: input.fullName.trim() || null,
    email,
    title: input.title?.trim() || null,
  })
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: pErr.message }
  }
  return { ok: true, message: `Invitation sent to ${email}.` }
}

export async function changeRole(userId: string, role: Role): Promise<Result> {
  const me = await caller()
  if (!me) return { ok: false, error: "Sign in again." }
  if (userId === me.uid) return { ok: false, error: "You can't change your own role. Ask another admin." }
  if (!isRole(role)) return { ok: false, error: "Choose a role." }
  const them = await target(userId)
  if (!them) return { ok: false, error: "That person wasn't found." }
  if (!mayManage(me.role, them.role) || !mayManage(me.role, role)) {
    return { ok: false, error: "Only a super admin can make or change an admin." }
  }

  const admin = createSupabaseAdmin()
  if (them.role === "super_admin" && role !== "super_admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .is("deactivated_at", null)
    if ((count ?? 0) <= 1) return { ok: false, error: "There has to be at least one super admin." }
  }
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Turns off someone's access without deleting their history. Their open work
 * can go to someone else in the same step, so nothing is left without an owner.
 */
export async function deactivateMember(userId: string, reassignTo: string | null): Promise<Result> {
  const me = await caller()
  if (!me) return { ok: false, error: "Sign in again." }
  if (userId === me.uid) return { ok: false, error: "You can't deactivate yourself." }
  const them = await target(userId)
  if (!them) return { ok: false, error: "That person wasn't found." }
  if (!mayManage(me.role, them.role)) return { ok: false, error: "Only a super admin can deactivate an admin." }
  if (reassignTo) {
    const to = reassignTo === userId ? null : await target(reassignTo)
    if (!to || to.deactivated_at || !isRole(to.role)) return { ok: false, error: "Hand their work to someone who's still on the team." }
  }

  // Hand over open work as the person doing it, so the history says who did.
  if (reassignTo !== undefined) {
    const { error: rErr } = await me.supabase
      .from("ppm_tasks")
      .update({ assignee_id: reassignTo })
      .eq("assignee_id", userId)
      .in("status", ["backlog", "todo", "in_progress", "in_review"])
      .is("deleted_at", null)
    if (rErr) return { ok: false, error: rErr.message }
  }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from("profiles").update({ deactivated_at: new Date().toISOString() }).eq("id", userId)
  if (error) return { ok: false, error: error.message }
  await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" })
  await deliverNotifications()
  return { ok: true, message: `${them.full_name ?? them.email} can no longer sign in.` }
}

export async function reactivateMember(userId: string): Promise<Result> {
  const me = await caller()
  if (!me) return { ok: false, error: "Sign in again." }
  const them = await target(userId)
  if (!them) return { ok: false, error: "That person wasn't found." }
  if (!mayManage(me.role, them.role)) return { ok: false, error: "Only a super admin can reactivate an admin." }
  const admin = createSupabaseAdmin()
  const { error } = await admin.from("profiles").update({ deactivated_at: null }).eq("id", userId)
  if (error) return { ok: false, error: error.message }
  await admin.auth.admin.updateUserById(userId, { ban_duration: "none" })
  return { ok: true, message: `${them.full_name ?? them.email} can sign in again.` }
}

/** People set their own passwords: an admin can only send the reset email. */
export async function sendPasswordReset(userId: string): Promise<Result> {
  const me = await caller()
  if (!me) return { ok: false, error: "Sign in again." }
  const them = await target(userId)
  if (!them?.email) return { ok: false, error: "That person has no email address." }
  if (userId !== me.uid && !mayManage(me.role, them.role)) {
    return { ok: false, error: "Only a super admin can reset an admin's password." }
  }
  const admin = createSupabaseAdmin()
  const { error } = await admin.auth.resetPasswordForEmail(them.email, {
    redirectTo: `${APP_URL}/auth/confirm?next=/welcome`,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, message: `Reset link sent to ${them.email}.` }
}

export async function updateTitle(userId: string, title: string): Promise<Result> {
  const me = await caller()
  if (!me) return { ok: false, error: "Sign in again." }
  const them = await target(userId)
  if (!them) return { ok: false, error: "That person wasn't found." }
  if (userId !== me.uid && !mayManage(me.role, them.role)) return { ok: false, error: "You can't edit this person." }
  const admin = createSupabaseAdmin()
  const { error } = await admin.from("profiles").update({ title: title.trim() || null }).eq("id", userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** For someone invited who hasn't set their password yet: a fresh link. */
export async function resendInvite(userId: string): Promise<Result> {
  const me = await caller()
  if (!me || RANK[me.role] < RANK.admin) return { ok: false, error: "Only admins can invite people." }
  const them = await target(userId)
  if (!them?.email) return { ok: false, error: "That person has no email address." }
  if (!mayManage(me.role, them.role)) return { ok: false, error: "Only a super admin can invite an admin." }
  const admin = createSupabaseAdmin()
  const { error } = await admin.auth.admin.inviteUserByEmail(them.email, {
    data: { full_name: them.full_name ?? "" },
    redirectTo: `${APP_URL}/auth/confirm?next=/welcome`,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, message: `A new invitation is on its way to ${them.email}.` }
}
