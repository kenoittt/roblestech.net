# 0003. The design direction

- **Status:** decided; the whole app follows it
- **When:** 2026-10-02
- **Who:** Kyan

## Context

The old PPM looked like a website. The revamp needed a look and feel of its own, and a design system to keep it consistent.

## Decision

- **References:** Linear's app, and dashboard designs in the same spirit ([references](../references/README.md)). Modern, sleek, calm and collected.
- **Theme:** follows the system; dark first; light built to match.
- **Brand:** RTC's colours, with more blue and less green. Green means "done", nothing else.
- **Never:** gradients, emojis, cards inside cards, pill badges or pulsing effects, illustrations.
- **Density:** in between: not a spreadsheet, not roomy. Short text, easy to read.
- **Building blocks:** Tailwind CSS, and shadcn on Base UI, restyled so it doesn't look like shadcn. Design tokens in one stylesheet. Motion after Emil Kowalski.
- **How it works:** one page that never reloads, with a detail panel; list, board and calendar views, chosen per person; Home personal first, the team second.

## Why

A tool people use all day should be calm, fast and consistent, and look like it was made on purpose. Default component-library looks read as generic; our own tokens, type and motion make it ours.

## What it means for you

Everything in [design-system.md](../guides/design-system.md) and [ux-principles.md](../guides/ux-principles.md) follows from this. Changing any part of it is a new decision, recorded here.
