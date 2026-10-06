# 0007. Templates for routine work

- **Status:** decided and built
- **When:** 2026-10-04
- **Who:** asked for by Christian (through Kyan); designed and built by a cloud session

## Context

Some work happens most days, by different people, without a fixed rhythm: the outreach team's daily emails, for example. Making the same task or time block by hand every day is slow. Repeating tasks ([0005](0005-repeating-tasks.md)) don't fit: they run on a clock.

## Decision

Tasks and calendar entries can be saved as templates, from real work (a task's ⋯ menu; a calendar entry's Edit), and used in two or three steps: Templates in the new-task dialog, ⌘K, or the arrow beside Plan time. A template:

- can be personal or shared with the team;
- can be assigned to "whoever uses it", a set person, or nobody;
- has relative dates ("the day it's made", "the next day"), never fixed ones;
- **fills the form for a look first** for tasks and meetings (they notify people), and **adds a time block at once, with Undo** (it notifies nobody).

The full reasoning, with what was ruled out, is in the [2026-10-04 report](../reports/2026-10-04-session-report.md#task-2-templates-for-tasks-and-calendar-entries).

## Why

Saving takes a moment, once; using happens hundreds of times. So using is optimised, and saving happens where people notice the routine: while doing it.

## What it means for you

Anything that notifies other people asks first; anything private and undoable just happens. That principle applies beyond templates ([ux-principles.md](../guides/ux-principles.md)).
