# Software Design Specification — "TrailMate" (working title)
**Hiking Marketplace & Community App**
Version 0.9 (Draft for review) · July 29, 2026

---

## 1. Introduction

### 1.1 Purpose
This document specifies the design of a two-sided mobile marketplace connecting **hike organizers** (guides, clubs, outdoor companies, experienced individuals) with **hikers** who discover, book, pay for, attend, and review organized hikes. It covers product scope, system architecture, functional and non-functional requirements, data model, payment flows, and a phased delivery plan.

### 1.2 Scope
- **In scope (v1):** Native-quality installable apps for iOS and Android; accounts and profiles; organizer verification; hike listings with routes and maps; booking with in-app payment; platform commission and organizer payouts; e-signed liability waivers; double-sided reviews; social layer (follows, activity feed, per-hike group chat); push notifications; admin/moderation console.
- **Out of scope (v1, deferred):** Live GPS tracking during hikes, offline map downloads, gear marketplace, multi-country payments/currencies, web booking portal, DMs between arbitrary users, subscriptions.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Organizer | Verified user who publishes hikes and receives payouts |
| Hiker | User who browses, books, attends, and reviews hikes |
| Listing | A published hike event (date, route, capacity, price) |
| Booking | A hiker's confirmed, paid spot on a listing |
| Take rate | Platform commission deducted from each paid booking |
| Waiver | E-signed liability release required before attending |

### 1.4 Key business decisions (confirmed)
1. Distribution: installable apps on the Apple App Store and Google Play.
2. Monetization: platform takes a percentage of paid hikes (recommended starting point: **12–15%**, charged to the organizer side; see §9).
3. Trust & safety in v1: organizer ID verification **and** participant waivers.
4. Launch: single country (**assumed US / Stripe-supported**; confirm — see §13).

---

## 2. Product Overview

### 2.1 User roles
1. **Hiker** — discovers hikes via map/search/feed, books and pays, signs waiver, chats with the hike group, attends, reviews the hike and organizer.
2. **Organizer** — completes identity verification and payout onboarding, creates listings, manages capacity and roster, communicates with attendees, gets paid out after the hike, reviews attendees (private flagging only in v1).
3. **Admin (internal)** — moderates content and users, resolves disputes/refunds, reviews verification edge cases, views platform analytics.

### 2.2 Core value loop
Organizer posts hike → hikers discover and book → platform collects payment and holds it → hike happens → payout released to organizer minus commission → both sides review → ratings improve discovery ranking → more bookings.

### 2.3 Success metrics (v1)
- Liquidity: ≥ 60% of published listings receive ≥ 1 booking within 14 days.
- Fill rate: median listing reaches ≥ 50% capacity.
- Repeat rate: ≥ 30% of hikers book a second hike within 60 days.
- Review completion: ≥ 50% of completed bookings leave a review.
- Dispute rate: < 2% of bookings.

---

## 3. System Architecture

### 3.1 Stack (chosen for cost-efficient research & testing)
| Layer | Technology | Rationale |
|---|---|---|
| Mobile app | **React Native + Expo (TypeScript)** | One codebase → both stores; OTA updates for instant tester fixes; EAS Build/Submit for CI to TestFlight & Play internal track |
| Backend | **Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions) | Managed Postgres with Row-Level Security; Realtime powers chat/feed; Edge Functions host payment webhooks and business logic |
| Payments | **Stripe Connect (Express accounts)** + Stripe Identity | Marketplace-native: split payments, commission, payouts, KYC, 1099s handled by Stripe |
| Maps | **Mapbox** (Maps SDK for RN) | Outdoor/terrain styles, GPX route rendering, better pricing at scale than Google Maps |
| Push | Expo Push Notifications | Free, unified iOS/Android |
| Waivers | In-app e-sign flow (custom, stored in Supabase) with versioned waiver templates | Cheap; upgrade to a vendor (e.g., Smartwaiver) if legal counsel requires |
| Analytics | PostHog (mobile SDK) | Product analytics + session replay, generous free tier |
| Error tracking | Sentry | RN-native support |
| Admin console | Retool or a small Next.js app on Vercel | Fast to build; reads Supabase directly |

### 3.2 High-level architecture
```
┌────────────────────────┐
│  React Native app      │  iOS / Android (Expo)
│  - UI, offline cache   │
└──────────┬─────────────┘
           │ supabase-js (RLS-enforced)        ┌──────────────┐
           ▼                                   │   Mapbox     │◄─ map tiles, geocoding
┌────────────────────────┐                     └──────────────┘
│  Supabase              │
│  - Postgres + RLS      │      webhooks       ┌──────────────┐
│  - Auth (email/OAuth)  │◄───────────────────►│    Stripe    │
│  - Realtime (chat/feed)│   Edge Functions    │ Connect +    │
│  - Storage (photos,    │                     │ Identity     │
│    GPX, waiver PDFs)   │                     └──────────────┘
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│  Admin console (Retool)│
└────────────────────────┘
```

### 3.3 Key architectural rules
- The mobile app **never** talks to Stripe with secret keys. All payment mutations go through Supabase Edge Functions.
- All tables enforce **Row-Level Security**; the client uses the anon key + user JWT only.
- Money-state changes (booking confirmed, refund, payout) are driven **only by Stripe webhooks**, never by client claims.
- Chat and feed use Supabase Realtime channels scoped per hike / per user.

---

## 4. Functional Requirements

Requirements are labeled FR-x.y. Priority: **M** (must, v1) / **S** (should, v1 if time) / **L** (later).

### 4.1 Accounts & profiles
- **FR-1.1 (M)** Sign up / sign in with email+password and Apple & Google OAuth (Apple sign-in is mandatory for App Store when other social logins exist).
- **FR-1.2 (M)** Profile: display name, photo, bio, home region, hiking experience level, hike stats (completed count, distance).
- **FR-1.3 (M)** A user can hold both roles; "Become an organizer" upgrades the account via the verification flow (§4.2).
- **FR-1.4 (M)** Account deletion in-app (App Store requirement) with anonymization of reviews and retention of financial records.
- **FR-1.5 (S)** Emergency contact (name + phone) collected at first booking; visible to the organizer of a booked hike only.

### 4.2 Organizer verification & payout onboarding
- **FR-2.1 (M)** Government-ID verification via **Stripe Identity** (document + selfie match) before the first listing can be published.
- **FR-2.2 (M)** Payout onboarding via **Stripe Connect Express** hosted flow (bank account, KYC, tax info). Listing publishing is blocked until `charges_enabled` and `payouts_enabled` are true.
- **FR-2.3 (M)** Organizer profile page: verification badge, bio, credentials free-text (e.g., WFR, guide license), rating, review list, upcoming hikes.
- **FR-2.4 (S)** Admin can revoke organizer status; active listings are auto-cancelled with refunds.

### 4.3 Hike listings
- **FR-3.1 (M)** Create/edit listing: title, description, cover photos (≤ 10), date & start time, meeting point (map pin + text), difficulty (Easy/Moderate/Hard/Expert), distance, elevation gain, expected duration, capacity (min/max), price per spot (or free), what's included, requirements (fitness, gear list), dog/kid policy, cancellation policy (choose from platform presets — see §9.4).
- **FR-3.2 (M)** Route: upload GPX **or** draw route on map; rendered as polyline with elevation profile.
- **FR-3.3 (M)** Listing states: `draft → published → full → completed → cancelled`. Auto-`completed` 24 h after start time.
- **FR-3.4 (M)** Duplicate/repost a past hike (organizers run recurring hikes).
- **FR-3.5 (S)** Waitlist when full; auto-promote on cancellation with 6-hour claim window.
- **FR-3.6 (M)** Free hikes supported (RSVP without payment; waiver still required).

### 4.4 Discovery
- **FR-4.1 (M)** Map view of upcoming hikes near the user (Mapbox clustering).
- **FR-4.2 (M)** List/search with filters: date range, distance from me, difficulty, price range, duration, organizer rating.
- **FR-4.3 (M)** Hike detail page: all listing fields, route map, elevation profile, organizer card, attendee count/avatars, reviews of similar past runs of the hike.
- **FR-4.4 (S)** Home feed blends: upcoming booked hikes, new hikes from followed organizers, popular nearby hikes.
- **FR-4.5 (L)** Personalized ranking (difficulty match, past behavior).

### 4.5 Booking, payments & waivers
- **FR-5.1 (M)** Checkout: select spots (self + guests up to listing's guest policy), see price breakdown (spot price × qty + hiker service fee if enabled), pay via Stripe Payment Sheet (cards, Apple Pay, Google Pay).
- **FR-5.2 (M)** **Waiver e-sign is a blocking step inside checkout.** The waiver template is versioned; the signed record stores template version, full legal name, timestamp, IP, and a hash. A signed PDF copy is generated and stored (Supabase Storage) and emailed to the hiker.
- **FR-5.3 (M)** Funds are captured at booking and **held**; transfer to organizer is released 24 h after hike completion (dispute window). Implemented via destination charges with `transfer_data` + delayed payouts, or separate transfers on completion.
- **FR-5.4 (M)** Cancellation by hiker: refund per the listing's policy preset, automated.
- **FR-5.5 (M)** Cancellation by organizer (or weather cancellation): full automatic refund to all attendees + push/email notification.
- **FR-5.6 (M)** Booking states: `pending_payment → confirmed → attended | no_show | cancelled_by_hiker | cancelled_by_organizer | refunded`.
- **FR-5.7 (M)** Organizer roster view: attendee list, waiver status, emergency contacts, headcount check-in on hike day.
- **FR-5.8 (S)** Promo codes (platform-funded first; organizer-funded later).

### 4.6 Reviews & ratings
- **FR-6.1 (M)** After a hike auto-completes, attendees are prompted (push + in-app) to leave: star rating (1–5) for the **hike** and for the **organizer**, plus text and optional photos.
- **FR-6.2 (M)** Reviews are only possible with a confirmed, attended booking (verified-attendee badge).
- **FR-6.3 (M)** Review window: 14 days. Reviews publish immediately; organizer may post one public response.
- **FR-6.4 (M)** Organizer ratings aggregate across all their hikes and drive search ranking.
- **FR-6.5 (S)** Organizers can privately flag problem attendees to admin (no public hiker ratings in v1 — avoids harassment vectors).
- **FR-6.6 (M)** Report-review flow; admin can remove reviews violating policy.

### 4.7 Social
- **FR-7.1 (M)** Follow organizers (and other hikers); follower/following counts on profiles.
- **FR-7.2 (M)** **Per-hike group chat** (Supabase Realtime): opens at booking, includes organizer + confirmed attendees, read-only 7 days after completion. Organizer can pin announcements.
- **FR-7.3 (M)** Activity feed: new hikes from followed organizers, friends' completed hikes (respecting privacy setting), review highlights.
- **FR-7.4 (S)** Share sheet: deep link to a listing (branch to store if app not installed — universal links + deferred deep linking via Expo).
- **FR-7.5 (L)** Direct messages, hiker-created "crews"/groups, photo albums per hike.

### 4.8 Maps & GPS (v1 scope)
- **FR-8.1 (M)** Route polyline + elevation profile on listing detail.
- **FR-8.2 (M)** Meeting-point pin with "open in Apple/Google Maps" directions handoff.
- **FR-8.3 (S)** Trailhead parking notes field.
- **FR-8.4 (L)** Live location sharing during hike, offline map packs, recorded tracks. (Deliberately deferred: high battery/complexity cost, not needed to prove the marketplace.)

### 4.9 Notifications
- **FR-9.1 (M)** Push + email for: booking confirmed, hike reminder (48 h and 3 h before), chat messages (batched), hike changed/cancelled, refund issued, payout sent, review prompt, waitlist promotion.
- **FR-9.2 (M)** Per-category notification preferences.

### 4.10 Trust, safety & moderation
- **FR-10.1 (M)** Report user / listing / review / chat message; block user (hides content bidirectionally, prevents shared bookings from surfacing chat).
- **FR-10.2 (M)** Admin console: user search, verification review, listing takedown, refund issuance, review moderation, report queue with SLAs.
- **FR-10.3 (M)** Content rules enforced at upload (image moderation via lightweight vendor or Claude API screening for text).
- **FR-10.4 (M)** Safety content: every listing shows a standard "hike smart" checklist; organizers must confirm they carry a first-aid kit and have checked weather to publish.

---

## 5. Non-Functional Requirements

- **NFR-1 Performance:** cold start < 3 s on mid-range Android; map view interactive < 2 s on LTE; search results < 800 ms p95.
- **NFR-2 Availability:** 99.5% for booking/payment paths (Supabase + Stripe SLAs dominate).
- **NFR-3 Security:** RLS on every table; secrets only in Edge Functions; JWT expiry ≤ 1 h with refresh; webhook signature verification; rate limiting on auth and chat.
- **NFR-4 Privacy/compliance:** privacy policy + ToS gating signup; data export & deletion (CCPA-ready); waiver and payment records retained 7 years; minors: **18+ only in v1** (dramatically simplifies waivers and safety posture).
- **NFR-5 Offline behavior:** booked-hike details, roster, waiver PDFs, and meeting point cached for offline viewing (hikes happen out of coverage).
- **NFR-6 Accessibility:** WCAG-informed; dynamic type, VoiceOver/TalkBack labels on core flows.
- **NFR-7 Observability:** Sentry crash-free sessions ≥ 99.5%; PostHog funnels on signup → first booking and listing create → publish.

---

## 6. Data Model (core tables)

```sql
users            (id, auth_id, display_name, avatar_url, bio, region,
                  experience_level, emergency_contact_name, emergency_contact_phone,
                  role_flags, created_at)
organizer_profiles (user_id PK/FK, stripe_account_id, stripe_identity_status,
                  credentials_text, verified_at, rating_avg, rating_count, status)
hikes            (id, organizer_id FK, title, description, status,
                  start_at, duration_min, difficulty, distance_km, elevation_gain_m,
                  meeting_point geography(Point), meeting_notes,
                  route geography(LineString), gpx_url, elevation_profile jsonb,
                  capacity_min, capacity_max, price_cents, currency,
                  cancellation_policy, guest_limit, requirements jsonb,
                  photos jsonb, created_at)
bookings         (id, hike_id FK, hiker_id FK, qty, status,
                  amount_cents, fee_cents, stripe_payment_intent_id,
                  waiver_id FK, checked_in_at, created_at)
waivers          (id, booking_id FK, template_version, signed_name,
                  signed_at, ip_hash, pdf_url)
waiver_templates (version PK, body_md, effective_from)
reviews          (id, booking_id FK UNIQUE, hike_id, organizer_id,
                  hike_rating, organizer_rating, body, photos jsonb,
                  organizer_response, status, created_at)
follows          (follower_id, followee_id, created_at)
chat_messages    (id, hike_id FK, sender_id FK, body, pinned, created_at)
reports          (id, reporter_id, target_type, target_id, reason, status, created_at)
payouts_ledger   (id, organizer_id, hike_id, gross_cents, commission_cents,
                  net_cents, stripe_transfer_id, released_at)
notifications    (id, user_id, type, payload jsonb, read_at, created_at)
```
Postgres extensions: **PostGIS** (geo queries: "hikes within X km"), pg_cron (auto-complete hikes, release payouts, review reminders).

---

## 7. API & Integration Design

- **Client → Supabase:** direct table reads/writes under RLS for profiles, listings (read), follows, chat, reviews.
- **Edge Functions (privileged writes):**
  - `create-listing-checkout` — creates PaymentIntent with `application_fee_amount` (commission) and `transfer_data.destination = organizer.stripe_account_id`.
  - `stripe-webhook` — handles `payment_intent.succeeded` (confirm booking), `charge.refunded`, `identity.verification_session.verified`, `account.updated`.
  - `cancel-booking` / `cancel-hike` — computes refund per policy, calls Stripe, updates states.
  - `release-payouts` (cron) — releases held transfers 24 h post-completion, writes `payouts_ledger`.
  - `sign-waiver` — validates template version, generates PDF, stores record.
- **Deep links:** `trailmate://hike/{id}` + universal links for share/invite.

---

## 8. Key Screens (v1)

Onboarding & auth → Home feed → Explore (map/list toggle + filters) → Hike detail → Checkout (spots → waiver → pay) → Booking confirmation → My Hikes (upcoming/past) → Hike group chat → Review flow → Profile (self/others) → Organizer dashboard (listings, roster, earnings) → Create listing wizard (5 steps) → Settings/notifications.

(A separate UX spec with wireframes is a natural next deliverable.)

---

## 9. Payments & Commercial Design

### 9.1 Money flow (destination charge model)
```
Hiker pays $50 ──► Stripe PaymentIntent
                   ├─ application_fee_amount: $6.50 (13%) ──► Platform
                   └─ transfer_data.destination ──► Organizer's Connect account
                                                    (payout released T+24h after hike)
```

### 9.2 Fee structure (recommended starting point — tune with data)
- Organizer commission: **13%** of booking value.
- Hiker service fee: **0% at launch** (remove friction; introduce 3–5% later if unit economics demand).
- Stripe costs (~2.9% + 30¢) absorbed by the platform out of commission.

### 9.3 Refund policy presets (organizer picks one per listing)
1. **Flexible** — full refund ≥ 24 h before start.
2. **Moderate** — full refund ≥ 72 h; 50% ≥ 24 h.
3. **Strict** — full refund ≥ 7 days; 50% ≥ 72 h.
Weather/organizer cancellations: always 100% refund, commission returned.

### 9.4 Tax & legal
- Stripe handles organizer KYC, 1099-K issuance (US assumption).
- Platform ToS positions organizers as independent providers; waiver runs between hiker ↔ organizer **and** hiker ↔ platform. **Have a lawyer review the waiver template and ToS before launch — this is the single most important legal spend.**

---

## 10. Delivery Plan

### Phase 0 — Foundations (Weeks 1–2)
Expo project + EAS pipeline, Supabase schema + RLS, auth, design system, Mapbox setup, Stripe test-mode Connect.

### Phase 1 — Marketplace core (Weeks 3–7)
Profiles, organizer verification + Connect onboarding, listing CRUD + GPX/route, explore map/list, hike detail, checkout + waiver + payment, booking states, webhooks, refunds, roster + check-in, notifications.
**Exit criteria:** end-to-end paid booking with waiver in TestFlight/Play internal.

### Phase 2 — Community & trust (Weeks 8–11)
Reviews (both flows), follows, activity feed, per-hike chat, report/block, admin console, review-prompt cron, payout release cron.

### Phase 3 — Hardening & launch (Weeks 12–14)
Offline caching, accessibility pass, load/security review, store assets, App Review prep (Apple will scrutinize: account deletion, Apple sign-in, UGC moderation, payments for *physical-world services* — real-world services are allowed outside IAP, which is why Stripe is fine here), closed beta with 3–5 real organizers, launch.

### Post-v1 backlog
Waitlists at scale, DMs, live tracking + offline maps, recurring-hike subscriptions, organizer analytics, multi-country payments, web listing pages for SEO (Astro — plays to your existing stack).

---

## 11. Team & Cost Envelope (research/testing phase)

- 1 full-stack RN/Supabase dev (or you + contractor) — Phases 0–2 are feasible with 1–2 devs given the managed stack.
- Monthly infra during testing: Supabase Pro $25, Mapbox free tier, Expo EAS ~$19, PostHog/Sentry free tiers, Stripe pay-per-use → **≈ $50–100/mo** until real volume.
- One-time: Apple Developer $99/yr, Play $25, legal review of waiver/ToS (budget $1.5–3k — do not skip).

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cold-start liquidity (no organizers → no hikers) | High | Launch city-by-city; hand-recruit 10–20 organizers pre-launch; platform-funded promos; free hikes allowed to seed activity |
| Injury/liability incident | High | 18+ only, ID-verified organizers, lawyer-reviewed waivers, insurance exploration (per-event coverage partners) before scaling |
| App Store rejection | Medium | Follow §10 Phase 3 checklist; UGC moderation + block/report are mandatory for approval |
| Organizer fraud (fake hikes) | Medium | Funds held until post-completion; ID verification; dispute window |
| Chat abuse | Medium | Chat scoped to paid attendees only; report/block; text screening |

---

## 13. Open Questions (need your input)

1. **Launch country/city** — confirms Stripe assumptions, currency, waiver jurisdiction. Which market first?
2. **Brand name** — "TrailMate" is a placeholder; name check needed (trademark + store availability).
3. **Commission rate** — is 13% the right opening position for your market?
4. **Guest bookings** — can one hiker pay for +N guests, and do guests each need accounts for waivers? (Recommended: yes, each attendee signs their own waiver via link.)
5. **Insurance** — do we require organizers to carry liability insurance in v1, or platform-arranged per-event coverage later?
