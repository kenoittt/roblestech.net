# 0010. The knowledge base

- **Status:** decided; being filled
- **When:** started 2026-10-03, given its shape 2026-10-06
- **Who:** Kyan

## Context

The PPM was designed and built with a great deal of context that lived in private notes and in one person's sessions. Sessions without it (a cloud session, Kenneth's Claude) built things that worked but didn't always fit: an amber border where none belonged, a missing step before a merge. Their own reports said what they lacked: design rules, a permissions table, production facts, the decisions and their reasons.

## Decision

The repository keeps its own knowledge base, public like the code, following Andrej Karpathy's LLM wiki pattern: an index, a log of substantial changes, raw sources kept as given, guides, decisions, people, tasks only a person can do, and reports for large work. The repository-wide part is in `docs/`; each app has its own `docs/` ([the conventions](../../../docs/README.md)).

## Why

So that anyone, a person or an AI session with no memory of earlier work, can build at the same quality. The knowledge compounds instead of being rediscovered each time.

## What it means for you

Read it before you start; leave it better than you found it ([workflow.md](../guides/workflow.md)).
