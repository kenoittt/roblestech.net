# Testing and checking

What to run, when, and what each check catches. Running the PPM locally is in [`README.md`](../../README.md) ("Run it locally"). Checked 2026-10-06.

## What to run

| Check | Command | What it catches | When |
|---|---|---|---|
| Types | `npm run typecheck` | Type errors | Every change |
| Lint | `npm run lint` | Mistakes, including the React Compiler's rules | Every change |
| Build | `npm run build` | Anything that only breaks when built | Before a pull request |
| Smoke test | `npm run test:smoke` | 32 checks of the main flows, end to end, against the local app and database (below) | Before every pull request |
| Menu test | `npm run test:menus` | Any menu, popover or picker that breaks its screen when opened: 16 screens, as a super admin, an admin and staff. About seven minutes | When you change the interface |
| Your eyes | A browser | Layout, alignment, truncation, contrast, focus, empty and error states | Anything visual |

Both tests need the local database (`npx supabase start`), the app (`npm run dev`) and Google Chrome (or `CHROME_PATH` pointing to a Chromium).

## What the smoke test covers

Creating and assigning a task; the panel (status, history, comments); deleting and Undo; dragging on the board and the calendar; an invitation, from the email in the mail catcher through to setting a password; sign-off rules (staff refused, an admin signing off in someone's place, requests going to the people the rule names); private tasks; role limits and the message when a change is refused; the password eye; archiving and deleting projects; templates for tasks and the calendar; a calendar entry's buttons; live updates between two people.

## Checking in a browser

- **Every role** whenever sign-in, roles or rules change: super admin, admin and staff, and make sure a client can't get in (the repository's `CLAUDE.md`).
- **Both themes,** dark and light.
- **Two widths:** a laptop (about 1440 by 900) and a phone (about 390 by 844).
- **Take screenshots** and look at them closely: alignment, cut-off text, contrast, focus rings. A person looking at one screenshot catches what no test does (an amber border where none belongs, for example).

## Writing a smoke check

- Add it to `tests/smoke.mjs` as `check("a plain sentence saying what should happen", condition, detail)`.
- **Check the outcome in the database,** not only on the screen (the test has a `sql()` helper for the local database).
- **Test a rule as the person who should be refused,** not only as an admin: sign in as them and try it.
- **Use the test's own data:** titles start with "E2E check", and the test removes what earlier runs left behind before it starts.

## Lessons the tests taught

- **Open everything.** On 2026-10-02, four menus took their screen down when opened (a label outside its group), and no test had ever opened them. That's why `test:menus` exists.
- **Listen for caught errors too.** Errors that React's error boundaries catch never reach `pageerror`; they're only logged. The menu test listens to both.
- **A test found a design bug:** a single-choice menu stayed open after a choice, so the next click closed it instead of opening it. Menus now close after a choice.
- **Test touch with real gestures.** A scroll that started on the calendar once left a stuck "new block" outline, because the browser's "pointer cancel" wasn't handled. Chrome's own touch-scroll gesture (through its DevTools protocol) reproduced it.
- **Walk through the demo before a demo,** on the production build (`npm run build && npm start`). That walkthrough found the crashing menus.
- **Text selectors match loosely.** Playwright's `has-text` ignores case and matches part of the text: "Admin" also matches "Super admin". Use an exact pattern.
- **Clean up after yourself.** Tests create data. On a shared or live database, remove exactly what the test made; don't reset someone else's data.

## Never

- Run tests against production.
- Leave test accounts, tasks or calendar entries behind on a database people use.
