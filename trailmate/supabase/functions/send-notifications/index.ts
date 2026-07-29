/**
 * send-notifications (FR-9.1, FR-9.2) — cron-invoked every 5 minutes.
 *
 * Drains unsent rows from public.notifications to Expo Push. Chat messages are batched per
 * hike per user so a busy group chat produces one push, not forty (FR-9.1: "chat messages
 * (batched)").
 *
 * Preferences are re-checked here as well as at enqueue time, so toggling a category off
 * suppresses anything still sitting in the queue.
 */

import { assertCronSecret, json, serveJson } from "@shared/http.ts";
import { adminClient } from "@shared/supabase.ts";
import { env } from "@shared/env.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 500;

interface PushMessage {
  to: string[];
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
  channelId: string;
}

const COPY: Record<string, (payload: Record<string, unknown>) => { title: string; body: string }> = {
  booking_confirmed: (p) => ({
    title: "You're booked",
    body: `Your spot on ${p.title ?? "the hike"} is confirmed.`,
  }),
  hike_reminder_48h: (p) => ({
    title: "Hike in 2 days",
    body: `${p.title ?? "Your hike"} is coming up. Check the gear list and the weather.`,
  }),
  hike_reminder_3h: (p) => ({
    title: "Hike in 3 hours",
    body: `${p.title ?? "Your hike"} starts soon. Tap for the meeting point.`,
  }),
  chat_message: (p) => ({
    title: (p.hike_title as string) ?? "Hike chat",
    body: `${p.unread_count ?? 1} new message${Number(p.unread_count ?? 1) === 1 ? "" : "s"}`,
  }),
  hike_updated: (p) => ({
    title: "Hike updated",
    body: `Something changed on ${p.title ?? "a hike you booked"}.`,
  }),
  hike_cancelled: (p) => ({
    title: p.weather ? "Hike cancelled — weather" : "Hike cancelled",
    body: `${p.title ?? "Your hike"} was cancelled. You've been refunded in full.`,
  }),
  refund_issued: (p) => ({
    title: "Refund issued",
    body: `${formatMoney(p.refund_cents)} is on its way back to your card.`,
  }),
  payout_sent: (p) => ({
    title: "Payout released",
    body: `${formatMoney(p.net_cents ?? p.amount_cents)} has been released to your account.`,
  }),
  review_prompt: (p) => ({
    title: "How was it?",
    body: `Leave a review for ${p.title ?? "your hike"}.`,
  }),
  waitlist_promoted: (p) => ({
    title: "A spot opened up",
    body: `You're off the waitlist. Claim your spot before ${formatTime(p.expires_at)}.`,
  }),
  new_hike_from_followed_organizer: (p) => ({
    title: "New hike posted",
    body: `${p.title ?? "A new hike"} was just published by an organizer you follow.`,
  }),
  verification_update: (p) => ({
    title: "Verification update",
    body: p.identity_status === "verified"
      ? "You're verified — you can publish hikes now."
      : "Your identity check needs another look. Tap for details.",
  }),
};

function formatMoney(cents: unknown): string {
  const n = Number(cents ?? 0);
  return `$${(n / 100).toFixed(2)}`;
}

function formatTime(iso: unknown): string {
  if (typeof iso !== "string") return "the deadline";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "the deadline" : d.toLocaleString("en-US");
}

serveJson(async (req) => {
  assertCronSecret(req, env.cronSecret);
  const admin = adminClient();

  const { data: pending, error } = await admin
    .from("notifications")
    .select("id, user_id, type, payload")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) throw new Error(error.message);
  if (!pending?.length) return json({ sent: 0, skipped: 0 });

  const userIds = [...new Set(pending.map((n) => n.user_id))];

  const [{ data: tokens }, { data: prefs }] = await Promise.all([
    admin.from("push_tokens").select("user_id, token").in("user_id", userIds),
    admin.from("notification_prefs").select("user_id, type, push").in("user_id", userIds),
  ]);

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokens ?? []) {
    tokensByUser.set(row.user_id, [...(tokensByUser.get(row.user_id) ?? []), row.token]);
  }

  const pushAllowed = new Set(
    (prefs ?? []).filter((p) => p.push).map((p) => `${p.user_id}:${p.type}`),
  );

  // FR-9.1 chat batching: collapse per (user, hike) and keep only the newest row's copy.
  const collapsed = new Map<string, { ids: string[]; row: typeof pending[number]; count: number }>();
  for (const row of pending) {
    const key = row.type === "chat_message"
      ? `${row.user_id}:chat:${(row.payload as Record<string, unknown>)?.hike_id}`
      : `${row.user_id}:${row.id}`;
    const entry = collapsed.get(key);
    if (entry) {
      entry.ids.push(row.id);
      entry.count += 1;
      entry.row = row;
    } else {
      collapsed.set(key, { ids: [row.id], row, count: 1 });
    }
  }

  const messages: PushMessage[] = [];
  const sentIds: string[] = [];
  const suppressedIds: string[] = [];

  for (const { ids, row, count } of collapsed.values()) {
    const userTokens = tokensByUser.get(row.user_id) ?? [];
    const allowed = pushAllowed.has(`${row.user_id}:${row.type}`);

    if (!allowed || userTokens.length === 0) {
      // Mark as handled either way — an unsent row would be retried forever. Email is a
      // separate channel and is not this function's job.
      suppressedIds.push(...ids);
      continue;
    }

    const payload = { ...(row.payload as Record<string, unknown>), unread_count: count };
    const copy = COPY[row.type]?.(payload) ??
      { title: "TrailMate", body: "You have an update." };

    messages.push({
      to: userTokens,
      title: copy.title,
      body: copy.body,
      data: { type: row.type, ...payload },
      sound: "default",
      channelId: "default",
    });
    sentIds.push(...ids);
  }

  if (messages.length > 0) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (env.expoAccessToken) headers.Authorization = `Bearer ${env.expoAccessToken}`;

    // Expo accepts up to 100 messages per request.
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        // Leave these rows unsent so the next run retries them.
        console.error(`Expo push failed: ${response.status} ${await response.text()}`);
        return json({ sent: 0, retryable: chunk.length }, 502);
      }

      const result = await response.json() as { data?: { status: string; details?: { error?: string } }[] };
      // DeviceNotRegistered means the install is gone — drop the token.
      for (const [index, ticket] of (result.data ?? []).entries()) {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          await admin.from("push_tokens").delete().in("token", chunk[index].to);
        }
      }
    }
  }

  const now = new Date().toISOString();
  const allHandled = [...sentIds, ...suppressedIds];
  if (allHandled.length > 0) {
    const { error: markError } = await admin
      .from("notifications")
      .update({ sent_at: now })
      .in("id", allHandled);
    if (markError) throw new Error(markError.message);
  }

  console.log(`send-notifications: pushed ${sentIds.length}, suppressed ${suppressedIds.length}`);

  return json({
    sent: sentIds.length,
    suppressed: suppressedIds.length,
    hasMore: pending.length === BATCH_SIZE,
  });
});
