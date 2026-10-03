"use server"

import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServer } from "@/lib/supabase/server"
import type { Role } from "@/domains/workspace/types"
import { deliverNotifications } from "@/domains/inbox/actions"
import { emailConfigured, emailLayout, sendMail } from "@/lib/email"

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


// Invitations and password resets are emailed by the PPM itself, through the
// same Microsoft 365 setup as its notifications. The database's own email
// templates and Site URL belong to the client portal (both apps share Supabase
// project A), so the PPM asks Supabase only for the link (generateLink sends
// nothing) and builds the email here. /auth/confirm checks the token.
const NO_EMAIL = "Email isn't set up on this server yet, so nothing can be sent. Ask Kenneth to add the Microsoft 365 settings."

function authLinkEmail(kind: "invite" | "recovery", hashedToken: string, name: string | null) {
  const path = `/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${kind}&next=/welcome`
  return kind === "invite"
    ? {
        subject: "You're invited to the RTC PPM",
        ...emailLayout({
          heading: "You're invited to the PPM",
          lines: [
            `Hi${name ? ` ${name}` : ""}, the team uses the PPM for tasks, projects and the shared calendar.`,
            "Set your password to get started. The link works once; if it has expired, ask an admin to send a new one.",
          ],
          button: "Set your password",
          path,
          footer: "If you weren't expecting this, you can ignore it. Nothing happens until you click the link.",
        }),
      }
    : {
        subject: "Reset your RTC PPM password",
        ...emailLayout({
          heading: "Reset your password",
          lines: [
            "Someone asked to reset the password for your PPM account. Choose a new one with the link below.",
            "The link works once and expires soon. If it has, ask an admin to send a new one.",
          ],
          button: "Choose a new password",
          path,
          footer: "If you didn't ask for this, ignore this email. Your password stays the same.",
        }),
      }
}

async function emailAuthLink(kind: "invite" | "recovery", to: string, hashedToken: string, name: string | null) {
  const { subject, html, text } = authLinkEmail(kind, hashedToken, name)
  try {
    return await sendMail({ to, subject, html, text })
  } catch (e) {
    console.error(`${kind} email to ${to} failed`, e)
    return false
  }
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

  if (!emailConfigured()) return { ok: false, error: NO_EMAIL }

  const admin = createSupabaseAdmin()
  const fullName = input.fullName.trim()
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: fullName } },
  })
  if (error || !data.user || !data.properties?.hashed_token) {
    const taken = error?.message?.toLowerCase().includes("already") || error?.code === "email_exists"
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
  if (!(await emailAuthLink("invite", email, data.properties.hashed_token, fullName || null))) {
    // Undo, so the same address can simply be invited again once email works.
    await admin.from("profiles").delete().eq("id", data.user.id)
    await admin.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: "The invitation email couldn't be sent, so nothing was created. Try again in a minute." }
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
  if (!emailConfigured()) return { ok: false, error: NO_EMAIL }
  const admin = createSupabaseAdmin()
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: them.email })
  if (error || !data.properties?.hashed_token) return { ok: false, error: error?.message ?? "The reset link couldn't be made." }
  if (!(await emailAuthLink("recovery", them.email, data.properties.hashed_token, them.full_name))) {
    return { ok: false, error: "The reset email couldn't be sent. Try again in a minute." }
  }
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
  if (!emailConfigured()) return { ok: false, error: NO_EMAIL }
  const admin = createSupabaseAdmin()
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: them.email,
    options: { data: { full_name: them.full_name ?? "" } },
  })
  if (error || !data.properties?.hashed_token) {
    const taken = error?.message?.toLowerCase().includes("already") || error?.code === "email_exists"
    if (!taken) return { ok: false, error: error?.message ?? "The invitation couldn't be made." }
    // They already have a password (say, someone from before the revamp who hasn't opened the new
    // PPM yet), so an invitation can't be made: send them a password reset instead.
    const { data: reset, error: rErr } = await admin.auth.admin.generateLink({ type: "recovery", email: them.email })
    if (rErr || !reset.properties?.hashed_token) return { ok: false, error: rErr?.message ?? "The reset link couldn't be made." }
    if (!(await emailAuthLink("recovery", them.email, reset.properties.hashed_token, them.full_name))) {
      return { ok: false, error: "The reset email couldn't be sent. Try again in a minute." }
    }
    return { ok: true, message: `${them.full_name ?? them.email} already has an account, so a password reset link was sent instead.` }
  }
  if (!(await emailAuthLink("invite", them.email, data.properties.hashed_token, them.full_name))) {
    return { ok: false, error: "The invitation email couldn't be sent. Try again in a minute." }
  }
  return { ok: true, message: `A new invitation is on its way to ${them.email}.` }
}
