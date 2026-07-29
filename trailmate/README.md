# TrailMate

Two-sided hiking marketplace. **Organizers** publish guided hikes; **hikers** discover,
book, pay, sign a liability waiver, attend, and review. The platform holds funds until the
hike completes, then pays the organizer out minus commission.

Built from [`docs/SDS.md`](docs/SDS.md) (Software Design Specification v0.9).

| | |
|---|---|
| Mobile | React Native + Expo (TypeScript), expo-router |
| Backend | Supabase — Postgres + PostGIS, Auth, Realtime, Storage, Edge Functions |
| Payments | Stripe Connect (Express) + Stripe Identity |
| Maps | Mapbox |
| Push | Expo Push Notifications |
| Status | Phase 0 — foundations scaffold |

---

## Repository layout

```
trailmate/
├── apps/mobile/            Expo React Native app (iOS + Android)
│   ├── app/                expo-router file-based routes
│   └── src/                lib, features, components, theme, types
├── supabase/
│   ├── migrations/         Schema, RLS, triggers, cron (ordered, immutable)
│   ├── functions/          Deno Edge Functions (all privileged writes)
│   ├── tests/              Behavioural checks: oversell, refunds, RLS denials
│   └── seed.sql            Local dev seed data
├── docs/                   SDS + derived design docs
└── .github/workflows/      CI (typecheck, lint, deno check) + EAS build
```

## Architectural rules (non-negotiable)

These come from SDS §3.3 and are enforced by review:

1. **The app never holds a Stripe secret key.** Every payment mutation goes through an
   Edge Function.
2. **Row-Level Security on every table.** The client uses the anon/publishable key plus
   the user's JWT — never the service-role key.
3. **Money state changes only from Stripe webhooks.** A client claiming "I paid" changes
   nothing; `payment_intent.succeeded` does.
4. **Chat and feed** ride Supabase Realtime channels scoped per hike / per user.

## Quickstart

Prerequisites: Node 20+, [Supabase CLI](https://supabase.com/docs/guides/cli), Docker
(for the local Supabase stack), and an Expo account for device builds.

```bash
npm install                       # installs workspaces (apps/mobile)

# 1. Backend
supabase start                    # local Postgres + Auth + Storage on :54321
supabase db reset                 # applies supabase/migrations + seed.sql

# 2. Mobile
cp apps/mobile/.env.example apps/mobile/.env   # fill in the values below
npm run mobile                    # Expo dev server
```

Then press `i` / `a` in the Expo CLI, or scan the QR code with Expo Go. Stripe and Mapbox
features need a development build (`npm run mobile:build:dev`) because both ship native
code.

### Environment

`apps/mobile/.env` — public values only, they ship inside the app bundle:

| Variable | Where to get it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `supabase status` locally, or project settings |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | same |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → API keys (`pk_test_…`) |
| `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` | Mapbox account → tokens (`pk.…`) |
| `EXPO_PUBLIC_POSTHOG_KEY` | PostHog project settings (optional) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry project settings (optional) |

Edge Function secrets — **never** committed, set with
`supabase secrets set KEY=value`:

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Charges, transfers, refunds, Connect, Identity |
| `STRIPE_WEBHOOK_SECRET` | Verifies `stripe-webhook` signatures |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged writes inside functions (auto-injected) |
| `PLATFORM_TAKE_RATE_BPS` | Commission in basis points — `1300` = 13% |
| `CRON_SECRET` | Shared secret for cron-invoked functions |
| `APP_DEEP_LINK_SCHEME` | `trailmate` — used in Connect return URLs |

See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for the full setup runbook.

## Common tasks

```bash
npm run mobile               # Expo dev server
npm run typecheck            # tsc across workspaces
npm run lint                 # eslint
npm run db:reset             # re-apply migrations + seed
npm run db:test              # reset, then assert the schema invariants
npm run db:diff -- <name>    # capture local schema changes into a new migration
npm run db:types             # regenerate apps/mobile/src/types/database.ts
npm run functions:serve      # run Edge Functions locally
npm run functions:check      # deno check on every function
```

`npm run db:test` is the one to run after touching a migration. It asserts the things that
fail silently and expensively: the oversell guard, the publish gate, every refund-policy
boundary, and that an `authenticated` role genuinely cannot read another user's emergency
contact or insert a booking. See [`supabase/tests/README.md`](supabase/tests/README.md).

## Documentation

| Doc | Contents |
|---|---|
| [`docs/SDS.md`](docs/SDS.md) | The specification this repo implements (v0.9) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Component boundaries, request paths, trust model |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Tables, enums, RLS matrix, deviations from the SDS |
| [`docs/PAYMENTS.md`](docs/PAYMENTS.md) | Money flow, state machines, refund math, payout release |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phases 0–3 broken into tracked work items |
| [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) | SDS §13 decisions still blocking work |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Local, staging, production setup |

## Legal note

The waiver template in `supabase/migrations` and `docs/` is a **placeholder**. SDS §9.4 is
explicit: a lawyer must review the waiver and ToS before launch. Do not ship the
placeholder text.
