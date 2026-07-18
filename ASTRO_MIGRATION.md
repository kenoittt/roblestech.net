# Astro migration — proof of concept

This branch introduces [Astro](https://astro.build) as the framework for the
site, **without changing how anything looks or how it's hosted**. It's a
component-based static-site generator: we write pages once, share the header /
footer / `<head>` / scripts as components, and it builds the same flat HTML you
serve today — with **zero JavaScript framework** shipped to visitors, so the
GEO/SEO story is fully preserved.

## Why Astro (short version)

- **Ships static HTML, no framework runtime** → fast, fully crawlable by Google
  and AI engines. Critical since GEO is your product.
- **Components + layouts** → the nav, footer, `<head>`, JSON-LD schema, and the
  interactivity script now live in **one place each** instead of being
  copy-pasted across 12 files. Change the nav once, every page updates.
- **Same hosting** → builds to flat files (`index.html`, `contact.html`, …) and
  deploys to GitHub Pages with the existing `CNAME`.
- **"A little bit dynamic"** → all interactivity (mobile menu, dropdowns,
  FAQ accordion, scroll animations) is bundled by Astro from
  `src/scripts/site.js`. The contact form is the existing HubSpot embed,
  preserved as-is.

## What's in this PoC

Two pages fully migrated as proof the pattern holds end-to-end:

| Page | Demonstrates |
|------|--------------|
| `src/pages/index.astro`   | Full homepage + per-page JSON-LD schema, shared layout/nav/footer |
| `src/pages/contact.astro` | Working HubSpot contact form + page-specific `<head>` styles |

Shared building blocks:

```
src/
  layouts/BaseLayout.astro   # <head>, fonts, Calendly, global CSS, nav, footer, script
  components/Nav.astro       # nav + mobile menu (active-link + inner-page variants)
  components/Footer.astro    # footer
  scripts/site.js            # ALL interactivity, guarded so each block no-ops when unused
  pages/                     # one file per page
public/                      # styles.css, images, CNAME, robots.txt, sitemap.xml (served at root)
```

## Run it locally

```bash
npm install
npm run dev      # local dev server at http://localhost:4321
npm run build    # outputs static site to dist/
npm run preview  # preview the built site
```

## Deploying (when you're ready to switch)

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on
every push to `main`. It only takes effect once you set
**Settings → Pages → Build and deployment → Source → GitHub Actions**. Until
then your current site is untouched, so this branch is safe to review and merge
incrementally.

## Remaining work (not in this PoC)

The other 10 pages follow the identical pattern — move each `<body>` into a
`src/pages/*.astro` file wrapped in `BaseLayout`, lift any page-specific
`<head>` bits into the `head` slot, and delete the old root `.html` file:

`about`, `team`, `philosophy`, `services`, `faqs`, `blogs`, and the four
blog/case-study posts. The FAQ accordion + scroll-spy logic is already in
`site.js`, so `faqs.astro` will work the moment its markup is ported.
