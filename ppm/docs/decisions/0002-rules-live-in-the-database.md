# 0002. The rules live in the database

- **Status:** decided and built
- **When:** 2026-10-02
- **Who:** Kyan and Claude, during the revamp

## Context

The old PPM wrote with the service role key, which skips row-level security, so every page had to remember every rule itself. A page that forgot could let anyone change anything.

## Decision

Who may do what is enforced by the database itself: row-level security on every table, and triggers and functions for the rest (who may mark a task done, who may make it private, who created and assigned it). The database also writes each task's history and the notifications. The app writes as the signed-in person, so the rules always apply. The service role key is used only where it must be (managing people, sending emails), and those server actions check the caller's role first.

## Why

A rule enforced in one place can't be forgotten by a new screen, a new feature or a script. History and notifications written by the database are complete by construction.

## What it means for you

A new rule starts as a migration ([database.md](../guides/database.md)). The screen mirrors it, to hide what someone can't do and to explain refusals, but never replaces it.
