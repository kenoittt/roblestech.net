# 0004. Who signs a task off

- **Status:** decided and built
- **When:** 2026-10-02; the admin exception kept by Kenneth on 2026-10-03
- **Who:** Kyan (the rule), Kenneth (the admin exception)

## Context

Some work needs someone else to approve it before it counts as done. Who that is depends on the task.

## Decision

- **Each task has a sign-off rule:** anyone; anyone but the assignee; the person who assigned it; the reviewer; or chosen people. Signing off means marking it done. The database enforces it (`ppm_can_complete`).
- **Admins may sign off in the named person's place,** so a reviewer on leave doesn't block the team. It's visible: the button reads "Sign off as admin", a message names whose sign-off it replaced, and the history records it as an admin sign-off. This came from the build; Kenneth decided to keep it.
- **Sending a task for sign-off asks the people the rule names** (the reviewer, the chosen people or the assigner). When the rule names nobody, the reviewer is asked, or else whoever assigned it.
- **"Chosen people" can't be saved without choosing someone:** an empty list would leave a task only admins could finish.

## Why

Accountability without bottlenecks: the right person signs off, everyone can see who a task is waiting on, and nobody is stuck when that person is away.

## What it means for you

Home's "Waiting on you", My tasks' "To sign off" and the board's "Waiting on" line all use one rule (`waitsOn` in `domains/tasks/config.ts`). Keep it that way.
