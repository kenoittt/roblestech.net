/**
 * release-payouts (SDS §7, FR-5.3) — cron-invoked, hourly.
 *
 * Held ledger rows become organizer money 24 h after the hike ends. With destination
 * charges the funds already sit in the connected account's *pending* balance; what this
 * job does is flip the ledger to `released` and let Stripe's payout schedule move it, so
 * the platform has its own auditable record of when the dispute window closed.
 *
 * If the platform is instead configured for separate transfers (see docs/PAYMENTS.md),
 * this is where stripe.transfers.create() belongs — the ledger row already carries
 * everything that call needs.
 */

import { assertCronSecret, json, serveJson } from "@shared/http.ts";
import { adminClient } from "@shared/supabase.ts";
import { env } from "@shared/env.ts";

const BATCH_SIZE = 200;

serveJson(async (req) => {
  assertCronSecret(req, env.cronSecret);

  const admin = adminClient();

  const { data: due, error } = await admin
    .from("payouts_ledger")
    .select(
      `id, organizer_id, hike_id, booking_id, net_cents, currency, releasable_at,
       bookings (status),
       hikes!inner (status)`,
    )
    .eq("status", "held")
    .lte("releasable_at", new Date().toISOString())
    .limit(BATCH_SIZE);

  if (error) throw new Error(error.message);

  const released: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const row of due ?? []) {
    const hike = row.hikes as unknown as { status: string } | null;
    const booking = row.bookings as unknown as { status: string } | null;

    // Only pay out for a hike that actually happened and a booking still in good standing.
    if (hike?.status !== "completed") {
      skipped.push({ id: row.id, reason: `hike is ${hike?.status ?? "missing"}` });
      continue;
    }
    if (booking && !["confirmed", "attended", "no_show"].includes(booking.status)) {
      skipped.push({ id: row.id, reason: `booking is ${booking.status}` });
      continue;
    }

    const { error: updateError } = await admin
      .from("payouts_ledger")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "held"); // optimistic guard against a concurrent run

    if (updateError) {
      skipped.push({ id: row.id, reason: updateError.message });
      continue;
    }
    released.push(row.id);
  }

  // One "payout sent" notification per organizer per run, not per booking.
  const byOrganizer = new Map<string, number>();
  for (const row of due ?? []) {
    if (!released.includes(row.id)) continue;
    byOrganizer.set(row.organizer_id, (byOrganizer.get(row.organizer_id) ?? 0) + row.net_cents);
  }

  if (byOrganizer.size > 0) {
    await admin.from("notifications").insert(
      [...byOrganizer.entries()].map(([organizerId, netCents]) => ({
        user_id: organizerId,
        type: "payout_sent" as const,
        payload: { net_cents: netCents, released_count: released.length },
      })),
    );
  }

  console.log(`release-payouts: released ${released.length}, skipped ${skipped.length}`);

  return json({
    released: released.length,
    skipped,
    hasMore: (due?.length ?? 0) === BATCH_SIZE,
  });
});
