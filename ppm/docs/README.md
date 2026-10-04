# The PPM's knowledge base

How this app was made, and how to keep working on it at the same quality, whoever does the work: a teammate, or a Claude session starting cold. Read this folder before changing anything sizeable.

## What's here

| File | What it is |
|---|---|
| [DEPLOY.md](DEPLOY.md) | How the new PPM replaces the Astro PPM at ppm.roblestech.net, same day: where things stand, the remaining fixes, the switch, accounts, the handbook, rollback, and rules for Claude |
| [backlog.md](backlog.md) | What's left: fixes before going live, tasks after it, and the goals (including filling this knowledge base) |
| [guide-for-kenneth.md](guide-for-kenneth.md) | One page for Kenneth on accounts: who has one, the roles, inviting, password resets, someone leaving |
| [handbook-drafts/](handbook-drafts/) | Six how-to articles written during the build. Published 2026-10-03, checked against the app, as the Handbook's "Using the PPM" shelf (migration `20261003000100`); edit them in the app from now on |
| [git-conventions.md](git-conventions.md) | How commits are written (the conventional commits cheat sheet, linked, and what this repository adds to it) and a proposal for branch names |
| [briefs/](briefs/) | Briefs as they were given, word for word, for reference. [2026-10-04](briefs/2026-10-04-kyan-voice-brief.md): Kyan's brief on role changes, templates, password fields, projects and these docs |
| [reports/](reports/) | What a session did with a brief, what it considered and why. [2026-10-04](reports/2026-10-04-session-report.md): the session that answered Kyan's brief of that day, including why the "Chosen people" chip is orange |

The rest of the knowledge base (decisions, design, architecture, limitations, lessons, references) is a goal: see [backlog.md](backlog.md), item 6.

## Rules for this folder

- **It's public.** This repository is public, so no keys, passwords, database dumps or personal data, and nothing copied from private notes without the owner's OK.
- **Plain and kind.** Write like a teammate showing someone something new: short sentences, plain words, a term explained the first time it appears. Dates as 2026-10-03.
- **Keep it true.** When the code changes, change the page that describes it in the same commit. Date anything you verify.
