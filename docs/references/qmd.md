# qmd: searching the docs

[qmd](https://github.com/tobi/qmd) is a local search engine for markdown files, by Tobi Lütke, mentioned as an optional tool in the [LLM wiki](llm-wiki.md). It runs on your own computer: keyword search, meaning-based (vector) search with a small local model, and a hybrid of the two that re-ranks the results with another model.

**Where it's installed, use it** (it is on Kyan's Mac). It finds the right page even when the page uses other words than your question, which `grep` can't. **The docs never depend on it,** though: Kenneth's sessions and cloud sessions don't have it, so `index.md` and `grep` must always be enough.

## Which search to use

| Mode | Command | Speed | Use it for |
|---|---|---|---|
| Meaning (vector) | `qmd vsearch "…"` | About 2 s | **Start here.** Questions in your own words: "colour for late work" finds the design system's colour table, which says "overdue" |
| Keyword | `qmd search "…"` | Instant | Exact words you know are on the page: a function, a file name, a term like `ppm_can_complete` |
| Hybrid | `qmd query "…"` | 13 to 55 s | Only when the two above miss. Slow on this Mac (below) |
| `grep` | `grep -ril "…" docs ppm/docs` | Instant | Exact words, with or without qmd |

Then open what it found and read it. A result's snippet is a lead, not an answer.

## What we measured (2026-10-06)

On Kyan's Mac (Apple M2, 16 GB) with qmd 2.8.3 and about 70 documents.

- **Meaning search** put the right page first for most questions, in about two seconds, even when the question and the page used different words. One miss: "how should commits be written" didn't bring up `git-conventions.md` in the top three, and keyword search for "commit" finds it at once. So when one mode misses, try the other.
- **Hybrid search** was no more accurate on our questions, and slow: 23 to 55 s when it also rewrites the question, 16 s for a question written in its structured form, and still 13 to 16 s for each new question with qmd's server keeping the models loaded. Re-ranking is the slow part on this computer, so a server doesn't make it quick.
- **Not worth installing here:** qmd's MCP server and its Claude Code plugin. The plugin's skill tells sessions to default to hybrid search, which would make every search slow on this Mac. The commands above are enough.

**The cost:** 2.1 GB of models in `~/.cache/qmd`, downloaded once.

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
qmd update && qmd embed                       # the first run downloads the models
qmd vsearch "who can delete a project" -n 5   # by meaning
qmd search "overdue" -n 5                     # by exact words
qmd get qmd://ppm-docs/guides/database.md     # read a result
```

The index lives in `~/.cache/qmd`, outside the repository, and nothing about qmd is committed. It indexes every markdown file in a folder, your `private/` notes included, and they stay on your computer.
