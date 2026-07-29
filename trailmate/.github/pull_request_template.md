## What changed

<!-- One or two sentences. What does this do that the codebase could not do before? -->

## Requirement

<!-- The SDS requirement this serves, e.g. FR-5.2, NFR-3, or "none — refactor". -->

## How it was verified

<!-- What you actually ran. "Booked a hike end to end against local Stripe test mode and
     confirmed the payouts_ledger row" beats "tested locally". -->

- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] `supabase db reset` applies cleanly from scratch
- [ ] Edge Function changes type-check (`npm run functions:check`)

## Security checklist

Delete any line that does not apply, but do not delete the whole section.

- [ ] New tables have RLS enabled and at least one policy (or are intentionally
      service-role-only, and say so in a comment)
- [ ] No secret key, service-role key or webhook secret is reachable from `apps/mobile`
- [ ] Any new money-state change is driven by a Stripe webhook, not a client call
- [ ] New `security definer` functions pin `search_path`
