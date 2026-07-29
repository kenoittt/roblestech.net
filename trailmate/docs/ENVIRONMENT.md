# Environment setup

Three environments: **local** (Docker), **staging** (a Supabase project in Stripe test mode),
**production**. The only difference in the code is configuration.

## Local

```bash
npm install
supabase start          # Postgres :54322, API :54321, Studio :54323, Inbucket :54324
supabase db reset       # migrations + seed.sql
```

`supabase status` prints the anon key. Copy it into `apps/mobile/.env`:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Then `npm run mobile`. Sign in with any seed account — password `trailmate-dev-pw`:

| Account | Role |
|---|---|
| `alex@example.com` | organizer, fully verified — can publish |
| `sam@example.com` | organizer mid-onboarding — publishing is blocked (tests the gate) |
| `jordan@example.com` | hiker with a confirmed free booking and chat history |
| `riley@example.com` | hiker |
| `admin@example.com` | admin |

Confirmation emails land in Inbucket at http://localhost:54324, not a real inbox.

### Edge Function secrets, locally

Create `supabase/.env` (gitignored) and `supabase functions serve` picks it up:

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…      # from `stripe listen`
CRON_SECRET=any-local-string
WAIVER_IP_PEPPER=any-local-string
APP_DEEP_LINK_SCHEME=trailmate
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically by the CLI.

### Native modules

Stripe's Payment Sheet and Mapbox both ship native code, so they do not work in Expo Go. The
app detects their absence and shows a notice instead of crashing (`features` in
`src/lib/env.ts`). For the real thing:

```bash
npm run mobile:build:dev     # eas build --profile development --platform all
```

## Staging / production

### 1. Supabase project

```bash
supabase link --project-ref <ref>
supabase db push                       # applies migrations
supabase functions deploy              # all functions
```

Enable in Dashboard → Database → Extensions: **postgis**, **pg_cron**, **pg_net**. The
extensions migration is written to survive their absence, but cron will not run without them —
re-run `20260729000900_cron.sql` after enabling.

Seed the Vault secrets the cron jobs use to reach Edge Functions:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'functions_base_url');
select vault.create_secret('<random-64-chars>', 'cron_secret');
```

The `cron_secret` value must match the `CRON_SECRET` function secret below.

### 2. Function secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_… \
  STRIPE_WEBHOOK_SECRET=whsec_… \
  CRON_SECRET=<same as the vault value> \
  WAIVER_IP_PEPPER=<random, and never rotate it> \
  APP_DEEP_LINK_SCHEME=trailmate \
  EXPO_ACCESS_TOKEN=<optional, for authenticated Expo Push>
```

`WAIVER_IP_PEPPER` must never change: rotating it makes every stored `ip_hash`
unverifiable, and those records are retained for 7 years (NFR-4).

### 3. Stripe

- Enable **Connect** (Express accounts) and **Identity**.
- Add a webhook endpoint at
  `https://<ref>.supabase.co/functions/v1/stripe-webhook`, subscribed to:
  `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`,
  `charge.refunded`, `charge.dispute.created`, `account.updated`, `transfer.reversed`,
  `payout.paid`, and `identity.verification_session.{verified,processing,requires_input,canceled}`.
- Enable **Connect webhooks** for `account.updated` and `payout.paid` — those fire on the
  connected account, and the handler reads `event.account` to identify it.
- Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.

### 4. Auth providers

In Dashboard → Authentication → Providers, or `supabase/config.toml` for local:

- **Apple** — required by App Review as soon as any other social login exists (FR-1.1).
- **Google** — Android and iOS client IDs.
- Redirect allow-list must include `trailmate://auth-callback`.

### 5. EAS

```bash
eas login
eas init                        # writes the project ID
eas secret:create --name MAPBOX_DOWNLOAD_TOKEN --value sk.…
eas secret:create --name SENTRY_AUTH_TOKEN --value …
```

`MAPBOX_DOWNLOAD_TOKEN` is a **secret** Mapbox token used at build time to fetch the SDK — it
is not the same as the public `pk.…` token the app uses at runtime, and it must never be
committed or exposed as `EXPO_PUBLIC_*`.

## Secret handling, in one rule

If it is named `EXPO_PUBLIC_*`, assume it is published — the bundler inlines it into JavaScript
that ships to devices. Everything else belongs in `supabase secrets` or as an EAS secret.

| Where it lives | What goes there |
|---|---|
| `apps/mobile/.env` | Supabase URL + anon key, Stripe **publishable** key, Mapbox **public** token, PostHog key, Sentry DSN |
| `supabase secrets` | Stripe secret key, webhook secret, cron secret, waiver pepper, Expo access token |
| EAS secrets | Mapbox download token, Sentry auth token, EAS project ID |
| Nowhere in the repo | Service-role key, any `sk_…`, any `whsec_…` |

## Verifying a deployment

```bash
supabase db lint                       # schema warnings
```

Then, in the Dashboard → Advisors, clear the security warnings — in particular any table
reported without RLS, and any `security definer` function without a pinned `search_path`. Both
should be empty; every function in this repo sets `search_path` explicitly.

Smoke test the money path end to end before letting a real organizer near it: publish a hike as
a verified organizer, book it from a second account with card `4242 4242 4242 4242`, confirm
the booking flips to `confirmed` only after the webhook lands, and confirm a `payouts_ledger`
row appears with `status = held` and a `releasable_at` 24 hours after the hike's *end* time.
