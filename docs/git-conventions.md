# Commits, pull requests and branches

How commits, pull requests and branches are written in this repository. Started 2026-10-04 by a cloud session at Kyan's request; moved here from `ppm/docs/` and updated 2026-10-06, because it applies to every app.

**The reference:** [Conventional Commit Messages, by qoomon](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13#conventional-commit-messages-), which follows the [Conventional Commits specification](https://www.conventionalcommits.org/). Read it once; it's short.

## Commits: short and warm

A commit message tells a teammate, in one line, what changed. It reads like you're walking them through it, not like a changelog entry. The details someone needs later belong in the docs (a guide, a decision, a report) or in the pull request, not in the commit.

The shape, from the cheat sheet:

```
<type>(<scope>): <description>
```

- **Type:** `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ops`, `chore`. The cheat sheet says what each covers.
- **Scope = the app:** `ppm`, `portal`, `site` (the public site at the root) or `travel` (WanderWise). Leave it out for something that spans the repository, like `CLAUDE.md` or the checks in `.github/`.
- **Description:** plain, friendly words, in the imperative ("add", not "added"), lowercase at the start, no full stop. Say what changed for the person using it, when that's clearer than what changed in the code. Aim for under about 70 characters.
- **Body:** usually none. When the reason isn't obvious, one or two short sentences. Never a list of files.
- **Database changes say so** in the body: name the migration, and say it must be applied to the live database before the merge.
- **One change per commit.** A fix found while building a feature gets its own commit.
- **Claude sessions add their attribution line** at the end, as their instructions say.

Good:

```
feat(ppm): save a task as a template, so the next one is two clicks away
fix(ppm): make the buttons in a calendar entry's details work again
docs(ppm): add the knowledge base, so any session can pick up the work
fix(ppm): tell people which role they have when a change is refused
```

Too much for a commit (it belongs in the pull request or the docs):

```
fix(ppm): name the caller's role when a people change is refused

changeRole refused when mayManage returned false; the message hid that the
database had the caller as an admin. Every refusal in people/actions.ts now
...
```

## Pull requests: a short walkthrough

A pull request gathers several commits, so its description is longer, in the same warm voice:

1. **What it does,** in two or three sentences, as you'd explain it to a teammate.
2. **What changed,** as a short list, from the reviewer's point of view.
3. **What someone has to do:** database updates to apply first, settings to add, anything only Kenneth can do.
4. **How it was checked,** and what couldn't be checked.

Pull requests are merged with a merge commit, so each commit keeps its message. If that ever changes to squash merging, the pull request's title becomes the commit message, so write the title in the same form.

## Branches

The cheat sheet doesn't cover branches. A proposal (Kyan, 2026-10-04: branch names should say what's being built):

```
<owner>/<type>/<app>-<topic>
```

- **owner:** whose session made it, as the repository's `CLAUDE.md` asks: `claude` for Kenneth's sessions, `kyan` for Kyan's.
- **type:** the commit type the branch is mostly about: `feat`, `fix`, `docs`, `chore`, and so on.
- **app and topic:** the scope, then a few words, lowercase, joined with hyphens.

For example `kyan/feat/ppm-templates-and-archive` or `claude/fix/portal-sign-in-refresh`. No random suffixes: a name should still mean something in a list of twenty branches.

**Not yet adopted repository-wide.** The repository's `CLAUDE.md` says `claude/<topic>` and `kyan/<topic>`; this pattern keeps those prefixes and adds the type and the app. Adopting it means changing that one line in `CLAUDE.md`, which every app shares, so it's Kenneth's call.
