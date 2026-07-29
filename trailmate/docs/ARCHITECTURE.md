# Architecture

Implements SDS §3. This document is the *as-built* view — where the code actually lives and
which path a given request takes.

## Components

```
┌──────────────────────────────┐
│ apps/mobile (Expo, iOS+Android)
│  app/          expo-router routes
│  src/lib/      supabase client, auth, queries, edge-function wrappers
│  src/theme/    tokens
└───────┬──────────────────────┘
        │ 1. anon key + user JWT (RLS applies)      ┌──────────────┐
        │ 2. functions.invoke() for privileged work │  Mapbox      │ tiles, geocoding
        ▼                                           └──────────────┘
┌──────────────────────────────┐
│ Supabase                     │
│  Postgres + PostGIS          │  supabase/migrations/
│  Row-Level Security          │  20260729000700_rls.sql
│  Auth (email + Apple/Google) │
│  Realtime (chat, notifs)     │
│  Storage (photos, gpx, pdfs) │  20260729000800_storage.sql
│  Edge Functions (Deno)       │  supabase/functions/
│  pg_cron + pg_net            │  20260729000900_cron.sql
└───────┬──────────────────────┘
        │ service-role writes only from inside Edge Functions
        ▼
┌──────────────────────────────┐
│ Stripe                       │
│  Connect Express (payouts)   │
│  Identity (ID + selfie)      │
│  PaymentIntents (destination charges)
└──────────────────────────────┘
```

## The four rules, and what enforces them

SDS §3.3 states four architectural rules. Each one has a concrete enforcement point, not
just a convention:

| Rule | Enforced by |
|---|---|
| App never holds a Stripe secret key | Secrets are read only in `supabase/functions/_shared/env.ts`. Nothing under `apps/mobile` imports it, and `EXPO_PUBLIC_*` is the only env prefix the bundler inlines. |
| RLS on every table | `20260729000700_rls.sql` calls `enable row level security` on all of them. Tables with no policy (`stripe_webhook_events`) are service-role-only by construction. |
| Money state only from webhooks | `bookings` has **no client INSERT policy** and a `bookings_protect_columns` trigger that rejects any client attempt to touch amounts, Stripe IDs or status beyond organizer check-in. Only `stripe-webhook` sets `confirmed`. |
| Chat/feed over Realtime, scoped | `chat_messages` is in the `supabase_realtime` publication, and Realtime honours RLS — a subscriber receives only rows `chat_select_participants` already allows. |

## Two ways the client talks to the backend

**Direct, RLS-enforced (`src/lib/queries.ts`).** Profiles, listings, follows, chat, reviews,
notifications. These are ordinary PostgREST reads and writes. The security model is the
policy, so there is no server code to review for these paths — which is the point.

**Through an Edge Function (`src/lib/functions.ts`).** Anything that moves money, mints a
legal record, or must not be forgeable:

| Function | Why it cannot be a direct write |
|---|---|
| `create-booking-checkout` | Needs the Stripe secret key; must compute the fee split server-side; holds spots under a lock. |
| `stripe-webhook` | Authenticated by Stripe signature, not a user JWT. The only writer of `confirmed`. |
| `sign-waiver` | `ip_hash` and `document_hash` must be server-generated or the record proves nothing. |
| `cancel-booking` / `cancel-hike` | Refund maths plus Stripe refunds; a client-computed refund is a client-chosen refund. |
| `release-payouts` | Cron-triggered; decides when the dispute window has closed. |
| `send-notifications` | Holds the Expo access token; batches across users. |
| `stripe-connect-onboarding` / `stripe-identity-session` | Create Stripe objects with the secret key. |
| `delete-account` | Must anonymise *and* revoke auth credentials in the right order. |

## Where authorization actually lives

Three layers, deliberately overlapping:

1. **RLS policies** decide which *rows* a role can see or change.
2. **Column-protection triggers** (`*_protect_columns`) decide which *columns* a
   non-privileged caller may change within a row it already owns. RLS is row-level only, so
   without these an organizer could edit `confirmed_spots` on their own hike, or a user
   could grant themselves `admin` in `role_flags`.
3. **Guard triggers** (`bookings_guard`, `hikes_guard`, `reviews_guard`) enforce invariants
   that hold regardless of who is writing — oversell prevention, the publish gate, review
   eligibility. These fire for service-role writes too, which is intentional: an Edge
   Function bug should not be able to oversell a hike either.

`app.is_privileged_context()` is what lets the column guards step aside for Edge Functions
while still applying to end users.

## The oversell guard

The one race worth spelling out. Two hikers checking out for the last spot:

1. Both call `create-booking-checkout`.
2. Both insert into `bookings`.
3. `app.tg_bookings_guard()` runs `SELECT … FROM hikes WHERE id = … FOR UPDATE` — the
   second transaction blocks on the row lock.
4. First commits, `confirmed_spots` reaches capacity.
5. Second resumes, re-sums taken spots, exceeds `capacity_max`, raises `check_violation`.
6. The function maps `23514` to a 409 `not_bookable`, and no PaymentIntent is ever created.

The lock is on `hikes`, not `bookings`, because capacity is a property of the listing. Doing
this in application code instead would need either a distributed lock or an
over-provisioning tolerance; the database already has exactly the primitive required.

## Offline behaviour (NFR-5)

react-query is configured with a 24-hour `gcTime` in `app/_layout.tsx`, so booked-hike
details, roster and meeting point survive losing signal at the trailhead. Waiver PDFs are in
private Storage and need a signed URL, so they must be fetched before leaving coverage —
that is a known gap, tracked in `ROADMAP.md` under Phase 3.

## What is deliberately not here

- **No custom API server.** PostgREST plus Edge Functions covers v1; adding a server would
  mean owning auth, deploys and scaling for no capability gain at this size.
- **No live GPS tracking** (FR-8.4). Deferred in the SDS, and nothing in the schema assumes
  it — adding a `tracks` table later touches no existing path.
- **No web booking portal.** Out of scope for v1. The post-v1 backlog notes Astro for SEO
  listing pages, which would read the same Supabase project.
