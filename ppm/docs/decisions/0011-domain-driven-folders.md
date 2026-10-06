# 0011. Domain-driven folders

- **Status:** decided; the refactor is still to do
- **When:** 2026-10-06
- **Who:** Kyan

## Context

The PPM's code is already grouped by business area in `src/domains/` (tasks, projects, people, calendar, handbook and the rest), but each area is laid out a little differently. Types and rules sit in `config.ts` in one domain, `types.ts` in another and `layout.ts` in a third, and nothing says where hooks and contexts go ([architecture.md](../guides/architecture.md#the-folders)). As the app grows, that drift makes things harder to find, and makes it easier to define the same rule twice.

## Decision

The folder structure is domain-driven design (DDD): code is grouped by business domain, and every domain has the same shape. In Kyan's words: "the folder structure, let's just use DDD."

```
src/domains/<domain>/
  types.ts       the domain's types, and small pure rules (like canComplete)
  constants.ts   labels, options and limits, when it has any
  data.ts        reading and changing data from the browser (TanStack Query hooks)
  actions.ts     server actions for privileged work; each checks the caller's role first
  server.ts      loaders that only run on the server
  hooks/         the domain's React hooks, one per file
  contexts/      the domain's React contexts, one per file
  components/    the domain's screens and pieces
```

Around the domains: `src/app/` holds thin routes that render a domain's screen, `src/components/ui/` the design system's building blocks, `src/components/app/` the app's frame, and `src/lib/` the shared plumbing (the Supabase clients, dates, email, settings). One global stylesheet, `src/app/globals.css`, holds every token.

- **One source of truth.** Every type, label, rule and number is defined once, in the domain that owns it, and imported from there.
- **No barrel files** (index files that only re-export a folder). Import from the file itself: barrels slow builds and hide where things come from.
- **Names in the team's words.** Domains, types and functions are named the way the team talks: tasks, projects, sign-off, the handbook. DDD calls this the shared ("ubiquitous") language.

## What we take from DDD, and what we don't

DDD is a large method. We take its organising idea, code grouped by business domain and named in the team's own words, because that's what keeps a growing app easy to find your way around. We don't take its heavier patterns, like aggregates and repositories as classes. In this app the database already enforces the rules ([0002](0002-rules-live-in-the-database.md)), so those layers would add code without adding safety.

## Scope

The PPM, now: new code follows this shape, and the existing domains move to it in one refactor ([backlog](../backlog.md), goal 7). The portal follows when it's next reworked. The public site is a content site, so it keeps Astro's standard layout.

## Why

Anyone, a new teammate or a session starting cold, can find anything by asking "which part of the business is this?" and then knows exactly where in that folder to look. And at ten times the size, each domain stays as easy to read as it is today.
