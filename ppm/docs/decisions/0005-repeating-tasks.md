# 0005. Repeating tasks

- **Status:** decided and built
- **When:** 2026-10-02
- **Who:** Kyan and Claude

## Context

Some work comes back on a fixed rhythm: a weekly check, a monthly report.

## Decision

A task can repeat every day, every weekday, every week, every two weeks or every month. When one is finished, the database makes the next one: same title, description, people, project, priority, privacy and sign-off rule, the checklist unticked, due on the next date in the pattern that hasn't passed. The series moves to the new task, so finishing the old one again can't make a duplicate.

The next one keeps the series' **creator and assigner.** Without that, whoever finished the last one would become its assigner, and could then sign off their own work under an "assigner" rule. They're set from inside the database only, under an internal flag the app can't set.

## Why

Fixed-rhythm work shouldn't need retyping, and a repeat must never weaken a sign-off rule.

## What it means for you

Routine work without a fixed rhythm is what templates are for ([0007](0007-templates-for-routine-work.md)). Keep the two ideas apart.
