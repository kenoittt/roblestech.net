/**
 * create-booking-checkout (SDS §7, FR-5.1, FR-5.2, FR-5.3, FR-3.6)
 *
 * One round trip that:
 *   1. validates the hike is bookable and the requested spots fit the guest policy,
 *   2. holds the spots with a `pending_payment` booking (the DB trigger is the oversell
 *      guard — two concurrent checkouts cannot both take the last spot),
 *   3. records the signed waiver — no signature, no PaymentIntent (FR-5.2 is blocking),
 *   4. creates a destination-charge PaymentIntent with the platform commission as
 *      `application_fee_amount` and the organizer's Connect account as the destination.
 *
 * Free hikes (FR-3.6) skip Stripe entirely and confirm on the spot; the waiver is still
 * mandatory.
 *
 * The booking is *not* confirmed here. Only `payment_intent.succeeded` confirms it
 * (SDS §3.3) — this function returns a client secret and nothing more.
 */

import { HttpError, json, readJson, serveJson } from "@shared/http.ts";
import { adminClient, loadPlatformConfig, requireUser } from "@shared/supabase.ts";
import { priceBooking, stripeClient } from "@shared/stripe.ts";
import { signWaiver } from "@shared/waiver.ts";

interface Body {
  hikeId: string;
  qty?: number;
  /** Full legal name as typed into the waiver step. */
  signedName: string;
  /** Version the client rendered, so a mid-checkout template bump is detected. */
  waiverTemplateVersion: number;
}

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const body = await readJson<Body>(req);
  const admin = adminClient();

  const qty = body.qty ?? 1;
  if (!body.hikeId) throw new HttpError(400, "hikeId is required", "invalid_body");
  if (!Number.isInteger(qty) || qty < 1 || qty > 11) {
    throw new HttpError(400, "qty must be between 1 and 11", "invalid_qty");
  }
  if (!body.signedName?.trim()) {
    throw new HttpError(400, "The waiver must be signed to complete checkout", "waiver_required");
  }

  // NFR-4 — 18+ only in v1.
  const { data: profile } = await admin
    .from("users")
    .select("adult_confirmed_at")
    .eq("id", user.id)
    .single();
  if (!profile?.adult_confirmed_at) {
    throw new HttpError(403, "Age confirmation is required before booking", "age_unconfirmed");
  }

  const { data: hike, error: hikeError } = await admin
    .from("hikes")
    .select(
      "id, organizer_id, title, status, start_at, price_cents, currency, capacity_max, confirmed_spots, guest_limit",
    )
    .eq("id", body.hikeId)
    .maybeSingle();

  if (hikeError) throw new HttpError(500, hikeError.message);
  if (!hike) throw new HttpError(404, "Hike not found", "hike_not_found");
  if (!["published", "full"].includes(hike.status)) {
    throw new HttpError(409, `This hike is not open for booking (${hike.status})`, "not_bookable");
  }
  if (new Date(hike.start_at) <= new Date()) {
    throw new HttpError(409, "This hike has already started", "hike_started");
  }
  if (hike.organizer_id === user.id) {
    throw new HttpError(409, "You cannot book your own hike", "own_hike");
  }
  if (qty > 1 + hike.guest_limit) {
    throw new HttpError(
      409,
      `This hike allows ${hike.guest_limit} guest(s) per booking`,
      "guest_limit_exceeded",
    );
  }

  const cfg = await loadPlatformConfig(admin);
  const isFree = hike.price_cents === 0;
  const pricing = priceBooking(hike.price_cents, qty, cfg);

  // Step 2 — hold the spots. The bookings_guard trigger rejects this if the hike filled
  // up in the meantime, which is exactly the race we want the database to arbitrate.
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      hike_id: hike.id,
      hiker_id: user.id,
      qty,
      status: "pending_payment",
      unit_price_cents: hike.price_cents,
      amount_cents: pricing.subtotalCents,
      hiker_fee_cents: pricing.hikerFeeCents,
      platform_fee_cents: pricing.platformFeeCents,
      currency: hike.currency,
    })
    .select("id")
    .single();

  if (bookingError) {
    // 23514 = check_violation, which is how the guard trigger reports "full" / "closed".
    if (bookingError.code === "23514") {
      throw new HttpError(409, bookingError.message, "not_bookable");
    }
    if (bookingError.code === "23505" || bookingError.code === "23P01") {
      throw new HttpError(409, "You already have a booking on this hike", "duplicate_booking");
    }
    throw new HttpError(500, bookingError.message);
  }

  // Step 3 — waiver. If this fails the held booking is released so the spot is not stuck.
  let waiver;
  try {
    waiver = await signWaiver({
      admin,
      bookingId: booking.id,
      hikeId: hike.id,
      userId: user.id,
      signedName: body.signedName,
      templateVersion: body.waiverTemplateVersion,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
    });
  } catch (error) {
    await admin.from("bookings").delete().eq("id", booking.id);
    throw error;
  }

  // FR-3.6 — free hikes: RSVP confirmed immediately, no Stripe involvement.
  if (isFree) {
    const { error } = await admin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);
    if (error) throw new HttpError(500, error.message);

    await admin.from("notifications").insert({
      user_id: user.id,
      type: "booking_confirmed",
      payload: { hike_id: hike.id, booking_id: booking.id, title: hike.title, free: true },
    });

    return json({
      free: true,
      bookingId: booking.id,
      waiverId: waiver.id,
      breakdown: pricing,
    });
  }

  // Step 4 — the organizer must be able to receive funds before we charge anyone.
  const { data: organizer } = await admin
    .from("organizer_profiles")
    .select("stripe_account_id, charges_enabled, payouts_enabled, status")
    .eq("user_id", hike.organizer_id)
    .maybeSingle();

  if (
    !organizer?.stripe_account_id || !organizer.charges_enabled || !organizer.payouts_enabled ||
    organizer.status !== "verified"
  ) {
    await admin.from("bookings").delete().eq("id", booking.id);
    throw new HttpError(
      409,
      "This organizer cannot currently accept bookings",
      "organizer_not_payable",
    );
  }

  const stripe = stripeClient();

  // Reuse the platform-side Customer so saved cards and Apple/Google Pay work across hikes.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.displayName,
      metadata: { trailmate_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const intent = await stripe.paymentIntents.create({
    amount: pricing.totalChargeCents,
    currency: hike.currency,
    customer: customerId,
    // FR-5.3 — funds are captured now and held; the transfer is released 24 h after the
    // hike completes by the release-payouts job.
    capture_method: "automatic",
    application_fee_amount: pricing.platformFeeCents,
    transfer_data: { destination: organizer.stripe_account_id },
    on_behalf_of: organizer.stripe_account_id,
    automatic_payment_methods: { enabled: true },
    description: `TrailMate — ${hike.title}`,
    metadata: {
      trailmate_booking_id: booking.id,
      trailmate_hike_id: hike.id,
      trailmate_hiker_id: user.id,
      trailmate_organizer_id: hike.organizer_id,
      trailmate_qty: String(qty),
    },
  }, {
    // Retried checkouts for the same booking must never create a second charge.
    idempotencyKey: `booking-pi-${booking.id}`,
  });

  const { error: linkError } = await admin
    .from("bookings")
    .update({ stripe_payment_intent_id: intent.id })
    .eq("id", booking.id);
  if (linkError) throw new HttpError(500, linkError.message);

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2025-08-27.basil" },
  );

  return json({
    free: false,
    bookingId: booking.id,
    waiverId: waiver.id,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    customerId,
    ephemeralKeySecret: ephemeralKey.secret,
    breakdown: pricing,
  });
});
