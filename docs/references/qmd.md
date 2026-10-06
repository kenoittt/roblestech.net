# qmd: searching the docs

[qmd](https://github.com/tobi/qmd) is a local search engine for markdown files, by Tobi Lütke, mentioned as an optional tool in the [LLM wiki](llm-wiki.md). It runs on your own computer: keyword search, meaning-based (vector) search with a small local model, and a hybrid mode that also rewrites the question and re-ranks the results with two more models. It has a command line and an MCP server, so an AI session can use it as a tool.

**These docs never depend on it.** Kenneth's sessions and cloud sessions won't have it. `index.md` and `grep` must always be enough to find things.

## What we found (2026-10-06)

Tried on Kyan's Mac with qmd 2.8.3, on 65 documents: the PPM's docs, these repository docs, and a private collection of notes. The same six questions were asked in each mode.

| Mode | Command | Speed | How it did |
|---|---|---|---|
| Keyword | `qmd search "…"` | Instant | Found the right area for about half the questions. Misses when the docs use other words ("late work" didn't find the page that says "overdue") |
| Meaning (vector) | `qmd vsearch "…"` | 1 to 2 s | The best: "colour for late work" found the design system's colour table first; "can staff see a private task" found the permissions table |
| Hybrid | `qmd query "…"` | 23 to 55 s from the command line | No better than meaning search here. It loads three models for every command; the MCP server keeps them loaded, which should be much faster (not measured) |
| `grep` | `grep -ril "…"` | Instant | Finds exact words only, like keyword search |

**The cost:** 2.1 GB of models in `~/.cache/qmd` (downloaded once, in about two minutes); re-indexing after changes takes seconds (`qmd update && qmd embed`).

## When it's worth it

- **Now (dozens of pages):** `index.md` first, then `grep`. qmd's meaning search helps when you don't know the docs' words, and when searching several folders at once.
- **Later (hundreds of pages):** worth more. The index gets long, and a question's words drift further from the page's. That's when the LLM wiki suggests a search engine.

## Using it

```bash
qmd collection add ppm/docs --name ppm-docs   # once per folder
qmd update && qmd embed                       # after the docs change
qmd vsearch "who can delete a project" -n 5   # by meaning: fast
qmd search "overdue" -n 5                     # by exact words
qmd get qmd://ppm-docs/guides/database.md     # read a result
```

The index lives in `~/.cache/qmd`, outside the repository. Nothing about qmd is committed.
