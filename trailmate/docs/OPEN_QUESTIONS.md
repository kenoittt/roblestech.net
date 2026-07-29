# Open questions

SDS §13, with what the code currently assumes and what changes when you decide. Each one has a
default in place so nothing is blocked — but the defaults are guesses, and three of them touch
schema or legal text.

---

## Q1 — Launch country / city

**Assumed:** US, USD, `America/Los_Angeles` default timezone, Bay Area seed data.

**Where it is baked in:** `platform_config` currency defaults to `usd`; `hikes.timezone`
defaults to `America/Los_Angeles`; `stripe-connect-onboarding` defaults `country: "US"`;
`waiver_templates.jurisdiction = 'US'`; `eas.json` submit config expects App Store Connect US.

**What changes if it is not the US:** Stripe Connect Express availability and the KYC fields
differ by country; 1099-K issuance is US-only; the waiver's governing-law clause and
enforceability change materially. Multi-currency is explicitly out of scope for v1, so this is
a single choice, not a list.

**Recommendation:** confirm before the legal spend, since the waiver is drafted per
jurisdiction.

---

## Q2 — Brand name

**Assumed:** "TrailMate" throughout — deep link scheme `trailmate://`, bundle IDs
`net.roblestech.trailmate`, Expo slug `trailmate`, associated domain `trailmate.app`.

**What changes:** renaming after the stores have the bundle ID is painful (a new app record,
not a rename). Trademark and store-name availability both need checking first. Everything else
is a find-and-replace across `app.config.ts`, `eas.json`, `supabase/config.toml` and the
Connect return URLs.

**Recommendation:** clear the name before the first TestFlight build, not after.

---

## Q3 — Commission rate

**Assumed:** 13% organizer commission, 0% hiker service fee.

**Where it is baked in:** nowhere hard — `platform_config.take_rate_bps` and
`hiker_fee_bps`. Changing them is one `UPDATE`; no deploy, no migration. Existing bookings
keep the fee they were charged, because each captures `platform_fee_cents` at checkout.

**What to watch:** 13% is inside the marketplace norm (Airbnb Experiences takes 20%,
GetYourGuide 20–30%), so there is headroom, but organizer supply is the binding constraint at
launch — a lower rate is a recruiting tool. The hiker fee is the lever to pull if unit
economics need help; it does not reduce organizer take.

**Recommendation:** hold at 13% through the closed beta, then revisit with real fill-rate data.

---

## Q4 — Guest bookings and per-guest waivers ⚠️ affects schema

**Assumed:** one hiker pays for `qty` spots, and **one waiver is signed per booking** by the
person paying. `hikes.guest_limit` caps the extras.

**The SDS recommends otherwise** — each attendee signs their own waiver via a link, which is
almost certainly the right answer legally: a waiver signed on someone else's behalf is weak,
and unenforceable for an adult who never saw it.

**What changes:** a `booking_attendees` table (`booking_id`, `full_name`, `email`,
`waiver_id`), `waivers` gains an `attendee_id` and drops the implicit one-per-booking
relationship, `bookings.waiver_id` goes away, and the roster shows per-attendee waiver status
instead of per-booking. The `sign-waiver` function is already written to be callable
standalone, which is the hook for the emailed signing link.

**Recommendation:** decide before building the roster screen (FR-5.7) — it is the screen that
displays whichever shape you pick. If per-guest waivers are the answer, an alternative is
requiring every attendee to have an account, which is simpler to build and reduces the
marketplace's reach; the emailed-link version is more work and better product.

---

## Q5 — Organizer insurance

**Assumed:** not required in v1. Nothing in the schema records a policy.

**What changes if required:** `organizer_profiles` gains insurance fields (carrier, policy
number, expiry, certificate URL), `app.can_publish()` gains an expiry check, and the cron
needs a job to un-publish listings whose coverage lapsed. Platform-arranged per-event coverage
instead would mean a per-booking premium line item in the price breakdown, which touches the
fee split in `PAYMENTS.md`.

**Recommendation:** this is a risk-appetite question for legal counsel, not an engineering
one. SDS §12 rates injury/liability as the highest-impact risk, and the current mitigation
stack is 18+ only, ID-verified organizers, and waivers. Requiring insurance is the next lever
and it will thin organizer supply — worth deciding deliberately rather than by default.

---

## Not in §13, but needs an answer

**Waiver legal review.** SDS §9.4 is unambiguous: a lawyer must review the waiver and ToS
before launch, budget $1.5–3k. Template v1 in the migrations is a **placeholder** and is
labelled as such in the file. Ship it and the trust-and-safety posture is theatre.

**Minor policy.** NFR-4 sets 18+ for v1 and the schema enforces it via
`users.adult_confirmed_at`. Several listings in the seed data allow kids
(`kids_allowed = true`), which is about who may accompany an adult, not who may hold an
account. If under-18 participants are ever allowed, guardian consent becomes a separate waiver
flow — a larger change than it first appears.

**Photo moderation vendor.** FR-10.3 requires screening at upload. Not yet chosen, and it
gates App Review on UGC.
