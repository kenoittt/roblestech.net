# 0001. Next.js for the PPM

- **Status:** decided and built; live since 2026-10-03
- **When:** proposed 2026-10-01, agreed 2026-10-02
- **Who:** Kyan, with Kenneth's go-ahead to deploy

## Context

The first PPM was an Astro app: pages rendered on the server, writes made with the service role key (which skips the database's rules), and a website-style menu. It worked, but it felt like a website, and the team needed a tool they could work in all day.

## Decision

Rebuild the PPM as a Next.js app (App Router, React), in the same `ppm/` folder, on the same Supabase project. The public site, the portal and WanderWise stay on Astro.

## Why

The PPM is an application, not a content site: a panel that opens beside a list, drag and drop, a command menu, live updates, changes that show before the server answers. React and Next.js are built for that; Astro is built for content. Next.js also renders the first page on the server, so it still loads fast, and it's native to Vercel, where the PPM already runs.

## What it means for you

`ppm/` is a Next.js 16 app with breaking changes from older versions: read `node_modules/next/dist/docs/` before using a Next.js API ([architecture.md](../guides/architecture.md)).
