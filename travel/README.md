# WanderWise — travel companion & trip planner

Built to SRS v1.2 (`Travel_App_Software_Specification.docx`). Dedicated stack:
its own Vercel project and its own Supabase project, fully isolated from the
company's other systems (SRS §5.1, §6.2).

## Status
- **Phase 1 (this code):** auth (public signup), trip projects CRUD
  (destinations/legs, lodging, dates, pax), budget engine with bidirectional
  group ↔ per-person pax math (entry-mode per row, per-row pax override,
  planned vs actual, per-currency totals, category subtotals), mobile-first UI,
  RLS on every table, audit logging.
- **Phase 2 (next):** destination search + Monthly Destination Explorer,
  Claude API synthesis + caching (`destination_month_profiles` table is ready).
- **Phase 3:** Leaflet/OSM trip map, places auto-imagery (Google Places),
  Today view, PWA/offline, realtime collaboration.
- **Phase 4:** hardening — audit evidence, backup/restore test, pen test, exports.

## One-time setup
1. **Supabase** (new project): SQL Editor → run all of `supabase/schema.sql`.
   - Authentication → URL Configuration: set Site URL to the deployed URL.
   - Email confirmations: leave on (signup shows "check your inbox") or turn
     off under Authentication → Providers → Email for friction-free testing.
2. **Vercel** (new project): import repo, **Root Directory = `travel`**, add
   env vars from `.env.example` (all three Supabase values), deploy.
3. **GoDaddy**: CNAME `wanderwise` → target Vercel shows under Settings →
   Domains after adding `wanderwise.roblestech.net`.

## Notes
- All user CRUD runs under the session (anon key + RLS) — least privilege;
  the service-role key is used only for `audit_logs`.
- The budget sheet computes pax math client-side for instant UX (NFR-01) and
  the server independently recomputes it on save, so the DB can't drift.
- Schema already contains Phase 2/3 tables (destinations, month profiles,
  itinerary, places, images, wishlists) per FR-DEX-01 (no schema changes to
  expand coverage).
