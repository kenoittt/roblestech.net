# Data model

Implements SDS §6. Migrations are ordered and immutable — never edit an applied one, add a
new file instead.

| Migration | Contents |
|---|---|
| `…000100_extensions.sql` | PostGIS, pgcrypto, citext, pg_cron, pg_net; the private `app` schema |
| `…000200_enums.sql` | Every enum, in `public` so `gen types typescript` picks them up |
| `…000300_tables.sql` | Core tables |
| `…000350_platform_config.sql` | Single-row settings (take rate, payout delay, windows) |
| `…000400_indexes.sql` | Indexes sized against the NFR-1 latency budget |
| `…000500_functions.sql` | Security helpers, money maths, discovery RPC |
| `…000600_triggers.sql` | Invariants: oversell guard, publish gate, rating aggregates |
| `…000700_rls.sql` | RLS policies + column-protection triggers |
| `…000800_storage.sql` | Buckets and object policies |
| `…000900_cron.sql` | Scheduled jobs |
| `…001000_waiver_template_v1.sql` | Waiver v1 (**placeholder — needs legal review**) |

## Deviations from SDS §6, and why

The SDS sketch was a starting point. Four places where the implementation differs:

**1. `emergency_contact_*` moved off `users` into `user_emergency_contacts`.**
FR-1.5 says the emergency contact is visible *only* to the organizer of a booked hike. RLS is
row-level: any policy that lets one user read another's profile row would expose every column
on it, including the phone number. A separate table gets its own policy — owner, admin, or an
organizer with an active booking from that hiker in the last 30 days.

**2. Added `platform_config`.** The take rate has to be identical in three places: what Stripe
is told (`application_fee_amount`), what the ledger records, and what the refund maths uses.
An env var covers the first, so the other two would drift. One row in the database is the
single source of truth, and Edge Functions read it rather than their own env.

**3. Added `confirmed_spots` to `hikes`.** Denormalised sum of taken booking quantities,
maintained by trigger. Capacity checks happen on every checkout and the `full` transition
needs to be atomic; recounting `bookings` each time would put an aggregate inside the hot
path and inside a row lock.

**4. Added tables the functional requirements need but §6 did not list:**
`blocks` (FR-10.1), `chat_reads` (unread counts for FR-7.2), `waitlist_entries` (FR-3.5),
`attendee_flags` (FR-6.5), `push_tokens` (FR-9.1), `notification_prefs` (FR-9.2),
`admin_actions` (audit trail for FR-10.2), and `stripe_webhook_events` (idempotency —
without it a retried webhook double-credits an organizer).

**Not implemented yet:** promo codes (FR-5.8, "should"). Tracked in `ROADMAP.md`.

## State machines

**Hike** (FR-3.3) — `hikes.status`:

```
draft ──publish──► published ◄──spot frees──► full
                      │                        │
                      └────── auto 24h ────────┴──► completed
                      │
                      └────── cancel ─────────────► cancelled
```

`draft → published` is gated by `app.tg_hikes_guard()`: verified identity, `charges_enabled`,
`payouts_enabled`, first-aid attestation, weather checked within 7 days, and a start time in
the future. `published ↔ full` is automatic from `confirmed_spots`. `→ completed` is the
`trailmate-complete-hikes` cron.

**Booking** (FR-5.6) — `bookings.status`:

```
pending_payment ──payment_intent.succeeded──► confirmed ──hike completes──► attended
       │                                          │                          
       │ payment_failed → row deleted             ├──organizer check-in────► no_show
       │ (spot released)                          │
       │                                          ├──cancel-booking───────► cancelled_by_hiker
       │                                          └──cancel-hike─────────► cancelled_by_organizer
       │                                                                        │
       └───────────────────── charge.refunded ─────────────────────────────► refunded
```

`pending_payment` **holds capacity**. If it did not, a slow card would let someone else take
the spot mid-checkout. A failed payment deletes the row rather than cancelling it, which frees
the partial unique index so the hiker can retry with another card.

## RLS matrix

`✓` = allowed, `—` = no policy (denied), `fn` = only through an Edge Function (service role).

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | any signed-in, minus blocks | trigger only | self (roles/stats protected) | fn |
| `user_emergency_contacts` | self, admin, organizer of a booked hike | self | self | self |
| `notification_prefs`, `push_tokens`, `chat_reads` | self | self | self | self |
| `notifications` | self | fn | self (`read_at` only) | — |
| `organizer_profiles` | any signed-in | self (forced to pending) | self (Stripe fields protected) | — |
| `hikes` | non-draft + own drafts | self, if `organizer` role | own | own, `draft` only |
| `waiver_templates` | any signed-in | admin | admin | admin |
| `waivers` | signer, organizer of the hike, admin | fn | — | — |
| `bookings` | own, organizer of the hike, admin | fn | organizer (check-in only) | fn |
| `waitlist_entries` | own, organizer, admin | own (`waiting`) | fn | own |
| `reviews` | published + own + admin | attendee of the booking | author (content) / organizer (one response) | admin |
| `attendee_flags` | flagging organizer, admin | organizer of the hike | — | — |
| `follows` | any, minus blocks | own, not blocked | — | own |
| `blocks` | own | own | — | own |
| `chat_messages` | participants, minus blocked senders | participants, while writable | sender (retract) / organizer (pin) | — |
| `reports` | own, admin | own | admin | — |
| `admin_actions` | admin | admin | — | — |
| `payouts_ledger` | own (organizer), admin | fn | fn | — |
| `platform_config` | any signed-in | admin | admin | — |
| `stripe_webhook_events` | — | — | — | — |

Nothing is granted to `anon`. Every policy is `to authenticated`.

## Security helpers (`app` schema)

Not exposed through PostgREST (`config.toml` lists only `public` and `graphql_public`). All
are `security definer` with a pinned `search_path`, which is what lets a policy on `bookings`
consult `hikes` without recursing into that table's own policy.

| Function | Answers |
|---|---|
| `app.current_user_id()` | JWT subject → `users.id` |
| `app.is_admin()` | admin in `role_flags` |
| `app.is_organizer_of(hike)` | do I own this listing |
| `app.has_active_booking(hike)` | am I on the roster |
| `app.is_hike_participant(hike)` | either of the above (chat membership) |
| `app.chat_is_writable(hike)` | within the 7-day post-hike window |
| `app.is_blocked_with(user)` | block relationship in either direction |
| `app.can_publish(organizer)` | the FR-2.1/FR-2.2 gate |
| `app.is_privileged_context()` | service role / migration, for the column guards |

## Geo queries

`meeting_point geography(Point, 4326)` and `route geography(LineString, 4326)`, both GiST
indexed. `public.hikes_nearby()` is the single discovery entry point for FR-4.1 and FR-4.2 —
`ST_DWithin` in metres, plus every filter the SDS lists. It is `security invoker`, so RLS
still decides visibility; the RPC only adds the geo predicate and the filter surface.

## Regenerating types

```bash
npm run db:types    # supabase gen types typescript --local > apps/mobile/src/types/database.ts
```

`apps/mobile/src/types/database.ts` is hand-maintained for now and covers the tables the app
reads. A mismatch between it and the schema is a silent runtime bug — supabase-js trusts the
types without checking them — so regenerate after any migration that changes a column the app
touches.
