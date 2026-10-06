# 0013. A project's owner may delete it while it's empty

- **Status:** decided, not built yet
- **When:** 2026-10-07
- **Who:** Kenneth, settling the open question in [0008](0008-archive-closed-and-delete.md) (backlog item 13)

## Context

[0008](0008-archive-closed-and-delete.md) lets whoever manages a project archive it, and only admins delete it. So a project made by mistake, or for a test, needs an admin to go away.

## Decision

A project's owner may delete it while it has no tasks. A project with tasks stays admins-only to delete; its owner archives it.

## Why

An empty project has nothing in it to lose, so its owner can clean up their own mistake without asking anyone. Projects with work in them keep the safer path.

## What it means for you

To build (backlog item 13): the database's delete rule lets the owner delete a project with no tasks, deleted ones included, so nobody's history goes with it; the app offers Delete to that owner.
