# 0006. The app sends its own sign-in emails

- **Status:** decided and built
- **When:** found 2026-10-03, built the same day
- **Who:** Claude (found it while planning the deployment), Kenneth's Claude (built it)

## Context

Supabase project A has one set of email templates and one site address, shared by the PPM and the client portal. The portal's password reset relies on Supabase's standard link. The PPM needs a different link, which its own `/auth/confirm` page checks. Changing the shared templates for the PPM would have broken the portal's resets; leaving them would have broken the PPM's invitations.

## Decision

For invitations and password resets, the PPM asks Supabase only for the link (`generateLink`, which sends nothing) and sends the email itself, through the same Microsoft 365 setup as its notifications. Supabase's templates and site address are left alone.

## Why

Two apps can share a database without fighting over its settings. The emails also come from the company's own address, like every other PPM email.

## What it means for you

Never change project A's Auth templates or site address for the PPM: the portal depends on them. If email isn't set up, inviting refuses up front and creates nothing.
