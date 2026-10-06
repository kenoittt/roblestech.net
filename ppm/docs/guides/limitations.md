# Known limitations

What the PPM doesn't do, or doesn't do well yet, and why. Knowing these saves rediscovering them. When one is fixed, remove it here and tick its backlog item. Checked 2026-10-06.

## By design

- **No client access.** The PPM is for the team. Clients use the portal, which shares the database but can't open the PPM.
- **Manila time only.** Dates and times follow the team's time zone (UTC+8). People elsewhere see Manila times.
- **Desktop first.** Phones can follow (the calendar shows one day, the panel fills the screen), but the PPM is built for a laptop screen.
- **Email needs Microsoft 365.** Notifications, invitations and password resets go through the company's Microsoft 365. Without those settings, inviting refuses up front and no emails go out.
- **One project, one database.** The PPM shares Supabase project A with the portal, so the sign-in email templates and site address belong to both ([decision 0006](../decisions/0006-the-app-sends-its-own-sign-in-emails.md)), and anything touching `profiles` affects both.

## Not built yet

- **The meeting attendee picker shows every teammate as a chip.** Fine for a small team; it won't scale to many people or long names. A searchable multi-select is in the [backlog](../backlog.md).
- **Templates can't add a block to every weekday at once,** and a task template can't also block time for the task ([backlog](../backlog.md), item 15).
- **No way back if nobody is a super admin.** Today it takes SQL on the live database ([backlog](../backlog.md), item 12).
- **Project owners can't delete an empty project;** only admins delete ([backlog](../backlog.md), item 13).
- **Type errors don't block pull requests yet** ([backlog](../backlog.md), item 8).

## Known debt

- **The folders aren't all the same shape.** Domains name their files differently (`config.ts`, `types.ts`, `layout.ts`), and there's no set place for hooks or contexts yet ([backlog](../backlog.md), item 7).
- **Some rules are written twice:** once in the database and once in the code that mirrors them to explain refusals (`canComplete` and `ppm_can_complete`, for example). A comment marks each pair; change both together.

## Things to know when working on it

- **Next.js 16 differs from older Next.js.** Read its bundled docs before using its APIs ([architecture.md](architecture.md)).
- **Database updates must reach the live database before the code that needs them is merged,** or features quietly don't work ([database.md](database.md)).
- **The tests need a local database and Chrome,** and the menu test takes about seven minutes ([testing.md](testing.md)).
