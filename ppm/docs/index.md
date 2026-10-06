# Index: the PPM's knowledge base

Every page in `ppm/docs/`, what it's for, and who wrote it. Read this first, then the pages your task needs. When a page is added, moved or removed, update this list in the same commit. How docs folders work in this repository: [`docs/README.md`](../../docs/README.md).

**Who wrote what:** "Kyan's Claude" is Kyan's local Claude Code session, which planned and built the PPM with him and has his full context; "Kenneth's Claude" ran the deployment; "a cloud session" worked from a brief without the private context.

## Start here

| Page | What it's for | By, when |
|---|---|---|
| [README.md](README.md) | The front page: what this is and how to read it | Kyan's Claude, 2026-10-06 |
| [index.md](index.md) | This catalog | Kyan's Claude, 2026-10-06 |
| [log.md](log.md) | The history of substantial changes and decisions | Kyan's Claude, 2026-10-06 |
| [backlog.md](backlog.md) | What's left to do: the one list | Started 2026-10-03; kept by every session |
| The repository's [`docs/how-we-work.md`](../../docs/how-we-work.md) | The mindset behind all of it | Kyan's Claude, 2026-10-06 |

## Guides: how things are done

| Page | What it's for | By, when |
|---|---|---|
| [guides/design-system.md](guides/design-system.md) | Tokens and what each colour means, type, density, motion, which component for what, states, forms, copy, accessibility | Kyan's Claude, 2026-10-06 |
| [guides/ux-principles.md](guides/ux-principles.md) | How the PPM should feel to use, how to design a feature, and scale | Kyan's Claude, 2026-10-06 |
| [guides/architecture.md](guides/architecture.md) | The stack, the folders, how data moves, where the rules live, settings | Kyan's Claude, 2026-10-06 |
| [guides/database.md](guides/database.md) | Changing the database, who may do what (the permissions table), how the rules work | Kyan's Claude, 2026-10-06 |
| [guides/testing.md](guides/testing.md) | What to run and when, writing a smoke check, lessons the tests taught | Kyan's Claude, 2026-10-06 |
| [guides/workflow.md](guides/workflow.md) | A piece of work from brief to merge, and which docs to update | Kyan's Claude, 2026-10-06 |
| [guides/limitations.md](guides/limitations.md) | What the PPM doesn't do yet, and why | Kyan's Claude, 2026-10-06 |
| [DEPLOY.md](DEPLOY.md) | How the PPM replaced the Astro PPM on 2026-10-03, and how database updates reach the live database now | Kyan's Claude, 2026-10-03; updated by Kenneth's Claude (2026-10-03) and a cloud session (2026-10-04) |

## Decisions: what was decided, and why

| Page | Decision |
|---|---|
| [decisions/0001-nextjs-for-the-ppm.md](decisions/0001-nextjs-for-the-ppm.md) | Rebuild the PPM in Next.js (2026-10-02) |
| [decisions/0002-rules-live-in-the-database.md](decisions/0002-rules-live-in-the-database.md) | Row-level security and triggers decide who may do what (2026-10-02) |
| [decisions/0003-the-design-direction.md](decisions/0003-the-design-direction.md) | The look and feel, and what we never do (2026-10-02) |
| [decisions/0004-sign-off-rules.md](decisions/0004-sign-off-rules.md) | Who marks a task done, admins signing off in someone's place, who is asked (2026-10-02 and 03) |
| [decisions/0005-repeating-tasks.md](decisions/0005-repeating-tasks.md) | Repeating tasks keep their creator and assigner (2026-10-02) |
| [decisions/0006-the-app-sends-its-own-sign-in-emails.md](decisions/0006-the-app-sends-its-own-sign-in-emails.md) | Invitations and resets, with a database shared with the portal (2026-10-03) |
| [decisions/0007-templates-for-routine-work.md](decisions/0007-templates-for-routine-work.md) | Templates for routine work without a fixed rhythm (2026-10-04) |
| [decisions/0008-archive-closed-and-delete.md](decisions/0008-archive-closed-and-delete.md) | Three ways a project ends (2026-10-04) |
| [decisions/0009-one-copy-of-the-code.md](decisions/0009-one-copy-of-the-code.md) | All work happens in this repository (2026-10-06) |
| [decisions/0010-the-knowledge-base.md](decisions/0010-the-knowledge-base.md) | These docs, and their shape (2026-10-06) |
| [decisions/0011-domain-driven-folders.md](decisions/0011-domain-driven-folders.md) | The folders follow domain-driven design, one shape for every domain (2026-10-06) |
| [decisions/0012-templates-are-made-where-work-is-made.md](decisions/0012-templates-are-made-where-work-is-made.md) | Templates are made in the new-task dialog and Plan time, and changed there (2026-10-07) |
| [decisions/0013-owners-delete-empty-projects.md](decisions/0013-owners-delete-empty-projects.md) | A project's owner may delete it while it has no tasks (2026-10-07) |
| [decisions/0014-a-way-back-when-nobody-is-a-super-admin.md](decisions/0014-a-way-back-when-nobody-is-a-super-admin.md) | A one-time setup link, only while there's no super admin (2026-10-07) |

0001 to 0012 written by Kyan's Claude: 0001 to 0011 on 2026-10-06, from the history and the people who decided; 0012 on 2026-10-07. 0013 and 0014 by Kenneth's Claude on 2026-10-07, from Kenneth's answers.

## People and their tasks

| Page | What it's for | By, when |
|---|---|---|
| [people/](people/README.md) | Kenneth, Christian and Kyan: their part, and what helps them | Kyan's Claude, 2026-10-06 |
| [Kenneth's open items](../../docs/for-humans/kenneth.md) | His open items, in order, for every app (in the repository's `docs/for-humans/`) | Kyan's Claude, 2026-10-06 |
| [for-humans/giving-the-team-accounts.md](for-humans/giving-the-team-accounts.md) | Accounts: roles, inviting, resets, someone leaving | Kenneth's Claude, 2026-10-03 |

## Sources and records

| Page | What it's for | By, when |
|---|---|---|
| [references/README.md](references/README.md) | Design and engineering references, and what to take from each | Kyan's Claude, 2026-10-06 |
| [raw/2026-10-04-kyan-voice-brief.md](raw/2026-10-04-kyan-voice-brief.md) | Kyan's brief to a cloud session, word for word (raw: never edited) | A cloud session, 2026-10-04 |
| [reports/2026-10-04-session-report.md](reports/2026-10-04-session-report.md) | What that session built (templates, archive and delete, the password eye, role messages) and why, and what it lacked | A cloud session, 2026-10-04 |
| [reports/2026-10-07-session-report.md](reports/2026-10-07-session-report.md) | What this round built (templates in the dialogs, the all-day calendar, colours, the people picker, Copy my plan your way, shared components, full sample data) and why, and what Kenneth applies first | Kyan's Claude, 2026-10-07 |
| [private/README.md](private/README.md) | Your own notes, on your computer only: git ignores everything here except this README | Kyan's Claude, 2026-10-06 |
| [handbook-drafts/](handbook-drafts/) | The source of the Handbook's "Using the PPM" shelf. Superseded: the published articles (migration `20261003000100`) are the current version, edited in the app | Kyan's Claude, 2026-10-03 |

## Outside this folder

- [`../README.md`](../README.md): what the PPM does, how to run it locally, a ten-minute demo.
- [`../CLAUDE.md`](../CLAUDE.md) and [`../AGENTS.md`](../AGENTS.md): instructions every Claude session reads in `ppm/`.
- The repository's [`CLAUDE.md`](../../CLAUDE.md): the rules for every app.
