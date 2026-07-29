# Schema tests

```bash
bash supabase/tests/run.sh            # resets the local DB, then asserts
SKIP_RESET=1 bash supabase/tests/run.sh   # assert against the current state
```

`schema_checks.sql` covers the invariants that protect money and privacy — the ones where a
regression is expensive and silent:

| Area | What is asserted |
|---|---|
| Discovery (FR-4.1/4.2) | `hikes_nearby` honours radius, difficulty and price filters, and returns a real distance |
| Publish gate (FR-2.1/2.2, FR-10.4) | Unverified organizer, missing first-aid attestation, stale weather check and a past start time each block publishing |
| Oversell guard (FR-5.1) | Third booking on a two-spot hike is rejected; `full` and `published` flip correctly; cancelling frees the spot |
| Waiver (FR-5.2) | A booking cannot reach `confirmed` without a signed waiver |
| Refunds (§9.3) | Every policy boundary — flexible/moderate/strict, at each threshold |
| Commission (§9.2) | 13% with half-up rounding, including the free-hike case |
| Reviews (FR-6.2/6.3/6.4) | Review before completion is refused; hike and organizer aggregates update |
| RLS — emergency contacts (FR-1.5) | Owner and the organizer of a booked hike can read; an unrelated hiker cannot |
| RLS — escalation | A user cannot grant themselves `admin` or inflate their own hike stats |
| RLS — money columns | No client booking INSERT; an organizer can check in but cannot rewrite an amount |
| RLS — visibility | Another organizer's draft is invisible; a non-participant sees no chat; `stripe_webhook_events` is unreadable |
| Cron | Every job function runs, and a finished hike auto-completes |
| Coverage | Every table in `public` has RLS enabled; every `security definer` function pins `search_path` |

## Adding a check

Two helpers are defined at the top of the file:

```sql
select assert(<boolean>, 'what should be true');
select assert_raises($$<sql that must fail>$$, 'what should be blocked');
```

Prefer `assert_raises` for anything security-relevant. An assertion that a policy *allows*
something is much weaker than one proving it *denies* something.

## Not pgTAP

These are plain plpgsql assertions rather than pgTAP, so they run with nothing but `psql` —
no extension to install and no test schema to keep in sync. If the suite grows past a few
hundred checks, `supabase test db` with pgTAP is the natural next step.
