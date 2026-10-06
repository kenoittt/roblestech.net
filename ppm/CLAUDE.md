@AGENTS.md

# Working on the PPM

Read `docs/index.md` first: it lists the PPM's knowledge base. Then the repository's `docs/how-we-work.md` (the mindset), the guides your task needs in `docs/guides/`, and `docs/backlog.md` with the latest entries of `docs/log.md`. Your own notes, if you keep any, are in `docs/private/` (start at its `index.md`); git ignores them.

What matters most here:

- **Follow the design system** (`docs/guides/design-system.md`): tokens only, existing components first, and never gradients, emojis, cards inside cards, pill badges or illustrations. Design features the way `docs/guides/ux-principles.md` describes: the job to be done, the fewest clicks, and what happens at ten times the size.
- **Rules live in the database.** A new rule is a migration; migrations are new and additive, and reach the live database before the merge, through Kenneth (`docs/guides/database.md`).
- **Check before a pull request:** `npm run typecheck`, `npm run lint` and `npm run test:smoke`; `npm run test:menus` when the interface changes; every role when sign-in, roles or rules change (`docs/guides/testing.md`).
- **Update the docs in the same commit** (`docs/guides/workflow.md` says which). Log only what's substantial, write a report only for large work or when asked, and put anything only a person can do in `docs/for-humans/`.
- **Commits are short and warm,** in the conventional form (the repository's `docs/git-conventions.md`).
- **Deploying or replacing the live PPM:** read `docs/DEPLOY.md` first and follow its "Rules for Claude".
