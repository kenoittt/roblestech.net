# Log: the repository

Substantial changes that affect more than one app, newest last. Each app keeps its own log for its own changes (the PPM's: [`ppm/docs/log.md`](../ppm/docs/log.md)). What belongs here: [README.md](README.md#what-belongs-in-a-log).

## [2026-10-01] process | One set of rules for every Claude session
The shared `CLAUDE.md` (pull request #2): branches and pull requests, Kenneth merges, the lessons the history taught.

## [2026-10-01] architecture | The apps' code runs in Singapore
The PPM's and the portal's functions moved to Singapore, next to the database (pull request #12).

## [2026-10-03] architecture | The PPM is a Next.js app
The Astro PPM was replaced by the revamped Next.js PPM in `ppm/` (pull request #15). The other apps stay on Astro.

## [2026-10-04] process | Conventional commits
Commits follow the conventional form, scoped by app ([git-conventions.md](git-conventions.md)).

## [2026-10-06] docs | A knowledge base for the repository
`docs/` gets its shape (an index, this log, how we work, commit style, references) and the PPM gets the first full app knowledge base. Commits become short and warm; logs keep only what's substantial; reports only for large work.
