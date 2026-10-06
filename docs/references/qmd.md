# qmd: searching the docs

[qmd](https://github.com/tobi/qmd) is a local search engine for markdown files, by Tobi Lütke, mentioned as an optional tool in the [LLM wiki](llm-wiki.md). It runs on your own computer, with three small models it downloads once.

**Where it's installed, use it** (it is on Kyan's Mac). It finds the right page even when the page uses other words than your question, which `grep` can't. **The docs never depend on it,** though: Kenneth's sessions and cloud sessions don't have it, so `index.md` and `grep` must always be enough.

## How it searches

- **Keyword search** (`qmd search`) finds pages containing your words, weighting rare words higher (the BM25 method). Instant, and exact: "colour" won't find "overdue".
- **Vector search** (`qmd vsearch`) turns your question and every passage into lists of numbers that capture meaning, and returns the closest passages. It finds pages that use other words, but it can miss exact names.
- **Hybrid search** (`qmd query`) runs both at once, plus a "hypothetical answer" search (you write a sentence the answer might contain, and it finds passages like it). It merges the lists, so a page that ranks well in several rises to the top. Then a fourth model, the re-ranker, reads your question beside each of the top passages and scores how well each one actually answers it. If you give it a plain question, a fifth step first asks another model to write those searches for you, which is the slowest part.

## Which to use

| Need | Command | Speed on Kyan's Mac |
|---|---|---|
| **A question, in your own words** (the default) | `qmd query` with your own intent, lex, vec and hyde lines (below) | 13 to 27 s |
| **An exact name:** a function, a file, an error, a term | `qmd search "ppm_can_complete"`, or `grep -rn` | Instant |
| **Every page that mentions something** | `grep -rln "word" docs ppm/docs`; qmd ranks the best matches, it doesn't list them all | Instant |
| **Everything a topic touched**, to update it all | `grep -rln` for its names, `git log --name-only` for the files its changes touched, then a hybrid search with `--format files -n 20` for pages that discuss it in other words | Seconds |

Write the hybrid search's lines yourself, rather than passing a plain question: you know the goal, the likely words and what to avoid better than the built-in model does, and it skips the slowest step.

```bash
qmd query $'intent: the colour that marks late work in the design system, not the palette in general
lex: overdue late colour
vec: which colour shows that a task is late
hyde: Overdue dates use a warning colour so late work stands out.' -n 8
```

Then **read the top few results, not only the first,** and open the pages themselves: a snippet is a lead, not an answer. Prefer the current pages (guides, decisions, the index, the backlog) over records (reports, logs, `raw/`, `private/`, handoffs) unless the question is about history.

## What we measured (2026-10-06)

Twelve questions with known answers, on Kyan's Mac (Apple M2, 16 GB), qmd 2.8.3, about 70 documents: the PPM's docs (including the private notes), these docs, and Kyan's private notes on the website.

| Mode | Right page first | In the top 3 | In the top 5 | Time per question |
|---|---|---|---|---|
| Vector (`qmd vsearch`) | 4 | 7 to 8 | 8 | 2 to 7 s |
| Keyword (`qmd search`) | 4 | 8 | 8 | Instant |
| Hybrid, no re-ranking | 4 | 7 | 10 | 2 s from the command line |
| **Hybrid with re-ranking** | 4 | **9** | **11** | 13 to 27 s |

- **Hybrid with re-ranking is the most accurate,** so it's the default. It missed only one question in the top five, against four for vector search.
- **No mode put the right page first more than a third of the time.** The reason isn't the search: long records, like session reports, logs, handoff briefs and old plans, mention almost everything, so they outrank the focused current page. That's why you read the top few, and why the current pages win when they disagree with a record.
- **Labelling folders didn't help.** qmd can attach a description to each folder (`qmd context add`); we labelled the records as history, and the ranking didn't change. The labels do show up beside each result, which helps you tell a record from a current page.
- **Speed:** re-ranking costs about 13 s per question once the models are loaded, and up to 27 s from the command line while other work runs, because each command loads the models first. A plain `qmd query "question"`, which also writes the searches itself, took 23 to 55 s and wasn't more accurate.

## What it costs in tokens

The searches run on your computer, so re-ranking costs time, not tokens. A session pays only for the text it reads. These are estimates from our files' sizes, not a measurement (a token is about four characters):

| What a session reads | Tokens |
|---|---|
| Writing a hybrid search's lines | About 100 |
| Its results with snippets (`-n 5`) | About 500 to 1,000 |
| Its results as file names only (`--format files`) | About 15 a file |
| `grep -rln` (file names) | About 10 a file |
| `grep -rn` (every matching line) | 200 to 5,000 or more, depending on the word |
| One of the PPM's guides | About 1,600 on average |

So a search costs about as much as reading half a guide, and pays for itself when it saves one wrong page. Re-ranked hybrid search had the right page in the top five for 11 of 12 questions, against 8 for meaning search: roughly one wrong-page detour fewer every four questions.

## The MCP server

qmd can also run as an MCP server, a connection that lets Claude call it as a tool. It offers the same hybrid search (`query`), reading documents by path or ID with line ranges (`get`, `multi_get`) and the index's health (`status`), so it adds nothing the command line lacks. What it changes: the models stay loaded between searches, which saves the few seconds each command spends loading them, but they stay in memory for as long as the server runs, in every session that starts one: about 0.9 GB for the searches we use (the 318 MB meaning model and the 610 MB re-ranker), and 2.1 GB if a plain question also loads the 1.2 GB model that writes searches. With the command line, the same models load for each search and are freed when it ends. We use the command line; revisit if a session searches dozens of times.

## Keeping it current

qmd doesn't notice changes on its own. After a `git pull`, or after editing docs, refresh it (about 15 seconds when little changed):

```bash
qmd update && qmd embed
```

## Setting it up

```bash
npm install -g @tobilu/qmd                    # once
qmd collection add ppm/docs --name ppm-docs   # once per folder
qmd collection add docs --name repo-docs
qmd update && qmd embed                       # the first run downloads the models (2.1 GB)
qmd get qmd://ppm-docs/guides/database.md     # read a result
```

The index lives in `~/.cache/qmd`, outside the repository, and nothing about qmd is committed. It indexes every markdown file in a folder, your `private/` notes included, and they stay on your computer.
