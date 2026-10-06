# 0008. Archive, Closed and Delete

- **Status:** decided and built
- **When:** 2026-10-04
- **Who:** Kyan asked for a way to remove projects; a cloud session designed it

## Context

Projects could be created and edited, but not removed. A test project had nowhere to go.

## Decision

Three different things:

- **Closed** (a status): the work is finished. It stays in the portfolio for reference.
- **Archived:** out of the way, everywhere, without losing anything. Whoever manages the project can archive and restore it; it happens at once, with Undo.
- **Deleted:** gone. Admins only, after a dialog that says exactly what goes, with a choice to keep the project's tasks (the default) or delete them too.

## Why

Marking a test project "Closed" would claim finished work. Archiving is the safe default; deleting is for mistakes.

## What it means for you

Whether a project's owner may delete it while it's still empty is an open question for Kenneth ([backlog](../backlog.md)).
