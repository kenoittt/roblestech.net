# How the PPM should feel to use

The product-design principles behind the PPM, each with where it shows. Use them when you design anything new, and when you judge whether something is finished. The mindset behind them is in the repository's [`docs/how-we-work.md`](../../../docs/how-we-work.md); the look is in [design-system.md](design-system.md).

## Designing a feature

Before building, answer these, in order:

1. **What's the job to be done?** Who does it, how often, and why. Write it as a sentence: "When I start my outreach for the day, I want the usual task set up the usual way, in a moment."
2. **What do good tools do?** Linear, Asana, Notion, Trello: a quick look, not a research project. That's the floor.
3. **What does this team actually do?** Design for that, beyond the floor.
4. **Where does it live?** Use a surface that already exists (the panel, the create dialog, a ⋯ menu, the command menu) before adding a new page, dialog or window.
5. **What's the fewest-step path for the common case?** Count the clicks, before and after ([an example](../reports/2026-10-04-session-report.md#click-counts-for-the-outreach-routine)).
6. **What happens at ten times the size?** Ten times the people, projects or tasks (see "Scale" below).
7. **Who may do it?** Decide the rule, then enforce it in the database ([database.md](database.md)).
8. **What are its states?** Empty, loading, error, refused, done.

## The principles

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

Design for the team you'll have, not only the one you have.

- **Lists of people or projects** need search, and should show photos and names compactly. A picker that shows everyone as a chip works for five people and fails for fifty, or for long names. Use a searchable multi-select (`PickerMenu` with `multiple`) instead.
- **Long text** truncates with the full text on hover, and never pushes a layout apart.
- **Counts can grow:** a column of 3 cards and a column of 300 both need to work; so do zero.

A known example to fix: the meeting attendee picker in the calendar shows every teammate as a chip ([backlog](../backlog.md)).

## Before you call it done

- Every state works: empty, loading, error, refused, done.
- It works by keyboard, in dark and light, at desktop and phone width.
- It works for every role: super admin, admin and staff (and clients are kept out).
- The click count for the common path is as low as it can be.
- The docs say what changed ([workflow.md](workflow.md)).
