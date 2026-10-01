"use server"

import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServer } from "@/lib/supabase/server"
import { emailConfigured, emailLayout, sendMail } from "@/lib/email"
import { clockTime, dueLabel, isoDay, shortDate } from "@/lib/dates"

type Pending = {
  id: string
  user_id: string
  actor_id: string | null
  type: string
  task_id: string | null
  event_id: string | null
  meta: { excerpt?: string; title?: string; starts_at?: string } | null
}

/**
 * Emails whatever notifications are waiting. Called by the app right after a
 * change that can create one (an assignment, a sign-off request, a comment, a
 * meeting). Each notification is claimed in one statement, so two calls at
 * once never send the same email twice.
 */
export async function deliverNotifications(): Promise<{ sent: number }> {
  const supabase = await createSupabaseServer()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return { sent: 0 }

  const admin = createSupabaseAdmin()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: pending } = await admin
    .from("ppm_notifications")
    .update({ emailed_at: new Date().toISOString() })
    .is("emailed_at", null)
    .gte("created_at", since)
    .select("id,user_id,actor_id,type,task_id,event_id,meta")
  if (!pending?.length || !emailConfigured()) return { sent: 0 }

  const people = new Set<string>()
  const tasks = new Set<string>()
  for (const n of pending as Pending[]) {
    people.add(n.user_id)
    if (n.actor_id) people.add(n.actor_id)
    if (n.task_id) tasks.add(n.task_id)
  }
  const [{ data: profiles }, { data: taskRows }] = await Promise.all([
    admin.from("profiles").select("id,full_name,email,email_opt_out,deactivated_at").in("id", [...people]),
    admin.from("ppm_tasks").select("id,number,title,due_date,project_id").in("id", [...tasks]),
  ])
  const who = new Map((profiles ?? []).map((p) => [p.id, p]))
  const what = new Map((taskRows ?? []).map((t) => [t.id, t]))
  const today = isoDay()

  let sent = 0
  for (const n of pending as Pending[]) {
    const to = who.get(n.user_id)
    if (!to?.email || to.email_opt_out || to.deactivated_at) continue
    const actor = n.actor_id ? who.get(n.actor_id)?.full_name?.split(" ")[0] ?? "Someone" : "Someone"
    const task = n.task_id ? what.get(n.task_id) : null
    const key = task ? `RTC-${task.number}` : ""
    const due = task?.due_date ? `Due ${dueLabel(task.due_date, today).toLowerCase() === "today" ? "today" : shortDate(task.due_date, today)}.` : null

    let subject = ""
    let heading = ""
    const lines: string[] = []
    switch (n.type) {
      case "assigned":
        subject = `${actor} assigned you ${key}: ${task?.title}`
        heading = `${actor} assigned you a task`
        lines.push(`${task?.title} (${key})`)
        if (due) lines.push(due)
        break
      case "review":
        subject = `Sign-off needed: ${task?.title}`
        heading = `${actor} asked you to sign off a task`
        lines.push(`${task?.title} (${key}) is waiting in review. Mark it done when it's right, or send it back.`)
        break
      case "completed":
        subject = `Done: ${task?.title}`
        heading = `${actor} finished a task`
        lines.push(`${task?.title} (${key}) is done.`)
        break
      case "reopened":
        subject = `Reopened: ${task?.title}`
        heading = `${actor} reopened your task`
        lines.push(`${task?.title} (${key}) needs more work.`)
        break
      case "comment":
        subject = `${actor} commented on ${task?.title}`
        heading = `${actor} commented on ${task?.title}`
        if (n.meta?.excerpt) lines.push(`“${n.meta.excerpt}”`)
        break
      case "mention":
        subject = `${actor} mentioned you on ${task?.title}`
        heading = `${actor} mentioned you`
        lines.push(`On ${task?.title} (${key}):`)
        if (n.meta?.excerpt) lines.push(`“${n.meta.excerpt}”`)
        break
      case "meeting": {
        const at = n.meta?.starts_at
        subject = `Meeting: ${n.meta?.title ?? "a meeting"}`
        heading = `${actor} invited you to a meeting`
        lines.push(n.meta?.title ?? "A meeting")
        if (at) lines.push(`${shortDate(isoDay(at), today)} at ${clockTime(at)}, Manila time. It's on your calendar.`)
        break
      }
      default:
        continue
    }
    const path = n.type === "meeting" ? "/calendar" : task ? `/my-tasks?task=${task.number}` : "/inbox"
    const { html, text } = emailLayout({ heading, lines, button: n.type === "meeting" ? "Open the calendar" : "Open the task", path })
    try {
      if (await sendMail({ to: to.email, subject, html, text })) sent++
    } catch (error) {
      console.error("Notification email failed", n.id, error)
    }
  }
  return { sent }
}
