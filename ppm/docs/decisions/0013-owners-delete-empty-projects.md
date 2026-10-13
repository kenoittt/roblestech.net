# 0013. A project's owner may delete it while it's empty

- **Status:** decided 2026-10-07; built 2026-10-13 (migration `20261013000100_owners_delete_empty_projects`)
- **When:** 2026-10-07
- **Who:** Kenneth, settling the open question in [0008](0008-archive-closed-and-delete.md) (backlog item 13)

## Context

[0008](0008-archive-closed-and-delete.md) lets whoever manages a project archive it, and only admins delete it. So a project made by mistake, or for a test, needs an admin to go away.

## Decision

A project's owner may delete it while it has no tasks. A project with tasks stays admins-only to delete; its owner archives it.

## Why

An empty project has nothing in it to lose, so its owner can clean up their own mistake without asking anyone. Projects with work in them keep the safer path.

## What it means for you

Built on 2026-10-13 (backlog item 13). The database's delete rule lets the owner delete a project with no tasks, deleted ones included, so nobody's history goes with it; the app offers Delete to that owner.

- **The owner** is the person in the project's Owner field. A member marked as an owner in some other way archives, like before.
- **"No tasks" is counted by the database,** for everyone's tasks: deleted ones, and ones the owner can't see (someone's private task). The app offers Delete when it can see none, and the database has the last word, with the reason: "This project has tasks, deleted ones included, so only an admin can delete it. You can archive it instead."
- **Admins** delete any project, as before.
