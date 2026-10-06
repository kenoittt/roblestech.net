# References

Outside material the PPM learned from, and what to take from each. Collected 2026-10-06; the links weren't re-opened then, so tell us if one has moved.

## Design

| Reference | What to take from it |
|---|---|
| [Linear](https://linear.app) | The model for the PPM's feel: calm dark interface, density that stays readable, keyboard first, a command menu, an issue panel beside the list |
| Dashboard designs by Amir Baghian | Kyan's visual reference for layered surfaces, soft contrast and dense, readable dashboards (screenshots kept privately) |
| aceframe.pro | Listed by Kyan as a reference for the revamp (not described further) |
| [Emil Kowalski](https://emilkowal.ski) and [animations.dev](https://animations.dev) | The motion rules: animate with a purpose; never for keyboard actions or things used a hundred times a day; strong ease-out curves; short durations; popovers that grow from their trigger; a small press response on buttons; transitions that can be interrupted |
| [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) | The building blocks. Base UI's docs are the reference for menus, dialogs and popovers (for example: a menu's label must sit inside its group) |
| [Hugeicons](https://hugeicons.com) | The icon set |
| [Tailwind CSS](https://tailwindcss.com/docs) | Version 4: tokens through `@theme`, utilities through `@utility` |
| Form design: the [GOV.UK Design System](https://design-system.service.gov.uk), [Nielsen Norman Group](https://www.nngroup.com), Adam Silver's *Form Design Patterns* | When and where to show errors: at the field, once someone tries to submit, not while they're still choosing |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Contrast (AA: 4.5 to 1 for text) and keyboard access |

## Engineering

| Reference | What to take from it |
|---|---|
| Next.js 16's own docs, in `node_modules/next/dist/docs/` | The version in use, which differs from older Next.js. Read before using a Next.js API |
| [Supabase docs](https://supabase.com/docs) | Row-level security, Auth (`generateLink`), Storage, Realtime, and the CLI (`db push`, `migration repair`, backup and restore) |
| [TanStack Query](https://tanstack.com/query) | Caching and optimistic updates |
| Conventional commits | The repository's [`docs/git-conventions.md`](../../../docs/git-conventions.md), and the cheat sheet it links |
| Andrej Karpathy's LLM wiki | The pattern these docs follow: the repository's [`docs/references/llm-wiki.md`](../../../docs/references/llm-wiki.md) |
