# 0009. One copy of the code

- **Status:** decided
- **When:** 2026-10-06
- **Who:** Kyan

## Context

The PPM was built in a separate local folder, then copied unchanged into this repository's `ppm/` on 2026-10-03 and deployed. Changes then happened in the repository, so the separate copy fell behind.

## Decision

The repository is the only copy. All work on the PPM happens here, on a branch, through a pull request that Kenneth merges. The local folder was archived, with its history, on Kyan's computer.

## Why

Two copies drift apart, and nobody knows which one is right.

## What it means for you

Start every piece of work from an up-to-date `main` ([workflow.md](../guides/workflow.md)).
