# 0012. Templates are made where work is made

- **Status:** decided and built; changes how [0007](0007-templates-for-routine-work.md) said templates are saved
- **When:** 2026-10-06 (asked), 2026-10-07 (built)
- **Who:** Kyan; built by Kyan's Claude

## Context

Templates (0007) could only be saved from something that already existed: make a task or a calendar entry, open it, then Save as template. So making a routine took a real task or entry first, which then had to be deleted, and about eight clicks. Kyan, 2026-10-06: "To create a template, you have to create a task or a time block first and then edit it and save it as a template. Isn't that bad UX?" He didn't want a separate place for making templates: "We already have a task creator. So it can just be a simple checkbox like create a template."

Templates also didn't work on the live PPM. The most likely cause is that their database update was never applied there (Kenneth's open items, item 1). That's a deploy step, not a design problem, and it's tracked on its own.

## Decision

- **Both creators save templates.** The new-task dialog (press C) and Plan time each have a **Save as template** switch in their footer, beside Create more. With it on, the same dialog saves a template and makes nothing else. It shows what a template has that a task or an entry doesn't: a name (the title, unless you give it another), whether the team can use it, who gets the task ("whoever uses it", a set person, or nobody yet), a due date that's relative ("the next day"), and a checklist you build right there. A calendar template keeps a time of day, so it asks for no day and no task.
- **The same dialog changes a template.** Settings, Templates has **New** and **Edit** for each list, and Edit opens the dialog the template was made in, filled in. Saving under the name of a template you can change still replaces it, as before.
- **Saving from real work stays.** A task's ⋯ menu, Save as template…, now opens the new-task dialog as a template, with everything the task has, its checklist included, to adjust before saving. The separate save dialog is gone. A calendar entry's Edit keeps its small Save as template pop-up.
- **Using a template doesn't change.** Templates in the dialogs, ⌘K, and the arrow beside Plan time (which gains **New template…**).
- **The app says when templates can't work.** If the database has no templates yet, the pickers and switches say so, instead of an empty list and a failing save.

## Why

- **Fewer clicks for the routine you already know.** Making one went from about eight clicks and a throwaway task to: C, the switch, type, ⌘Enter.
- **One editor.** Making, saving from a task and editing all happen in the dialog people already know, so there's nothing new to learn and nothing to keep in step.
- **Nothing made by accident.** With the switch on, the button says Save template, and no task or entry is created.

## Ruled out

- **A templates page or a "new template" form of its own:** a second place to learn and maintain, which Kyan didn't want.
- **A template picker only inside Plan time,** without the arrow beside it: the arrow adds a routine block in two clicks, and it's the industry's usual split button. It was restyled to read as one button.
