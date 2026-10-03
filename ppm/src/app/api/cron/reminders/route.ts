import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { emailLayout, sendMail } from "@/lib/email"
import { addDays, clockTime, diffDays, isoDay, manilaInstant, shortDate } from "@/lib/dates"

/**
 * The morning email, at 8 AM Manila (00:00 UTC, set in vercel.json): what's
 * overdue, what's due today and tomorrow, and the day's meetings. One email
 * per person, only when there's something to say, and never to anyone who
 * turned emails off. Vercel's scheduler sends the CRON_SECRET; nobody else can.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const admin = createSupabaseAdmin()
  const today = isoDay()
  const tomorrow = addDays(today, 1)
  const [{ data: people }, { data: tasks }, { data: meetings }] = await Promise.all([
    admin
      .from("profiles")
      .select("id,full_name,email,email_opt_out")
      .in("role", ["super_admin", "admin", "staff"])
      .is("deactivated_at", null),
    admin
      .from("ppm_tasks")
      .select("number,title,due_date,assignee_id,status")
      .in("status", ["todo", "in_progress", "in_review"])
      .is("deleted_at", null)
      .not("assignee_id", "is", null)
      .lte("due_date", tomorrow),
    admin
      .from("cal_events")
      .select("title,starts_at,kind,attendees:cal_event_attendees(user_id)")
      .eq("kind", "meeting")
      .gte("starts_at", manilaInstant(today, 0))
      .lt("starts_at", manilaInstant(tomorrow, 0)),
  ])

  let sent = 0
  for (const person of people ?? []) {
    if (!person.email || person.email_opt_out) continue
    const mine = (tasks ?? []).filter((t) => t.assignee_id === person.id && t.due_date)
    const late = mine.filter((t) => diffDays(t.due_date!, today) < 0)
    const dueToday = mine.filter((t) => t.due_date === today)
    const dueTomorrow = mine.filter((t) => t.due_date === tomorrow)
    const myMeetings = (meetings ?? []).filter((m) =>
      (m.attendees as { user_id: string }[]).some((a) => a.user_id === person.id),
    )
    if (!late.length && !dueToday.length && !dueTomorrow.length && !myMeetings.length) continue

    const lines: string[] = []
    for (const t of late) lines.push(`Overdue since ${shortDate(t.due_date!, today)}: ${t.title} (RTC-${t.number})`)
    for (const t of dueToday) lines.push(`Due today: ${t.title} (RTC-${t.number})`)
    for (const t of dueTomorrow) lines.push(`Due tomorrow: ${t.title} (RTC-${t.number})`)
    for (const m of myMeetings) lines.push(`Meeting at ${clockTime(m.starts_at)}: ${m.title}`)

    const first = person.full_name?.split(" ")[0] ?? "there"
    const { html, text } = emailLayout({
      heading: `Good morning, ${first}. Here's your day.`,
      lines,
      button: "Open the PPM",
      path: "/",
    })
    const parts = [
      late.length && `${late.length} overdue`,
      dueToday.length && `${dueToday.length} due today`,
      myMeetings.length && `${myMeetings.length} ${myMeetings.length === 1 ? "meeting" : "meetings"}`,
    ].filter(Boolean)
    const subject = parts.length ? `Your day: ${parts.join(", ")}` : "Your day: due tomorrow"
    try {
      if (await sendMail({ to: person.email, subject, html, text })) sent++
    } catch (error) {
      console.error("Reminder email failed", person.id, error)
    }
  }
  return NextResponse.json({ ran: new Date().toISOString(), sent })
}
