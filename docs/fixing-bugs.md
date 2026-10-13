# Fixing a bug

What to do when something's broken, in any app: where the report and its screenshots go, which branch to work on, and how to know it's fixed. The repository's `CLAUDE.md` has the rules every change follows; this page adds what a bug needs. Started 2026-10-13, when a round of PPM fixes showed that nothing said where a bug's screenshot belongs.

## 1. Say what's wrong, and what fixed looks like

A bug report is three sentences: what you did, what happened, and what should have happened. Add the fourth that lets anyone check the fix: "It's fixed when a 15-minute block shows without sitting under the next one."

- **Fixing it now?** Tell your Claude session, or the person who'll fix it.
- **For later?** Add it to the app's backlog (the PPM's: [`ppm/docs/backlog.md`](../ppm/docs/backlog.md)), so it's on the one list.
- **The live app is down, or losing data?** Tell Kenneth first. He merges, and holds the accounts.

## 2. Screenshots go in `private/bugs/`

| The bug is in | Its screenshots go in |
|---|---|
| The PPM | `ppm/docs/private/bugs/` |
| Anything else: the public site, the portal, WanderWise, or several apps | `docs/private/bugs/` |

- **Why private:** a screenshot of a live app shows real task titles, names and email addresses, and this repository is public. Git ignores these two `private/` folders, so a screenshot there can't be committed by accident. One in `raw/` or `references/` can: that nearly happened on 2026-10-07. An app that gets its own docs folder later needs its `private/` ignored before anything goes in it.
- **Name it for what's wrong,** with the date in front so they stay in order: `2026-10-13-15-minute-blocks-overlap.png`.
- **Not `raw/`,** which holds what someone asked to keep in the repository, word for word. **Not `references/`,** which holds outside material we learn from.
- **They live on your computer only.** Keep one for as long as it's useful, and delete it when you like. Nothing else depends on it: the fix is described in words, in the pull request.
- **Someone else needs to see it?** Take it again on the local sample data, and put that in the pull request. Never attach a screenshot of live data to a pull request or an issue: on a public repository those are public too.

## 3. Branch

Start from a fresh `origin/main` (`git fetch --all --prune` first): the branch you were last on may have been merged days ago.

```
<owner>/fix/<app>-<what's broken>
```

For example `kyan/fix/ppm-calendar-short-blocks` or `claude/fix/portal-sign-in-refresh`. The pattern is the one every branch follows ([git-conventions.md](git-conventions.md#branches)).

| The situation | The branch |
|---|---|
| One bug | Its own branch and pull request, so it can merge without waiting for anything else |
| Several small fixes in one app, asked for together | One branch and one pull request, with **one commit for each fix**, so any of them can be undone alone |
| Fixes and a small feature asked for together | One branch, named for what most of it is |
| A bug you find while building something else | Fix it on that branch, in its own `fix` commit. If it isn't in your way, add it to the backlog instead |
| The live app is broken | Its own branch from `origin/main`, the smallest change that fixes it, and Kenneth told at once. Tidying up comes later, in another pull request |

## 4. See it broken first

- **Make it happen on your own computer,** with the sample data, before changing anything. A fix for a bug you haven't seen is a guess.
- **If the sample data can't show it, add data that can** (the PPM's: `ppm/supabase/seed.sql`). It stays afterwards, so the next person sees the case too (`CLAUDE.md`, rule 7).
- **Keep the proof:** a measurement, or a screenshot of the sample data. It's the "before" in the pull request.
- **Can't make it happen?** Say so, with what you tried. Don't change code in the hope it helps.

## 5. Fix the cause

- **Find why, not only where.** The overlapping 15-minute blocks weren't a spacing problem: a block was drawn 20 px tall in a 14 px space. The fix was to draw it in the space it has, not to push its neighbour down.
- **Look for the same mistake nearby.** The "+3" marker beside those blocks had the same minimum height, and would have overlapped the same way.
- **Change as little as it takes.** A refactor you'd like to do goes in the backlog, or its own pull request.

## 6. Prove it

- **A check that fails before the fix and passes after it.** For the PPM that's a smoke check ([`ppm/docs/guides/testing.md`](../ppm/docs/guides/testing.md#writing-a-smoke-check)). Without one, the bug comes back the next time someone tidies that code.
- **Look at it yourself:** in dark and light where the app has both, at laptop and phone width, and as each role it touches.
- **Run the app's usual checks,** as for any change.

## 7. Write it up

- **The commit:** `fix(<app>): ` and what's right now, for the person using it. "fix(ppm): keep a 15-minute block from sitting under the next one", not "fix height calculation".
- **The backlog:** tick the item, with the date.
- **The log:** only if the fix taught something others should know ([what belongs in a log](README.md#what-belongs-in-a-log)).
- **The pull request:** what was wrong, why it happened, what changed, how you checked it (before and after), and what you couldn't check.
