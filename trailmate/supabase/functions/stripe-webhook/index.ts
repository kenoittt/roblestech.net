/**
 * stripe-webhook (SDS §7, §3.3)
 *
 * The only thing on the platform allowed to move money state. A client saying "I paid"
 * changes nothing; `payment_intent.succeeded` arriving here is what confirms a booking.
 *
 * Two properties this handler must keep:
 *   - Signature verified before anything is read (`verify_jwt = false` in config.toml, so
 *     the signature *is* the authentication).
 *   - Idempotent. Stripe retries, and retries can overlap. Every event is claimed in
 *     stripe_webhook_events first; a duplicate returns 200 without re-applying effects.
 */

import Stripe from "stripe";
import { corsHeaders, json, serveJson } from "@shared/http.ts";
import { adminClient, loadPlatformConfig } from "@shared/supabase.ts";
import { commissionCents, stripeClient, verifyWebhook } from "@shared/stripe.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

serveJson(async (req) => {
  const stripe = stripeClient();
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await verifyWebhook(stripe, rawBody, req.headers.get("stripe-signature"));
  } catch (error) {
    // 400 tells Stripe not to retry — a bad signature will never become good.
    console.error("webhook signature verification failed", error);
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = adminClient();

  // Claim the event. A conflict means we have seen it before.
  const { error: claimError } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> });

  if (claimError) {
    if (claimError.code === "23505") {
      const { data: existing } = await admin
        .from("stripe_webhook_events")
        .select("processed_at")
        .eq("id", event.id)
        .maybeSingle();

      if (existing?.processed_at) {
        return json({ received: true, duplicate: true });
      }
      // Previously claimed but never finished — fall through and retry the effects.
    } else {
      console.error("could not record webhook event", claimError);
      // 500 so Stripe retries rather than dropping the event.
      return json({ error: "event_not_recorded" }, 500);
    }
  }

  try {
    await handleEvent(admin, stripe, event);
    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);
    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`handler failed for ${event.type} ${event.id}`, error);
    await admin
      .from("stripe_webhook_events")
      .update({ error: message, attempts: (event as unknown as { attempts?: number }).attempts ?? 1 })
      .eq("id", event.id);
    // Non-2xx makes Stripe retry with backoff.
    return json({ error: "handler_failed" }, 500);
  }
}, { methods: ["POST"] });

async function handleEvent(
  admin: SupabaseClient,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded":
      return await onPaymentSucceeded(admin, event.data.object as Stripe.PaymentIntent);

    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      return await onPaymentFailed(admin, event.data.object as Stripe.PaymentIntent);

    case "charge.refunded":
      return await onChargeRefunded(admin, event.data.object as Stripe.Charge);

    case "charge.dispute.created":
      return await onDisputeCreated(admin, event.data.object as Stripe.Dispute);

    case "account.updated":
      return await onAccountUpdated(admin, event.data.object as Stripe.Account);

    case "identity.verification_session.verified":
    case "identity.verification_session.processing":
    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled":
      return await onIdentityUpdated(
        admin,
        event.type,
        event.data.object as Stripe.Identity.VerificationSession,
      );

    case "transfer.reversed":
      return await onTransferReversed(admin, event.data.object as Stripe.Transfer);

    case "payout.paid":
      return await onPayoutPaid(admin, stripe, event.data.object as Stripe.Payout, event.account);

    default:
      console.log(`unhandled event type ${event.type}`);
  }
}

/**
 * FR-5.6 pending_payment → confirmed, plus the held ledger row that release-payouts will
 * settle 24 h after the hike (FR-5.3).
 */
async function onPaymentSucceeded(
  admin: SupabaseClient,
  intent: Stripe.PaymentIntent,
): Promise<void> {
  const bookingId = intent.metadata?.trailmate_booking_id;
  if (!bookingId) {
    console.warn(`payment_intent ${intent.id} has no trailmate_booking_id — ignoring`);
    return;
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, hike_id, hiker_id, status, amount_cents, hiker_fee_cents, currency, waiver_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!booking) throw new Error(`booking ${bookingId} not found`);

  if (booking.status === "confirmed" || booking.status === "attended") {
    return; // already applied
  }
  if (!booking.waiver_id) {
    // Should be impossible: checkout signs before it creates the intent.
    throw new Error(`booking ${bookingId} has no waiver but payment succeeded`);
  }

  const chargeId = typeof intent.latest_charge === "string"
    ? intent.latest_charge
    : intent.latest_charge?.id ?? null;

  const { error: updateError } = await admin
    .from("bookings")
    .update({ status: "confirmed", stripe_charge_id: chargeId })
    .eq("id", bookingId);
  if (updateError) throw new Error(updateError.message);

  const { data: hike } = await admin
    .from("hikes")
    .select("id, organizer_id, title, start_at, duration_min")
    .eq("id", booking.hike_id)
    .single();

  const cfg = await loadPlatformConfig(admin);
  const commission = commissionCents(booking.amount_cents, cfg.take_rate_bps);

  // Dispute window opens at the hike's *end*, not its start (SDS §9.1: T+24h after hike).
  const hikeEnd = new Date(
    new Date(hike!.start_at).getTime() + (hike!.duration_min ?? 0) * 60_000,
  );
  const releasableAt = new Date(hikeEnd.getTime() + cfg.payout_delay_hours * 3_600_000);

  const { error: ledgerError } = await admin.from("payouts_ledger").insert({
    organizer_id: hike!.organizer_id,
    hike_id: hike!.id,
    booking_id: booking.id,
    gross_cents: booking.amount_cents,
    commission_cents: commission,
    net_cents: booking.amount_cents - commission,
    currency: booking.currency,
    status: "held",
    releasable_at: releasableAt.toISOString(),
  });
  // A retried webhook may re-insert. payouts_ledger_one_per_booking makes the second
  // attempt a 23505, which is the expected no-op rather than an error.
  if (ledgerError && ledgerError.code !== "23505") throw new Error(ledgerError.message);

  await admin.from("notifications").insert([
    {
      user_id: booking.hiker_id,
      type: "booking_confirmed",
      payload: { hike_id: hike!.id, booking_id: booking.id, title: hike!.title },
    },
  ]);
}

/** Release the held spot so someone else — or the waitlist — can take it. */
async function onPaymentFailed(
  admin: SupabaseClient,
  intent: Stripe.PaymentIntent,
): Promise<void> {
  const bookingId = intent.metadata?.trailmate_booking_id;
  if (!bookingId) return;

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "pending_payment") return;

  // Deleting (rather than cancelling) keeps the partial-unique index free so the hiker can
  // simply try again with another card. The waiver row cascades with it.
  const { error } = await admin.from("bookings").delete().eq("id", bookingId);
  if (error) throw new Error(error.message);
}

/** FR-5.4 / FR-5.5 — reflect whatever Stripe actually refunded. */
async function onChargeRefunded(admin: SupabaseClient, charge: Stripe.Charge): Promise<void> {
  const bookingId = charge.metadata?.trailmate_booking_id ??
    (typeof charge.payment_intent === "string" ? null : charge.payment_intent?.metadata
      ?.trailmate_booking_id);

  const query = admin.from("bookings").select("id, status, amount_cents, hiker_fee_cents");
  const { data: booking } = bookingId
    ? await query.eq("id", bookingId).maybeSingle()
    : await query.eq("stripe_charge_id", charge.id).maybeSingle();

  if (!booking) {
    console.warn(`charge.refunded for ${charge.id} matched no booking`);
    return;
  }

  const refunded = charge.amount_refunded ?? 0;
  const fullyRefunded = refunded >= booking.amount_cents + booking.hiker_fee_cents;

  const { error } = await admin
    .from("bookings")
    .update({
      refunded_amount_cents: refunded,
      status: fullyRefunded && booking.status !== "cancelled_by_organizer"
        ? "refunded"
        : booking.status,
    })
    .eq("id", booking.id);
  if (error) throw new Error(error.message);

  // Reverse any still-held earnings for this booking.
  await admin
    .from("payouts_ledger")
    .update({ status: "reversed", failure_reason: "charge refunded" })
    .eq("booking_id", booking.id)
    .eq("status", "held");
}

/** Freeze the payout for a disputed booking and put it in front of an admin. */
async function onDisputeCreated(admin: SupabaseClient, dispute: Stripe.Dispute): Promise<void> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;

  const { data: booking } = await admin
    .from("bookings")
    .select("id, hiker_id, hike_id")
    .eq("stripe_charge_id", chargeId)
    .maybeSingle();
  if (!booking) return;

  await admin
    .from("payouts_ledger")
    .update({ status: "reversed", failure_reason: `dispute ${dispute.id}` })
    .eq("booking_id", booking.id)
    .eq("status", "held");

  await admin.from("reports").insert({
    reporter_id: null,
    target_type: "hike",
    target_id: booking.hike_id,
    reason: `Stripe dispute ${dispute.id} (${dispute.reason}) on booking ${booking.id}`,
  });
}

/** FR-2.2 — Stripe is the source of truth for payout capability. */
async function onAccountUpdated(admin: SupabaseClient, account: Stripe.Account): Promise<void> {
  const { data: profile } = await admin
    .from("organizer_profiles")
    .select("user_id")
    .eq("stripe_account_id", account.id)
    .maybeSingle();

  if (!profile) {
    console.warn(`account.updated for unknown account ${account.id}`);
    return;
  }

  const { error } = await admin
    .from("organizer_profiles")
    .update({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
    })
    .eq("user_id", profile.user_id);
  if (error) throw new Error(error.message);

  await admin.rpc("refresh_organizer_status", { p_user_id: profile.user_id });
}

/** FR-2.1 — document + selfie verification outcome. */
async function onIdentityUpdated(
  admin: SupabaseClient,
  eventType: string,
  session: Stripe.Identity.VerificationSession,
): Promise<void> {
  const userId = session.metadata?.trailmate_user_id;
  if (!userId) {
    console.warn(`verification session ${session.id} has no trailmate_user_id`);
    return;
  }

  const status = eventType.split(".").pop()!; // verified | processing | requires_input | canceled

  const { error } = await admin
    .from("organizer_profiles")
    .update({ identity_status: status, stripe_identity_session_id: session.id })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  await admin.rpc("refresh_organizer_status", { p_user_id: userId });

  await admin.from("notifications").insert({
    user_id: userId,
    type: "verification_update",
    payload: { identity_status: status },
  });
}

async function onTransferReversed(admin: SupabaseClient, transfer: Stripe.Transfer): Promise<void> {
  await admin
    .from("payouts_ledger")
    .update({ status: "reversed", failure_reason: "transfer reversed" })
    .eq("stripe_transfer_id", transfer.id);
}

/** FR-9.1 — "payout sent". Fires on the connected account, so event.account identifies it. */
async function onPayoutPaid(
  admin: SupabaseClient,
  _stripe: Stripe,
  payout: Stripe.Payout,
  connectedAccountId?: string,
): Promise<void> {
  if (!connectedAccountId) return;

  const { data: profile } = await admin
    .from("organizer_profiles")
    .select("user_id")
    .eq("stripe_account_id", connectedAccountId)
    .maybeSingle();
  if (!profile) return;

  await admin.from("notifications").insert({
    user_id: profile.user_id,
    type: "payout_sent",
    payload: {
      amount_cents: payout.amount,
      currency: payout.currency,
      arrival_date: payout.arrival_date,
    },
  });
}
