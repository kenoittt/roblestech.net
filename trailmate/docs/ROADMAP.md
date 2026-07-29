# Roadmap

Implements SDS §10. Checked items exist in this repo; unchecked items are the remaining work,
each tagged with the requirement it satisfies.

## Phase 0 — Foundations (Weeks 1–2)

- [x] Expo + TypeScript project, expo-router, monorepo Metro config
- [x] Supabase schema, RLS on every table, triggers, cron jobs
- [x] Auth: email + password, profile provisioning trigger, 18+ attestation
- [x] Design tokens and shared UI primitives
- [x] Edge Function scaffolding: shared env / http / supabase / stripe modules
- [x] CI: typecheck, lint, `deno check` on every function
- [ ] EAS project created; `EAS_PROJECT_ID` and secrets set (`MAPBOX_DOWNLOAD_TOKEN`, Sentry)
- [ ] Apple Developer + Google Play accounts, bundle IDs registered
- [ ] Apple and Google OAuth providers configured (FR-1.1) — both or neither, per App Review
- [ ] Mapbox account; `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` in `.env`
- [ ] Stripe test-mode Connect + Identity enabled; webhook endpoint registered
- [ ] App icons and splash assets (`apps/mobile/assets/` is currently empty)

## Phase 1 — Marketplace core (Weeks 3–7)

**Exit criteria:** an end-to-end paid booking with a signed waiver, in TestFlight and the Play
internal track.

- [x] Organizer verification + Connect onboarding flow (FR-2.1, FR-2.2)
- [x] Explore list with difficulty and radius filters (FR-4.2)
- [x] Hike detail page (FR-4.3)
- [x] Checkout: spots → waiver → pay, with free-hike RSVP (FR-5.1, FR-5.2, FR-3.6)
- [x] Booking state machine and Stripe webhook handling (FR-5.6, FR-5.3)
- [x] Hiker and organizer cancellation with policy-correct refunds (FR-5.4, FR-5.5)
- [x] Organizer dashboard: listings and earnings (§8)
- [ ] **Create-listing wizard, 5 steps** (FR-3.1) — the largest remaining piece of Phase 1
- [ ] GPX upload and map-drawn routes, elevation profile derivation (FR-3.2)
- [ ] Mapbox map view with clustering (FR-4.1)
- [ ] Route polyline + elevation chart on the detail page (FR-8.1)
- [ ] Meeting-point pin with real coordinates in the maps handoff (FR-8.2)
- [ ] Roster screen: attendee list, waiver status, emergency contacts, check-in (FR-5.7)
- [ ] Duplicate / repost a past hike (FR-3.4)
- [ ] Profile editing: name, photo, bio, region, experience (FR-1.2)
- [ ] Emergency contact capture at first booking (FR-1.5)
- [ ] Push token registration + notification permission flow (FR-9.1)
- [ ] Remaining discovery filters: date range, price, duration, organizer rating (FR-4.2)

## Phase 2 — Community & trust (Weeks 8–11)

- [x] Per-hike group chat with pinning and the read-only window (FR-7.2)
- [x] Follows (FR-7.1) and a follow-based feed (FR-7.3)
- [x] Review eligibility, window and rating aggregates, enforced in the database (FR-6.x)
- [x] Notification queue + Expo Push delivery with chat batching (FR-9.1)
- [x] Waitlist promotion and claim-window expiry, server side (FR-3.5)
- [ ] **Review submission screen** — ratings, text, photos (FR-6.1)
- [ ] Organizer response to a review (FR-6.3)
- [ ] Waitlist join UI and claim flow (FR-3.5)
- [ ] Report and block UI for users, listings, reviews, messages (FR-10.1)
- [ ] Private attendee flagging (FR-6.5)
- [ ] Notification preference screen (FR-9.2)
- [ ] **Admin console** — Retool or a small Next.js app: report queue with SLAs, verification
      review, listing takedown, refund issuance, review moderation (FR-10.2)
- [ ] Content screening on upload — images and text (FR-10.3)
- [ ] Share sheet + deferred deep linking (FR-7.4)

## Phase 3 — Hardening & launch (Weeks 12–14)

- [ ] Offline caching pass: pre-fetch waiver PDFs and roster before losing signal (NFR-5)
- [ ] Accessibility pass: VoiceOver/TalkBack on every core flow, dynamic type (NFR-6)
- [ ] Load test the discovery RPC and the webhook path; verify NFR-1 budgets
- [ ] Security review: `supabase db lint`, advisor warnings, RLS test suite
- [ ] Sentry + PostHog wired with the funnels in NFR-7
- [ ] Store assets, screenshots, privacy nutrition labels
- [ ] **App Review prep** — the four things Apple will look at:
      account deletion (done, FR-1.4), Apple sign-in alongside Google (FR-1.1),
      UGC moderation with report/block (FR-10.1), and payments for *physical-world
      services*, which are allowed outside IAP — which is why Stripe is fine here
- [ ] **Legal:** lawyer-reviewed waiver (replace template v1) and ToS — SDS §9.4 calls this
      the single most important spend before launch
- [ ] Closed beta with 3–5 hand-recruited organizers (SDS §12 cold-start mitigation)

## Deferred (SDS §1.2, §4.8, post-v1)

Live GPS tracking during hikes and offline map packs (FR-8.4) · promo codes (FR-5.8) ·
direct messages and hiker crews (FR-7.5) · personalised ranking (FR-4.5) · gear marketplace ·
multi-country payments and currencies · web listing pages for SEO (Astro) · recurring-hike
subscriptions · organizer analytics.

## Blocked on decisions

Four items cannot be finished until SDS §13 is answered. See `OPEN_QUESTIONS.md` — the
per-guest waiver question (Q4) in particular changes the `waivers` table shape, so it is worth
resolving before the roster screen is built.
