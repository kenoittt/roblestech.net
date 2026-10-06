# Log: the PPM

The history of substantial changes and decisions, newest last. Only what changes how we work or think: a feature, a change to the design system, the architecture or the database's rules, a decision, a lesson learned the hard way. Not wording changes or small fixes ([the rules](../../docs/README.md#what-belongs-in-a-log)).

Each entry starts `## [YYYY-MM-DD] type | title`; the types are `feature`, `design`, `architecture`, `database`, `decision`, `process`, `fix`, `docs`. `grep "^## \[" log.md | tail -5` shows the last five.

## [2026-10-01] decision | Rebuild the PPM in Next.js
Proposed on 2026-10-01, agreed on 2026-10-02 ([0001](decisions/0001-nextjs-for-the-ppm.md)). Built in a separate folder first, so nothing touched the live PPM.

## [2026-10-02] design | The design direction and the design system
Linear as the reference; dark first; more blue, less green; never gradients, emojis, cards inside cards, pill badges or illustrations ([0003](decisions/0003-the-design-direction.md)). Tokens in `src/app/globals.css`; shadcn on Base UI, restyled; motion after Emil Kowalski ([design-system.md](guides/design-system.md)).

## [2026-10-02] architecture | The rules live in the database
Row-level security on every table; triggers for sign-off, privacy, history and notifications; the app writes as the signed-in person ([0002](decisions/0002-rules-live-in-the-database.md)).

## [2026-10-02] feature | The new PPM, first version
Tasks in list, board and calendar views with a side panel, sign-off rules, private tasks, comments with @mentions, checklists, files; Home, People, Projects, the team calendar with privacy, the Handbook, the Inbox; emails and the 8 AM digest; live updates. Smoke test 20 checks.

## [2026-10-02] feature | Repeating tasks
The next one keeps the series' creator and assigner, so a sign-off rule can't shift ([0005](decisions/0005-repeating-tasks.md)).

## [2026-10-02] decision | Admins may sign off in someone's place, visibly
Built with a clear label and a history entry; kept by Kenneth on 2026-10-03. Sign-off requests go to the people the rule names ([0004](decisions/0004-sign-off-rules.md)).

## [2026-10-02] design | Text contrast meets WCAG AA
`fg-3` and `fg-4` changed in both themes, and the light-mode amber; secondary text now reaches 4.5 to 1.

## [2026-10-02] fix | Four menus crashed their screen; a test now opens every menu
A menu label outside its group made Base UI throw. Found by walking through the demo script; `npm run test:menus` added ([testing.md](guides/testing.md#lessons-the-tests-taught)).

## [2026-10-02] fix | Redirects after sign-in stay on the site
An open redirect after sign-in and email links fixed (`safeNext`).

## [2026-10-03] process | Live: the PPM replaced the Astro PPM
Copied unchanged into `ppm/`, ten database updates applied to the live database first, deployed the same day, keeping the current data ([DEPLOY.md](DEPLOY.md)).

## [2026-10-03] decision | The app sends its own sign-in emails
Supabase project A's templates are shared with the portal, so invitations and resets use `generateLink` and Microsoft 365 ([0006](decisions/0006-the-app-sends-its-own-sign-in-emails.md)).

## [2026-10-04] feature | Templates, project archive and delete, the password eye
Templates for tasks and calendar entries ([0007](decisions/0007-templates-for-routine-work.md)); archive, restore and delete for projects ([0008](decisions/0008-archive-closed-and-delete.md)); an eye on every password field; role refusals that name your role. Smoke test 32 checks ([report](reports/2026-10-04-session-report.md)).

## [2026-10-04] process | Database updates go in before the merge
A pull request that adds migrations needs them on the live database first ([DEPLOY.md](DEPLOY.md#database-updates-after-the-switch)). Whether this happened for 2026-10-04's two updates is unconfirmed; templates not working afterwards suggests not ([for-humans/kenneth.md](for-humans/kenneth.md)).

## [2026-10-06] decision | One copy of the code
All work on the PPM happens in this repository; the separate build folder was archived ([0009](decisions/0009-one-copy-of-the-code.md)).

## [2026-10-06] docs | The knowledge base takes its shape
An index, this log, guides, decisions, people, `for-humans/`, references and raw sources, following the LLM wiki pattern, with the repository-wide part in `docs/` ([0010](decisions/0010-the-knowledge-base.md)).

## [2026-10-06] process | A private folder for each person's notes
`docs/private/` keeps your own notes on your computer: git ignores everything in it except its README ([private/README.md](private/README.md)).
