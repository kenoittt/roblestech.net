# Audit: text that explains how things work

Kyan asked for this on 2026-10-13, after having one such line removed from the calendar: "We actually have a bunch of text like these in the system explaining the behavior of things. I don't like it. It's unnecessary and it takes up precious space." This lists every one found, by Kyan's Claude, the same day. **Nothing here has been removed or changed.** Each row has a suggestion and an empty "Your call" for Kyan.

**The one already removed** (2026-10-13, in `domains/calendar/components/calendar-page.tsx`): "Each person decides what you see. Dashed blocks show only that they're busy." It sat at the right of the Team day toolbar; the date and Copy my plan sit there now. A dashed block still explains itself when it's opened ("Christian Panes shares only that they're busy.").

## How it was done

- **Scope:** the PPM's interface, `ppm/src/`. Not the emails it sends, the Handbook's articles (written in the app), or the other apps.
- **Method:** every piece of text was pulled out of the source with TypeScript's own parser (780 pieces of three words or more, in 136 files) and read one by one, with the code around it, to see where and when it shows. A search for a pattern would have missed the ones built from several parts.
- **What counts:** a sentence that explains how something behaves, or what something is for. Not a label, a button, a count, a date, or a message about something that just happened.
- **Sources** are paths inside `ppm/src/`. **Line numbers** are from the branch `kyan/fix/ppm-calendar-blocks-and-plan` on 2026-10-13. They drift as files change; the quoted text is what to search for.

## In one page

| Kind | How many | What they cost | Suggested |
|---|---|---|---|
| 1. Always on screen | 20 | Room on a main screen, all day, whether or not anyone needs them | Remove 11, shorten 5, keep 4 |
| 2. On screen while a dialog, menu or popover is open | 18 | Height in a small window, but only once it's opened | Remove 7, shorten 5, keep 6 |
| 3. Only when a list is empty | 12 | Nothing once there's data | Keep; trim two |
| 4. Hover text and placeholders | About 40 | No room at all | Keep. It's where an explanation can go instead |
| 5. Messages that appear for a few seconds | About 15 | A few seconds | Keep; two could lose a sentence |
| 6. Rules, refusals, warnings before something permanent, errors | Over 100 | Shown only when they apply | Keep: the design asks for them |

Kinds 1 to 3 are listed one by one below. Kinds 4 to 6 are described and counted roughly, since the suggestion for each is to leave them.

The first kind is the one Kyan described. If only one table gets a decision, it should be that one.

**One was wrong, not only wordy, and is gone too:** Settings said emails were "Sent through RTC's Microsoft 365 once this is live." The PPM has been live since 2026-10-03, so Kyan had it removed the same day. It isn't in the tables below.

**A pattern behind kind 1:** every section on Settings and most on Home has a line under its title because the components make it easy, and on Settings require it (`Block` in `domains/people/components/settings-page.tsx` requires a `description`). If these go, make the description optional, so the next section doesn't grow one out of habit.

## 1. Always on screen

The same kind as the line already removed: on a main screen, whether or not anyone needs it.

| # | Where it shows | The text | Source | Suggestion | Why | Your call |
|---|---|---|---|---|---|---|
| 1 | Calendar, My week: the foot of the "To plan this week" rail, three lines | "Drag down an empty part of a day to block time. Tasks show here once they have a due date." | `domains/calendar/components/calendar-page.tsx:474` | **Remove** | The closest relative of the one already removed. The pointer changes over your own days, and Plan time does the same job | |
| 2 | Calendar, My week: under the rail's heading | "Your tasks due by Sunday with no time set aside." | `domains/calendar/components/calendar-page.tsx:452` | **Keep, or shorten to "Due by Sunday, no time set aside"** | It's the list's definition: the heading alone doesn't say why a task is in it | |
| 3 | A task list's calendar view (All tasks, My tasks, a project): the right of its toolbar, when some tasks have no date | "4 open tasks have no due date and don't show here" | `domains/tasks/components/task-calendar.tsx:109` | **Shorten to "4 with no due date"** | The count is information; the rest explains. It sits in the same place the calendar's hint did | |
| 4 | Home: under "The team" | "Who has what, what's late, and how the projects are doing." | `domains/dashboard/components/home-dashboard.tsx:114` | **Remove** | The sections under it have their own titles | |
| 5 | Home, Workload: under the title | "Open tasks per person. The line marks 8, where it gets busy." | `domains/dashboard/components/home-dashboard.tsx:348` | **Keep, or move to hover on the line** | It's the chart's legend: without it the line on each bar means nothing | |
| 6 | Home, Finished: under the title | "Tasks the team completed in the last 14 days" | `domains/dashboard/components/home-dashboard.tsx:422` | **Shorten to "Last 14 days"** | The period is information; the rest repeats the title | |
| 7 | Home, Projects: under the title | "Progress and health of everything active" | `domains/dashboard/components/home-dashboard.tsx:447` | **Remove** | Repeats what the title and the bars show | |
| 8 | Home, Recent activity: under the title | "The latest moves across the workspace" | `domains/dashboard/components/home-dashboard.tsx:540` | **Remove** | Repeats the title | |
| 9 | Home, Waiting on you: under the title, when something is waiting | "Tasks only you can sign off" | `domains/dashboard/components/home-dashboard.tsx:312` | **Remove** | The title says it | |
| 10 | Handbook, front page: under the title, two lines | "How RTC works: procedures, pricing, tools and quick answers. Each article says whether it's settled, still a draft, or not written yet." | `app/(app)/handbook/page.tsx:23` | **Shorten to the first sentence, or remove** | The second sentence explains the status marks, which name themselves | |
| 11 | People: under the table, three columns of small text | "Super admin: Everything an admin can do, plus making, changing and removing admins. Admin: Invites staff, changes their roles, deactivates them, and manages every project. Staff: Creates, assigns and finishes tasks, plans their calendar, and manages projects they own." | `domains/people/components/people-page.tsx:304` | **Remove** | The largest block of standing explanation in the PPM. The role menu and the invite dialog already describe each role in a line, where the choice is made | |
| 12 | Task panel, Files: when a task has no files, which is most tasks | "Drop files here, up to 25 MB each." | `domains/tasks/components/task-files.tsx:140` | **Remove** | The Attach button is beside it, and a file that's too big already says so | |
| 13 | A project's page: a band across the top, when it's archived | "This project is archived. It's hidden from the sidebar, the portfolio and the project pickers; nothing in it has changed." | `domains/projects/components/project-page.tsx:95` | **Shorten to "This project is archived."** | The state matters, and Restore sits beside it. Where it's hidden is what archiving means | |
| 14 | Settings, Profile: under the title | "How you appear to the team." | `domains/people/components/settings-page.tsx:83` | **Remove** | The fields are Name and Title | |
| 15 | Settings, Appearance: under the title | "Follows your computer unless you choose." | `domains/people/components/settings-page.tsx:99` | **Remove** | The System choice says it | |
| 16 | Settings, Notifications: under the title | "The inbox always collects everything; email is optional." | `domains/people/components/settings-page.tsx:123` | **Remove** | Turning email off already answers with "Emails off. The inbox still collects everything." | |
| 17 | Settings, Templates: under the title, two lines | "Tasks and calendar entries you make again and again, ready in a couple of clicks. Yours first, then the team's." | `domains/people/components/settings-page.tsx:133` | **Remove** | The two lists under it are titled Tasks and Calendar | |
| 18 | Settings, Password: under the title | "At least 10 characters. Nobody else, admins included, ever sees it." | `domains/people/components/settings-page.tsx:138` | **Shorten to "At least 10 characters."** | The length is a rule the form enforces, so it's better known before typing | |
| 19 | Sign-in page: under the title | "Tasks, projects and the team calendar, in one place." | `app/(auth)/login/page.tsx:15` | **Keep** | A page people see once a day at most, with nothing competing for the room | |
| 20 | Sign-in page: under the form | "New here? Ask an admin to invite you. The invitation email sets your password." | `domains/auth/components/login-form.tsx:63` | **Keep** | The only way in for someone without an account, said where they get stuck | |

Not listed, because they report a state and explain nothing: "3 planned", "5 past their due date", "Nothing is late", "2h of 7h done". Also not listed: "Local preview with sample data." under the sidebar, which only a local copy shows.

## 2. On screen while a dialog, menu or popover is open

These cost height in a small window, but only for someone who opened it.

| # | Where it shows | The text | Source | Suggestion | Why | Your call |
|---|---|---|---|---|---|---|
| 21 | Plan time, Who sees it: one line under the three choices, changing with the choice | "The team sees the title and the time. / The team sees that you're busy, not what it is. / Only you see it. (For a meeting, also: People in the meeting always see it.)" | `domains/calendar/components/event-dialog.tsx:513` | **Keep** | The UX guide asks for it: "Say what others will see wherever privacy is chosen" | |
| 22 | Plan time, a meeting: under Who's invited | "It appears on their calendars, and they get a notification. (In a template: They're invited each time the template is used, once you've had a look.)" | `domains/calendar/components/event-dialog.tsx:492` | **Remove** | The button already reads Send invites | |
| 23 | Plan time, a block: under "Tick it off automatically" | "When its time has passed, it counts as done." | `domains/calendar/components/event-dialog.tsx:522` | **Fold into the label: "Tick it off when its time has passed"** | One line instead of two | |
| 24 | Plan time and the new-task dialog, saving a template: under "Share with the team" (two places in Plan time) | "Everyone can use it; only you, or an admin, can change it." | `domains/calendar/components/event-dialog.tsx:538, 674` | **Keep, or move to hover** | It's a permission rule. The new-task dialog already keeps the same sentence as hover text | |
| 25 | An entry's Edit dialog, Save as template: a paragraph in the small window | "Keeps the title, 9 AM to 10 AM, who sees it and the notes. Not the day or a linked task." | `domains/calendar/components/event-dialog.tsx:680` | **Remove** | The window is a name, a switch and a button without it | |
| 26 | Copy my plan's options: under the title | "Saved for next time, on any computer." | `domains/calendar/components/copy-plan.tsx:99` | **Remove** | People find out the next time they copy | |
| 27 | All tasks, the Display menu: its last line | "Saved for you, on this screen." | `domains/tasks/components/task-explorer.tsx:452` | **Remove** | The same | |
| 28 | Calendar, the week's privacy menu: a second line under each choice | "Each entry's own setting applies / Times show; titles and details don't / Your week is hidden from the team" | `domains/calendar/components/calendar-page.tsx:327` | **Keep** | Privacy again, and only while the menu is open. The day's menu offers the same three without them, so they could go | |
| 29 | An entry's details on the calendar: a faint line | "The team can see this. / The team sees only that you're busy. / Only you can see this. (Others' entries: Christian Panes shares only that they're busy.)" | `domains/calendar/components/time-grid.tsx:498` | **Keep the busy and private ones; remove "The team can see this."** | With the toolbar hint gone, this is where a dashed block explains itself. The usual case needs no line | |
| 30 | Task panel, Repeat: the foot of the picker | "When it's done, the next one is made for you, due Oct 20. (With no date yet: When a repeating task is done, the next one is made for you.)" | `domains/tasks/components/task-panel.tsx:503` | **Shorten to "Next one due Oct 20"; remove the other** | The date is information | |
| 31 | Task panel, Sign-off: the foot of the picker | "Anyone on the team, including the assignee (the chosen rule's description)" | `domains/tasks/components/task-panel.tsx:536` | **Remove** | Each option already shows its description on hover | |
| 32 | Task panel, the description while it's being edited | "Saves when you click away. ⌘ Enter to finish." | `domains/tasks/components/task-panel.tsx:674` | **Keep, or shorten to the keys** | There's no Save button, so this is the only sign that it saves | |
| 33 | New task and Plan time, Templates: the foot of the picker | "Fills in the task; change anything before you create it. Manage templates in Settings. / Fills in the entry. A time you dragged on the calendar stays. Manage templates in Settings." | `domains/templates/components/template-pickers.tsx:75, 115` | **Remove** | Choosing one shows what it does, at once | |
| 34 | People, Invite someone: the dialog's first line | "They get an email with a link to set their password. Nobody else ever sees it." | `domains/people/components/people-page.tsx:353` | **Shorten to the first sentence** | It says what Send invitation will do | |
| 35 | People, the role menu and the invite dialog: a line under each role | "Everything, including making admins / Manages people, projects and all work / Works on tasks and projects" | `domains/workspace/types.ts:30` | **Keep** | They define the choice, where it's made. They're why the block under the table can go | |
| 36 | New project and Edit project: under Members | "The owner is always a member. Each person sets their own view; this is where new members start." | `domains/projects/components/project-form.tsx:155` | **Remove** | The owner shows in the field, locked, marked Owner | |
| 37 | Handbook, Shelves: under the title | "Shelves group the articles in the sidebar. Changes save as you go." | `domains/handbook/components/shelves-dialog.tsx:66` | **Shorten to "Changes save as you go."** | There's no Save button here either | |
| 38 | Import tasks: before a file is chosen | "Save your sheet as CSV. You'll see every row before anything is created, and nothing is saved until you say so. Columns: title (required), description, assignee_email, priority, status, due_date, project" | `domains/tasks/components/import-dialog.tsx:191` | **Keep** | Rare, and easy to get wrong: this is where instructions earn their place | |

Not listed: the keyboard shortcuts window (press ?). It's a help sheet, opened on purpose.

## 3. Only when a list is empty

The design system asks for these: an empty screen gets "a title, one sentence, and the next action" ([design system](../guides/design-system.md#states)). They cost nothing once there's data. **Suggestion: keep them all,** and trim the two longest (Settings, Templates), which give two ways to make a template and two ways to use one.

| # | Where | The text | Source |
|---|---|---|---|
| 39 | A task list with nothing in it | "No tasks here yet. Create one with C, or from the + on any group." | `domains/tasks/components/task-explorer.tsx:57` |
| 40 | My tasks, To sign off | "Nothing is waiting on you. Tasks you need to sign off appear here when they move to In review." | `domains/tasks/components/task-pages.tsx:142` |
| 41 | Inbox | "You're all caught up. When someone assigns you work, asks for your sign-off, comments or invites you to a meeting, it lands here." | `domains/inbox/components/inbox-page.tsx:76` |
| 42 | Activity | "Nothing happened here. Try a longer time range, or clear the filters." | `domains/tasks/components/activity-page.tsx:134` |
| 43 | Projects, and its Archived tab | "No projects here. Projects group tasks for a client or an internal goal. / Nothing is archived. Archive a project from its ⋯ menu to hide it everywhere without losing anything." | `domains/projects/components/projects-page.tsx:83` |
| 44 | A person's page | "Nothing assigned to Joshua. Assign a task from any list, or create one here. / Nothing on the calendar today." | `domains/people/components/person-page.tsx:98` |
| 45 | Home, Today | "Plan your day: block time for your tasks." | `domains/dashboard/components/home-dashboard.tsx:275` |
| 46 | Home, the greeting | "Nothing is due today. A good day to get ahead." | `domains/dashboard/components/home-dashboard.tsx:68` |
| 47 | Calendar, the rail | "Every task due this week has time set aside." | `domains/calendar/components/calendar-page.tsx:452` |
| 48 | Calendar, Plan time's arrow | "None yet. Save the time you plan often as a template, and it lands here in two clicks." | `domains/calendar/components/calendar-page.tsx:254` |
| 49 | Settings, Templates (two lists) | "None yet. Make one with New, or press C and turn on Save as template. Use one with C, then Templates, or from ⌘K. / None yet. Make one with New, or turn on Save as template in Plan time. Use one from the arrow beside Plan time." | `domains/templates/components/templates-settings.tsx:51, 71` |
| 50 | The Templates pickers | "No templates yet. To make one, turn on Save as template below." | `domains/templates/components/template-pickers.tsx:76, 116` |

## 4. Hover text and placeholders

These take no room: hover text shows when the pointer rests on something, and a placeholder goes when someone types. **Suggestion: keep them.** This is also where a kind 1 or kind 2 line can move when it's worth keeping but not worth its space.

- **On hover:** the six statuses' meanings and the five sign-off rules' (in their pickers, from `domains/tasks/config.ts`); "Private: only you and the assignee see it" on the lock in lists and the panel; in the new-task dialog, "Only you and the assignee will see it", "Everyone can use it; only you, or an admin, can change it" and "Saves a template for next time, and makes no task"; in Plan time, "Saves a template for next time, and adds nothing to the calendar"; "Who can mark this task done" on the panel's Sign-off label; an admin's note on a sign-off button ("Kenneth signs this off. As an admin you can too, and the history will say so."); and, new on 2026-10-13, a short calendar block's title and times.
- **Placeholders that explain:** "Search tasks, projects and people, or type a command", "Search every article, including the text inside them", "Leave a comment… Type @ to mention someone", "Add a description… Markdown works: lists, \*\*bold\*\*, links.", "Find one of your tasks, or name a new one…", "Agenda, a link, anything useful", "One or two sentences the team can read at a glance", "What they do, for example Content writer", "Add an item, then Enter", and the Handbook editor's hints for each field.

One thing to know before moving more there: hover text doesn't exist on a phone or for someone using the keyboard. A rule people must know can't live only on hover.

## 5. Messages that appear for a few seconds

Shown after something happened, then gone. **Suggestion: keep them.** Two teach more than they report, and could lose their second sentence:

- "Your plan is copied. Paste it in the group chat." (`domains/calendar/components/copy-plan.tsx:66`)
- "Saved … as a template. Use it from the arrow beside Plan time, or Templates when you drag out time." (twice in `domains/calendar/components/event-dialog.tsx`; the new-task dialog's reads "Use it from Templates when you press C, or from ⌘K.")

The rest say what happened to things the person can no longer see, which is worth a sentence: where an archived project went, what happened to a deleted project's tasks, that a template's tasks stay, that email is off but the inbox isn't.

## 6. Rules, refusals, warnings and errors

**Suggestion: keep all of these.** They aren't the kind Kyan described: they show only when they apply, and the UX guide asks for them ("Rules explain themselves": when something isn't allowed, say why and what to do instead; and anything that can't be undone asks first, in a window that says exactly what goes). Listed so the audit is complete:

- **Why you can't, and what to do instead:** "Only Kenneth can mark this done. Move it to In review." (the status picker and the board); "You're an admin. Only a super admin can make someone an admin." (People); "Pick at least one person. The rule changes once you do." (the panel); the answers a refused change to people or roles gets (in `domains/people/actions.ts`); "Templates aren't available yet: the database needs an update first."
- **Before something permanent:** the question a small delete asks in place ("Delete this block?", "Delete this meeting for everyone?", new on 2026-10-13); deleting a project ("The project, its members and its dates are removed for everyone. This can't be undone. To only hide it, archive it instead.", and what happens to its tasks either way), deactivating someone, deleting a Handbook article.
- **Errors at a field:** "Give it a title.", "It has to end after it starts.", "A template keeps one day: make it end by midnight.", the import's notes on each row.
- **Pages for when something's wrong:** a screen that didn't load, a page that doesn't exist, an account that can't use the PPM, a link that expired.

## If the suggestions were all taken

- **Always on screen:** 11 of the 20 go, 5 get shorter and 4 stay. Home loses four lines and shortens one; Settings loses four and shortens one; People loses its three-column block; the calendar's rail loses its foot.
- **In dialogs and menus:** 7 of the 18 go, 5 get shorter and 6 stay.
- **Nothing a rule depends on goes:** privacy lines, refusals, warnings and empty states stay.

## What a decision changes in the docs

The guides don't say today whether the interface may explain itself in standing text; they only say copy is "plain, short and kind". Whatever Kyan decides is worth one line in the design system's [Copy](../guides/design-system.md#copy) section, so later screens follow it. A suggestion for that line: *"No standing explanations. A screen shows labels, values and states; how something works is said on hover, in the place where it's chosen, or in the Handbook. The exceptions are privacy (say what others will see), rules (say why, and what to do instead), and anything that can't be undone."*
