# Contributing

## Setup

See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md). Short version: `npm install`,
`supabase start`, `supabase db reset`, `npm run mobile`.

## Before you push

```bash
npm run typecheck
npm run lint
npm run functions:check     # needs deno
npm run db:test             # resets the DB, applies every migration, then asserts
```

CI runs all four. The `db reset` one catches the mistake that is easiest to make and hardest
to notice: a migration that works against *your* database because of something you did by
hand, and fails on a clean one.

## Working on the database

**Migrations are append-only.** Never edit a file that has been applied anywhere but your
laptop. To capture a change you made in Studio:

```bash
npm run db:diff -- add_promo_codes    # writes supabase/migrations/<timestamp>_add_promo_codes.sql
```

Read the generated SQL before committing it — `db diff` will happily include noise.

**Every new table needs RLS.** Enable it, then write policies. A table with RLS enabled and no
policy is service-role-only, which is sometimes correct (`stripe_webhook_events`) — say so in a
comment when it is.

**RLS is row-level.** If a table holds a column that only *some* readers of that row should
see, the column is in the wrong table. `user_emergency_contacts` exists for exactly this
reason. If splitting is genuinely wrong, add a column-protection trigger and document why.

**Regenerate types** after a schema change the app reads:

```bash
npm run db:types
```

## Working on Edge Functions

Anything that moves money, signs a legal record, or must not be forgeable belongs here rather
than in a direct client write. The reverse is also true: an ordinary read that RLS already
protects should *not* become a function, because that trades an enforced policy for reviewable
code.

Three rules that are not negotiable:

1. **Authenticate with `requireUser(req)`, then act with `adminClient()`.** Never trust a user
   id from the request body. The pattern is: prove who is asking with their JWT, then use the
   service role to do the write they are entitled to.
2. **Never confirm money from a client call.** `create-booking-checkout` creates a
   PaymentIntent and returns a client secret. Only `stripe-webhook` writes `confirmed`.
3. **Make it idempotent.** Stripe retries. Use an idempotency key on every Stripe write and
   assume every handler may run twice.

Local testing:

```bash
npm run functions:serve
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## Working on the app

- Reads and RLS-safe writes go in `src/lib/queries.ts` as react-query hooks.
- Anything privileged goes through a wrapper in `src/lib/functions.ts`.
- Screens are `app/**` (expo-router, file-based). Keep data fetching in hooks, not in JSX.
- Use tokens from `src/theme/tokens.ts`. No inline hex.
- Accessibility is not a Phase 3 task you bolt on: every `Pressable` needs an
  `accessibilityRole` and a label, and interactive targets are ≥ 44pt (NFR-6).

## Commits and PRs

Conventional-ish prefixes, and reference the requirement:

```
feat(checkout): block payment until the waiver is signed (FR-5.2)
fix(rls): stop organizers editing confirmed_spots on their own hikes
docs(payments): document the proportional commission clawback on partial refunds
```

Keep a PR to one requirement where you can. The PR template asks how you verified the change —
answer it with what you ran, not with "tested locally".

## Things that will get a PR sent back

- A new table without RLS.
- A client-side reimplementation of the refund policy, or of the fee split. Both live in
  SQL (`public.refund_cents`, `public.commission_cents`) and in
  `_shared/stripe.ts`; the app displays what the server returns.
- A `security definer` function without `set search_path`.
- Editing an already-applied migration.
- Hardcoding the take rate. It is a row in `platform_config`.
- Shipping the placeholder waiver text as real (see SDS §9.4 — that is a lawyer's job).
