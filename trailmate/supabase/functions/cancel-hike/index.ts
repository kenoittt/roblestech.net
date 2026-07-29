/**
 * cancel-hike (SDS §7, FR-5.5)
 *
 * Organizer- or weather-cancellation, and the admin path behind FR-2.4 (revoking an
 * organizer auto-cancels their active listings).
 *
 * SDS §9.3: these are always a 100% refund with the commission returned. The refund policy
 * presets do not apply — the hiker did nothing wrong.
 */

import { HttpError, json, readJson, serveJson } from "@shared/http.ts";
import { adminClient, requireUser } from "@shared/supabase.ts";
import { stripeClient } from "@shared/stripe.ts";

interface Body {
  hikeId: string;
  reason: string;
  /** Surfaces "cancelled due to weather" in the notification copy. */
  weather?: boolean;
}

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const { hikeId, reason, weather } = await readJson<Body>(req);

  if (!hikeId) throw new HttpError(400, "hikeId is required", "invalid_body");
  if (!reason?.trim()) {
    throw new HttpError(400, "A cancellation reason is required", "reason_required");
  }

  const admin = adminClient();
  const isAdmin = user.roleFlags.includes("admin");

  const { data: hike, error } = await admin
    .from("hikes")
    .select("id, organizer_id, title, status, start_at")
    .eq("id", hikeId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!hike) throw new HttpError(404, "Hike not found", "hike_not_found");
  if (hike.organizer_id !== user.id && !isAdmin) {
    throw new HttpError(403, "Only the organizer or an admin can cancel this hike", "forbidden");
  }
  if (["cancelled", "completed"].includes(hike.status)) {
    throw new HttpError(409, `This hike is already ${hike.status}`, "not_cancellable");
  }

  const { data: bookings, error: bookingsError } = await admin
    .from("bookings")
    .select("id, hiker_id, status, amount_cents, hiker_fee_cents, stripe_payment_intent_id")
    .eq("hike_id", hike.id)
    .in("status", ["pending_payment", "confirmed"]);

  if (bookingsError) throw new HttpError(500, bookingsError.message);

  const stripe = stripeClient();
  const refunded: string[] = [];
  const failed: { bookingId: string; error: string }[] = [];

  for (const booking of bookings ?? []) {
    const paidCents = booking.amount_cents + booking.hiker_fee_cents;

    if (paidCents > 0 && booking.stripe_payment_intent_id) {
      try {
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          // Full amount, transfer reversed, and the platform gives its fee back too.
          reverse_transfer: true,
          refund_application_fee: true,
          metadata: {
            trailmate_booking_id: booking.id,
            trailmate_reason: weather ? "weather_cancellation" : "organizer_cancellation",
          },
        }, { idempotencyKey: `hike-cancel-refund-${booking.id}` });
      } catch (refundError) {
        // Keep going: one card failing must not leave the rest of the roster un-notified.
        const message = refundError instanceof Error ? refundError.message : String(refundError);
        console.error(`refund failed for booking ${booking.id}`, refundError);
        failed.push({ bookingId: booking.id, error: message });
        continue;
      }
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "cancelled_by_organizer",
        cancellation_reason: reason.slice(0, 500),
      })
      .eq("id", booking.id);

    if (updateError) {
      failed.push({ bookingId: booking.id, error: updateError.message });
      continue;
    }
    refunded.push(booking.id);
  }

  await admin
    .from("payouts_ledger")
    .update({ status: "reversed", failure_reason: "hike cancelled" })
    .eq("hike_id", hike.id)
    .eq("status", "held");

  const { error: hikeError } = await admin
    .from("hikes")
    .update({ status: "cancelled", cancellation_reason: reason.slice(0, 500) })
    .eq("id", hike.id);
  if (hikeError) throw new HttpError(500, hikeError.message);

  // FR-9.1 — everyone on the roster and the waitlist hears about it.
  const notifyUserIds = new Set<string>((bookings ?? []).map((b) => b.hiker_id));
  const { data: waitlist } = await admin
    .from("waitlist_entries")
    .select("user_id")
    .eq("hike_id", hike.id)
    .in("status", ["waiting", "offered"]);
  for (const entry of waitlist ?? []) notifyUserIds.add(entry.user_id);

  if (notifyUserIds.size > 0) {
    await admin.from("notifications").insert(
      [...notifyUserIds].map((userId) => ({
        user_id: userId,
        type: "hike_cancelled" as const,
        payload: {
          hike_id: hike.id,
          title: hike.title,
          reason: reason.slice(0, 500),
          weather: weather ?? false,
          full_refund: true,
        },
      })),
    );
  }

  await admin
    .from("waitlist_entries")
    .update({ status: "released" })
    .eq("hike_id", hike.id)
    .in("status", ["waiting", "offered"]);

  if (isAdmin && hike.organizer_id !== user.id) {
    await admin.from("admin_actions").insert({
      admin_id: user.id,
      action: "cancel_hike",
      target_type: "hike",
      target_id: hike.id,
      detail: { reason, refunded: refunded.length, failed: failed.length },
    });
  }

  return json({
    hikeId: hike.id,
    status: "cancelled",
    refundedBookings: refunded.length,
    failedRefunds: failed,
  }, failed.length > 0 ? 207 : 200);
});
