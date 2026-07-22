# Post-publish SOP (framework)

Run this the moment a post goes live. A post being "live" isn't the same as being
**found**. The order matters: conversion before SEO, discovery before tracking.
Tag each item **[Confirmed]** or **[Verify in source]**.

1. **Confirm it's live and correct — from View Source.** Title, single H1, meta
   description, all internal links resolve, images and alt text. **The Book a Call
   CTA has a real `href`** (not empty, not `#`) — conversion check first, SEO second.
2. **Wire it into the cluster.** Homepage/blog → new post; new post → Services +
   Book a Call; new post ↔ sibling posts, both directions. Push live.
3. **Add it to sitemap.xml** with `lastmod` = today; commit. URLs match the canonical.
4. **Request indexing in GSC** — URL Inspection → Request Indexing.
5. **Validate the schema** — validator.schema.org, 0 errors (skip if the post has no
   schema by design).
6. **Run the GEO checks** — robots.txt isn't blocking the path and AI crawlers are
   allowed; capture the AI-visibility baseline (ask ChatGPT, Claude, Perplexity,
   Gemini the post's core question; log the honest "before").
7. **Register the new post for tracking.** Add it to the live dashboard (pipeline +
   GSC tracking) and capture its AI-visibility baseline across the four engines.

**Done means:** the CTA works, the schema validates (or there's none by design), and
the post is registered in the dashboard with its AI baseline captured. The full
version lives in `post-publish-sop.pdf`; save each run as its own checklist file.
