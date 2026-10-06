# The repository's docs

Start here. These docs exist so that anyone working in this repository, a teammate or an AI session starting with no memory of earlier work, can build things that look, work and read like the rest of it. They hold what the code can't say on its own: why things are the way they are, what we decided, what we like and dislike, and how we check our work.

The idea comes from Andrej Karpathy's LLM wiki ([references/llm-wiki.md](references/llm-wiki.md)): raw sources go in, an AI keeps a structured, linked set of pages up to date, and an index and a log make it easy to find things. Here it's adapted to a code repository.

## Two layers

| Where | What it holds |
|---|---|
| `docs/` (this folder) | What applies to every app: how we think and work, how commits and pull requests are written, and how the docs themselves are organised |
| `<app>/docs/` | Everything about one app: its design system, architecture, database, tests, decisions, backlog and history. Today only the PPM has one: [`ppm/docs/`](../ppm/docs/index.md) |

Read [how-we-work.md](how-we-work.md) first, then the app's own `docs/index.md`.

## How each docs folder is organised

Every docs folder follows the same shape, so you always know where to look. Not every folder needs every part: add one when there's something to put in it.

| Part | What goes in it | Rules |
|---|---|---|
| `index.md` | The catalog: every page and folder, what it's for, who wrote it, and when | Update it in the same commit whenever a page is added, moved or removed |
| `log.md` | The history of **substantial** changes and decisions | See "What belongs in a log" below |
| `raw/` | What a person wants the docs to take in, kept exactly as given: briefs, transcripts, notes from a meeting | Never edit. The pages that use them say what they took |
| `references/` | Outside material we learn from: articles, design references, specifications | Say where it came from, and what to take from it |
| `guides/` | How things are done here: the design system, the architecture, the database, testing, the workflow | Keep them current: a guide that's wrong is worse than none |
| `decisions/` | Records of substantial decisions: the context, what was decided, by whom, and why | One file per decision. A change of mind gets a new file that points to the old one |
| `people/` | The people the work involves, and what they need from it | Only what each person would be happy to see in public |
| `for-humans/` | Things only a person can do (an account setting, a database update, a decision), each with what to do, why, and how | Written for that person, in plain words |
| `reports/` | What a large piece of work did, what it considered and why | Only for large work, or when someone asks for one. Not for every task |
| `backlog.md` | What's left to do | One list, so nothing is tracked in two places |
| `private/` | Each person's own briefs and notes, on their own computer | Git ignores what's inside. Never force a file in with `git add -f`, and never run `git clean -x` here: it deletes ignored files |

## What belongs in a log

A log entry is for something that changes how we work or think, not for every change.

- **Yes:** a new feature or app; a change to the design system (a new colour, or a colour that now means something else); a change to the architecture, the database's rules or the deployment; a decision that settles a question for good; a lesson learned the hard way.
- **No:** a wording change, a small fix that changes nothing else, a refactor nobody outside the file notices.

Each entry starts with `## [YYYY-MM-DD] type | title`, where the type is one of `feature`, `design`, `architecture`, `database`, `decision`, `process`, `fix`, `docs`. That keeps the log searchable: `grep "^## \[" log.md | tail -5` shows the last five.

## Rules for every page

- **It's public.** The whole repository is public. No keys, passwords, database dumps, client data, personal details or internal notes. Each person's private briefs and notes go in a `private/` folder, which git ignores.
- **Write like a teammate showing someone around.** Warm, plain, straight to the point. Short sentences. Explain a term the first time it appears. Dates as 2026-10-06. No em dashes or en dashes: use a full stop, a comma, a colon or brackets.
- **Keep it true.** When the code changes, change the page that describes it in the same commit. Date what you check. Say plainly what you couldn't check.
- **Link, don't copy.** One fact lives on one page; others link to it.

## Searching the docs

Start with the `index.md` of the folder you're in. Then:

- **If [qmd](https://github.com/tobi/qmd) is installed** (it is on Kyan's Mac), use it first. `qmd vsearch "your question"` searches by meaning, so it finds the page even when the page uses other words, in about two seconds. `qmd search "word"` finds exact words at once. Which to use, and what we measured: [references/qmd.md](references/qmd.md).
- **Otherwise,** `grep` for the words you expect.

The docs never depend on qmd: Kenneth's sessions and cloud sessions don't have it.
