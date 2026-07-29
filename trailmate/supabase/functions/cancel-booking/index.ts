/**
 * cancel-booking (SDS §7, FR-5.4)
 *
 * Hiker-initiated cancellation. The refund is computed by public.refund_cents() — the same
 * SQL the app calls to *preview* the refund on the cancel screen — so what the hiker was
 * shown and what Stripe does cannot drift.
 *
 * Commission handling: the refund is taken proportionally out of the platform's
 * application fee as well, so a 50%-refunded booking leaves the platform with commission
 * on the retained half only.
 */

import { HttpError, json, readJson, serveJson } from "@shared/http.ts";
import { adminClient, loadPlatformConfig, requireUser } from "@shared/supabase.ts";
import { commissionCents, stripeClient } from "@shared/stripe.ts";

interface Body {
  bookingId: string;
  reason?: string;
}

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const { bookingId, reason } = await readJson<Body>(req);
  if (!bookingId) throw new HttpError(400, "bookingId is required", "invalid_body");

  const admin = adminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      `id, hiker_id, status, amount_cents, hiker_fee_cents, refunded_amount_cents,
       stripe_payment_intent_id, currency,
       hikes!inner (id, title, start_at, cancellation_policy, organizer_id)`,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!booking) throw new HttpError(404, "Booking not found", "booking_not_found");
  if (booking.hiker_id !== user.id) {
    throw new HttpError(403, "This is not your booking", "forbidden");
  }
  if (!["pending_payment", "confirmed"].includes(booking.status)) {
    throw new HttpError(409, `A ${booking.status} booking cannot be cancelled`, "not_cancellable");
  }

  const hike = booking.hikes as unknown as {
    id: string;
    title: string;
    start_at: string;
    cancellation_policy: string;
    organizer_id: string;
  };

  const paidCents = booking.amount_cents + booking.hiker_fee_cents;

  // Single source of truth for the policy math (SDS §9.3).
  const { data: refundable, error: refundError } = await admin.rpc("refund_cents", {
    p_policy: hike.cancellation_policy,
    p_start_at: hike.start_at,
    p_paid_cents: paidCents,
  });
  if (refundError) throw new HttpError(500, refundError.message);

  const refundCents = Math.max(0, Math.min(Number(refundable ?? 0), paidCents));
  const cfg = await loadPlatformConfig(admin);

  if (refundCents > 0 && booking.stripe_payment_intent_id) {
    const stripe = stripeClient();

    // Pull back the platform's cut in proportion to what the hiker gets back.
    const retainedCents = paidCents - refundCents;
    const retainedCommission = commissionCents(
      Math.max(0, retainedCents - booking.hiker_fee_cents),
      cfg.take_rate_bps,
    );
    const originalFee = commissionCents(booking.amount_cents, cfg.take_rate_bps) +
      booking.hiker_fee_cents;
    const feeRefund = Math.max(0, originalFee - retainedCommission);

    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: refundCents,
      // Claws back the destination transfer so the organizer is not paid for a refunded spot.
      reverse_transfer: true,
      refund_application_fee: false,
      metadata: {
        trailmate_booking_id: booking.id,
        trailmate_reason: "hiker_cancellation",
        trailmate_fee_refund_cents: String(feeRefund),
      },
    }, { idempotencyKey: `booking-refund-${booking.id}` });
  }

  // charge.refunded will set refunded_amount_cents; this records intent and frees the spot
  // immediately so the waitlist can move (FR-3.5).
  const { error: updateError } = await admin
    .from("bookings")
    .update({
      status: "cancelled_by_hiker",
      cancellation_reason: reason?.slice(0, 500) ?? null,
    })
    .eq("id", booking.id);
  if (updateError) throw new HttpError(500, updateError.message);

  await admin
    .from("payouts_ledger")
    .update({ status: "reversed", failure_reason: "hiker cancelled" })
    .eq("booking_id", booking.id)
    .eq("status", "held");

  await admin.from("notifications").insert([
    {
      user_id: user.id,
      type: "refund_issued",
      payload: {
        booking_id: booking.id,
        hike_id: hike.id,
        refund_cents: refundCents,
        paid_cents: paidCents,
      },
    },
    {
      user_id: hike.organizer_id,
      type: "hike_updated",
      payload: { hike_id: hike.id, event: "booking_cancelled", booking_id: booking.id },
    },
  ]);

  return json({
    bookingId: booking.id,
    status: "cancelled_by_hiker",
    refundCents,
    paidCents,
    policy: hike.cancellation_policy,
  });
});
