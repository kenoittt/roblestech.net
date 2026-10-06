# Kyan: your open items

Started 2026-10-07. Tick each one off here, with the date, when it's done. Things only you can do, for any app in the repository; your Claude reads this page when a session starts and tells you what's here.

## 1. Move your reference screenshots out of the public folder

**Why:** the screenshots in `ppm/docs/references/` (`Ugly-Template-UI.png`, `Clipping-Board-View-Entries.png` and the rest) show real task titles and Christian's email. That folder is part of the public repository; the files are untracked today, so one careless `git add` would publish them. That nearly happened on 2026-10-07 and was undone before anything was pushed.

**How:** move them to `ppm/docs/private/` (git ignores it), or delete them if you no longer need them. Your Claude can do it on your word.

## 2. After this round is merged: load the new sample data

**Why:** the local sample data now has the real team, an invented client, and data for every option (colours, blocks over midnight and days, crowded hours, templates of each kind). A local database only gets it when it's reset.

**How:** from `ppm/`, `npx supabase db reset`. It only touches your local database.
