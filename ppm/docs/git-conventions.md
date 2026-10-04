# Commits and branches

How commits and branches are named in this repository, from 2026-10-04 on (Kyan's request). The rules come from one cheat sheet; this page only adds what it leaves to each project.

**The reference:** [Conventional Commit Messages, by qoomon](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13#conventional-commit-messages-). Read it once; it's short. It follows the [Conventional Commits specification](https://www.conventionalcommits.org/).

## Commits

The shape, from the cheat sheet:

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

- **Types:** `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ops`, `chore`. What each one covers is in the cheat sheet.
- **Description:** imperative and present tense ("add", not "added" or "adds"), no capital first letter, no full stop at the end.
- **Breaking changes:** `!` before the colon, and a `BREAKING CHANGE:` footer saying what breaks.

What this repository decides for itself:

- **Scope = the app.** `ppm`, `portal`, `site` (the public site at the root) or `travel` (WanderWise). Leave it out for something that spans the repository, like `CLAUDE.md` or the checks in `.github/`. Never an issue number (the cheat sheet's rule).
- **The body says why.** What was wrong or wanted, what changed, and how it was checked. Wrap at about 72 characters. The house style for writing applies: plain words, short sentences, as in [README.md](README.md).
- **Database changes say so.** Name the migration file in the body, and whether it must be applied before the code is merged (it almost always must).
- **Claude sessions add their attribution lines** at the end of the footer, as their instructions say.
- **One change per commit.** A fix found while building a feature gets its own `fix` commit, so it can be reviewed, or reverted, on its own.

Examples from 2026-10-04:

```
fix(ppm): name the caller's role when a people change is refused
feat(ppm): archive, restore and delete projects
feat(ppm): save tasks and calendar entries as templates
test(ppm): cover roles, passwords, projects and templates in the smoke test
docs(ppm): record the 2026-10-04 brief and what was done with it
```

Pull requests are merged with a merge commit here, so each commit keeps its message. If that ever changes to squash merging, the pull request's title becomes the commit message, so write the title in the same form.

## Branches

The cheat sheet doesn't cover branches. A proposal (Kyan, 2026-10-04: branch names should say what's being built, like `revamp/ppm-nextjs`):

```
<owner>/<type>/<app>-<topic>
```

- **owner:** whose session made it, as the repository's `CLAUDE.md` already asks: `claude` for Kenneth's sessions, `kyan` for Kyan's.
- **type:** the commit type the branch is mostly about: `feat`, `fix`, `docs`, `chore`, and so on.
- **app and topic:** the scope, then a few words, lowercase, joined with hyphens.

For example `kyan/feat/ppm-templates-and-archive`, the branch this page was written on, or `claude/fix/portal-sign-in-refresh`.

No random suffixes (the `-djs57t` some session branches end with): a name should still mean something in a list of twenty branches.

**Not yet adopted repository-wide.** The repository's `CLAUDE.md` says `claude/<topic>` and `kyan/<topic>`; this pattern keeps those prefixes and adds the type and the app. Adopting it means changing that one line in `CLAUDE.md`, which every app shares, so it's Kenneth's call.
