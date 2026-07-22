# RTC Platform Architecture

One repository, **four independently deployed services**. This is a
serverless service-oriented architecture: each service is its own Vercel
project (own build, own deploy, own domain, own failure domain) that runs as
auto-scaling serverless functions. No service can take another down, and each
scales horizontally per request with zero capacity planning.

## Service map

| Service | Directory | Domain | Data store | Purpose |
|---|---|---|---|---|
| **Main site** | `/` (repo root) | roblestech.net | none (static + SSR) | Marketing site |
| **Client Portal** | `portal/` | portal.roblestech.net | Supabase A (shared) | Client SEO dashboards, GSC sync |
| **PPM** | `ppm/` | ppm.roblestech.net | Supabase A (shared) | Internal project management |
| **WanderWise** | `travel/` | wanderwise.roblestech.net | Supabase B (dedicated) | Travel companion app |

```
                    ┌─────────────────────────────────────────────┐
                    │                 Vercel Edge/CDN             │
                    └──────┬──────────┬──────────┬──────────┬─────┘
                           │          │          │          │
                      main site    portal       ppm     wanderwise
                      (functions) (functions) (functions) (functions)
                           │          │          │          │
                           │          └────┬─────┘          │
                           │               │                │
                        (none)        Supabase A       Supabase B
                                    (auth+RLS+SQL)   (auth+RLS+SQL)
                                          │
                                 Google Search Console
                                 (OAuth refresh-token)      Open-Meteo / OSM /
                                                            Wikipedia (keyless)
```

## Why this is the right "microservices" shape here

- **Independent deployability** — pushing a WanderWise change never rebuilds
  or risks the portal. Each Vercel project watches the same repo but builds
  only from its Root Directory.
- **Independent scaling** — Vercel serverless functions scale per-request,
  per-service. A traffic spike on the marketing site allocates zero extra
  resources to PPM.
- **Isolated data** — WanderWise has a dedicated Supabase project; a
  migration mistake there cannot touch client SEO data. Portal and PPM share
  a project but own disjoint tables, enforced by RLS.
- **No shared runtime state** — services communicate only through their own
  databases and public HTTP. There are no cross-service calls to fail.
- **Managed operational burden** — no clusters, queues, or service mesh to
  patch, monitor, and pay for. At current scale, container-based
  microservices would add cost and 24/7 ops work without adding capacity.

## Scaling levers (in order, as traffic grows)

1. **CDN caching on public reads** (implemented): anonymous Explore pages and
   proxy APIs send `s-maxage` + `stale-while-revalidate`, so repeat traffic
   is served by the CDN without invoking a function at all.
2. **Database indexes on hot paths** (implemented): every `trip_id`/status
   filter is index-backed; see `travel/supabase/perf-indexes.sql`.
3. **Read-side caching in the DB** (implemented): destination photos, month
   profiles, and GSC pulls are computed once and cached in tables, so
   third-party APIs are hit O(content) not O(traffic).
4. Supabase plan upgrade (connection pooling is already on via the pooler
   URL) → then read replicas if reads ever dominate.
5. Split the shared Supabase A into per-service projects if portal/PPM load
   ever interferes with each other.
6. Only past all of the above: extract a long-running worker (e.g. GSC sync)
   to a queue-based service. Do not start here.

## Cross-cutting rules

- Secrets live in per-project Vercel env vars — never in the repo, never in
  URLs. Cron endpoints authenticate with a Bearer token.
- Every service enforces auth in middleware and RLS at the database — the
  database is the security boundary, not the UI.
- Audit trails (`audit_logs`) capture state-changing actions (ISO/IEC 27001
  evidence).
- Third-party calls (Open-Meteo, Nominatim, Wikipedia, GSC) are proxied
  server-side and cached; browsers never call third parties directly except
  OSM map tiles.
