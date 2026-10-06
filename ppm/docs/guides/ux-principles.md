# How the PPM should feel to use

The PPM's own patterns, on top of the principles every app in the repository shares ([`docs/ux-principles.md`](../../../docs/ux-principles.md): the questions to answer before building, the general principles, scale, and when it's done). Use both when you design anything new, and when you judge whether something is finished. The look is in [design-system.md](design-system.md).

## Designing a feature in the PPM

Answer the shared questions first ([designing anything](../../../docs/ux-principles.md#designing-anything)). In the PPM, that means:

- **Where it lives:** the side panel, the create dialog, a ⋯ menu or the command menu, before a new page, dialog or window.
- **The click count:** count it before and after ([an example](../reports/2026-10-04-session-report.md#click-counts-for-the-outreach-routine)).
- **Who may do it:** decide the rule, then enforce it in the database ([database.md](database.md)).

## How the principles show in the PPM

### Personal first
Home answers "what do I do today?" before anything else: what's overdue, due today and this week, today's plan, and what's waiting for your sign-off. The team's load and the projects come after. Anything new for Home should earn its place against that question.

### One place to work
Clicking a task opens the side panel beside the list, with no page load. The address keeps `?task=12`, so a link opens the same task. J and K move between tasks; Esc closes. New things should open in the panel, a dialog or a popover, not on a new page, unless they're a place people go to (People, Projects, the Handbook).

### The same tasks, seen your way
List, board and calendar show the same tasks. The view, filters, grouping and order are remembered per person and per screen, and saved immediately.

### Edit where it sits
Status, priority, assignee and due date can be changed right in the row or on the card, with the same pickers as the panel. People shouldn't have to open something to change one thing.

### Fewest clicks, keyboard within reach
- **C** creates a task; **⌘Enter** saves it. **⌘K** finds anything and runs any command, templates included.
- **G** then a letter goes anywhere: H home, I inbox, M my tasks, T all tasks, C calendar, P projects, E people, A activity, B handbook.
- In a list: **J** and **K** move, **Enter** opens, **X** selects (to change several at once), **I** assigns to yourself, **Esc** clears.
- **?** shows them all. A new feature's main action should be reachable from the keyboard too.

### Instant, then right
Changes show at once (optimistic updates). If the database refuses, the change rolls back and the reason appears. Other people's changes arrive by themselves in about half a second (live updates). Avoid spinners: keep the old content until the new arrives, or change the button's own text ("Saving…").

### Undo over "are you sure?"
- What can be undone **just happens,** with **Undo** in the confirmation: deleting a task, archiving a project, adding a time block from a template.
- **Ask first** only when it can't be undone (deleting a project) or when it notifies other people (a meeting from a template opens filled in for a look before anyone is invited).

### Rules explain themselves
When something isn't allowed, say why and what to do instead: "Only Kenneth can mark it done. Move it to In review instead." Role refusals name the role the database has for you. Never hide the cause: a refusal that looks like a bug costs everyone time.

### The context you started from wins
Starting from a project's page, a board column or a calendar day fills in that project, status or day. A template fills in the rest, but never overrides where you started.

### Defaults that are already right
Most fields start filled in sensibly: a task you create on My tasks is yours; a template made from your own task is for "whoever uses it"; a due date in a template is relative ("the next day"), never fixed.

### Errors at the field, at the right moment
Validate when someone tries to submit, not while they're still choosing, and show the problem at the field ([design-system.md](design-system.md#forms)).

### Privacy you can see
Private tasks are visible only to whoever created them and whoever they're assigned to. On the calendar, each entry, day or week can be shared, shown only as busy, or hidden; busy-only entries show as a dashed "Busy" block to others. Say what others will see wherever privacy is chosen.

### Accountability without nagging
Sign-off rules decide who marks a task done; cards in review say who they're waiting on; each calendar day shows how much of the plan is done; the 8 AM email lists what's due. Information, not alarms: no red badges or pulsing dots.

### Phones can follow
Desktop first, but nothing breaks on a phone: the calendar shows one day at a time, the panel fills the screen, and a finger scrolling a list never starts a drag.

### Speed is a feature
The server loads the team, projects and tasks in one round of parallel queries; after that the browser keeps them, so switching views is instant (about 120 ms between screens in a production build). Don't add waits: no splash screens, no animation on things used a hundred times a day.

## Scale

The shared rules are in [`docs/ux-principles.md`](../../../docs/ux-principles.md#scale). In the PPM:

- **A list of people** uses a searchable multi-select (`PeoplePicker` as a form field, `PickerMenu` with `multiple` as a chip), never a row of chips. Meeting guests and project members moved to it on 2026-10-07.
- **A view that fills up** shows what fits and folds the rest behind "N more" or "+N", which opens the full list: a month day's tasks, entries that overlap, a day's due tasks. Never slivers, and never one cell running into the next.
- **Still to do:** the Filter menu's people and projects have no search yet ([backlog](../backlog.md), item 31), and Team day shows a column per person, which scrolls sideways for a large team.

## Before you call it done

The shared list is in [`docs/ux-principles.md`](../../../docs/ux-principles.md#before-you-call-it-done). In the PPM, "every role" means super admin, admin and staff, with clients kept out, and "dark and light" always applies.
