# Payments

Implements SDS §9. Rates live in `public.platform_config`, not in code — change them there and
Stripe, the ledger, and the refund maths all move together.

## Money flow (destination charges)

```
Hiker pays $50.00
      │
      ▼
Stripe PaymentIntent  (created by create-booking-checkout)
      ├─ application_fee_amount  $6.50  ────► platform balance
      └─ transfer_data.destination      ────► organizer's Connect account
                                              (pending until the ledger releases it)
```

Opening position (SDS §9.2, and the defaults in `platform_config`):

| Setting | Value | Column |
|---|---|---|
| Organizer commission | 13% | `take_rate_bps = 1300` |
| Hiker service fee | 0% | `hiker_fee_bps = 0` |
| Payout delay after hike ends | 24 h | `payout_delay_hours = 24` |

Stripe's own cost (~2.9% + 30¢) comes out of the commission, so on a $50 booking the platform
nets roughly $4.55 of the $6.50.

## The split, precisely

`priceBooking()` in `supabase/functions/_shared/stripe.ts`, mirrored by
`public.commission_cents()` in SQL:

```
subtotal        = unit_price × qty
hiker_fee       = round(subtotal × hiker_fee_bps / 10000)
total_charged   = subtotal + hiker_fee
commission      = round(subtotal × take_rate_bps / 10000)
application_fee = commission + hiker_fee      ← the whole hiker fee is platform revenue
organizer_net   = subtotal − commission
```

Rounding is half-up on both sides. The two implementations exist because the fee must be
computed before the charge (TypeScript) and re-derived when writing the ledger (SQL); if you
change one, change both — the `payouts_ledger_splits_add_up` check constraint will catch a
drift, but only after money has moved.

## Booking → payout, end to end

1. **`create-booking-checkout`** validates, inserts `bookings` as `pending_payment` (holding
   capacity), records the signed waiver, then creates the PaymentIntent with
   `idempotencyKey: booking-pi-{bookingId}` so a retried checkout cannot double-charge.
2. **Client** presents the Stripe Payment Sheet (cards, Apple Pay, Google Pay).
3. **`stripe-webhook`** receives `payment_intent.succeeded`, sets the booking `confirmed`, and
   inserts a `payouts_ledger` row with `status = held` and
   `releasable_at = hike_end + payout_delay_hours`.
   - Hike *end*, not start: `start_at + duration_min`. A 10-hour hike would otherwise have its
     dispute window close while the group is still on the trail.
4. **`trailmate-complete-hikes` cron** flips the hike to `completed` 24 h after start, and any
   un-checked-in `confirmed` booking to `attended`.
5. **`release-payouts` cron** finds `held` rows past `releasable_at`, re-verifies the hike
   completed and the booking is still in good standing, and marks them `released`.

With destination charges the funds are already in the connected account's pending balance, so
step 5 is a ledger decision rather than a transfer. It is written so that switching to separate
transfers means adding one `stripe.transfers.create()` call — the ledger row already carries
the destination, amount and currency.

## Refunds

**Hiker cancels (FR-5.4)** — `cancel-booking` calls `public.refund_cents()`, the same function
the app calls to preview the refund, so the number shown and the number refunded cannot differ:

| Policy | 100% refund | 50% refund | 0% |
|---|---|---|---|
| Flexible | ≥ 24 h before | — | < 24 h |
| Moderate | ≥ 72 h | ≥ 24 h | < 24 h |
| Strict | ≥ 7 days | ≥ 72 h | < 72 h |

The refund is created with `reverse_transfer: true`, clawing the destination transfer back so
the organizer is not paid for a refunded spot. Commission is retained in proportion to the
retained amount — a 50% refund leaves the platform with commission on the half the organizer
keeps.

**Organizer or weather cancels (FR-5.5)** — `cancel-hike` refunds 100% with
`refund_application_fee: true`. The presets do not apply; the hiker did nothing wrong. Every
attendee and everyone on the waitlist is notified, and held ledger rows are reversed.

**Dispute** — `charge.dispute.created` reverses the held ledger row immediately and opens a
`reports` row so an admin sees it. Money that has already been released is out of reach, which
is the entire argument for the 24-hour window.

## Idempotency

Stripe retries, and retries can overlap. Three defences:

1. **`stripe_webhook_events`** — every event is claimed by primary key before any effect runs.
   A duplicate that already has `processed_at` returns 200 and does nothing.
2. **`payouts_ledger_one_per_booking`** — partial unique index. A re-delivered
   `payment_intent.succeeded` hits `23505`, which the handler treats as a no-op.
3. **Stripe idempotency keys** — `booking-pi-{id}`, `booking-refund-{id}`,
   `hike-cancel-refund-{id}`, `connect-account-{userId}`.

A handler that throws returns 500 on purpose, so Stripe retries with backoff. A bad signature
returns 400, so it does not — a bad signature will never become good.

## Testing locally

```bash
supabase functions serve                      # terminal 1
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook   # terminal 2
```

`stripe listen` prints a `whsec_…`; set it as `STRIPE_WEBHOOK_SECRET` for the local function
runtime. Then walk the paths that matter:

```bash
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
stripe trigger account.updated
stripe trigger identity.verification_session.verified
```

Triggered events carry no `trailmate_booking_id`, so they exercise the plumbing and the
"unknown metadata" branches. For real end-to-end runs, check out through the app in test mode
with card `4242 4242 4242 4242`, and `4000 0000 0000 9995` for a decline.

## Open commercial questions

SDS §13 Q3 asks whether 13% is the right opening position, and §9.2 suggests revisiting the
0% hiker fee once unit economics are known. Both are single-row updates to `platform_config`
— no deploy, no migration. Existing bookings are unaffected because each one captured its own
`platform_fee_cents` at checkout.
