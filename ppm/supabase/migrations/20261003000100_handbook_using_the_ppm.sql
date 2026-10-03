-- The Handbook's "Using the PPM" shelf: short, step-by-step articles on the new PPM.
-- Written 2026-10-03 from docs/handbook-drafts/, checked against the app (shortcuts from
-- src/components/app/shortcuts.tsx, statuses and sign-off rules from src/domains/tasks/config.ts,
-- private tasks and sign-off requests from the database functions).
--
-- Data only, and safe to run more than once: the shelf and each article are added only if
-- their slug isn't there yet, so edits made in the app are never overwritten.

insert into public.kb_categories (slug, title, blurb, color, sort)
values ('using-the-ppm', 'Using the PPM', 'How to plan, assign and finish work in the PPM, one task per article.', '#0464DD', 1)
on conflict (slug) do nothing;

with shelf as (select id from public.kb_categories where slug = 'using-the-ppm')
insert into public.kb_articles (category_id, slug, title, summary, body, status, owner, keywords)
select shelf.id, a.slug, a.title, a.summary, a.body, 'ready', 'PPM team', a.keywords
from shelf, (values

('ppm-statuses', 'What each status means',
 'Six statuses, one rule each, so everyone reads a board the same way.',
$md$Every task has one status. Each one answers a single question: where is this work right now?

| Status | Means | Move it here when |
|---|---|---|
| **Backlog** | Worth doing, not planned yet | You capture an idea or a request |
| **Todo** | Planned and ready to start | It has an owner and you mean to do it soon |
| **In progress** | Someone is working on it | You start |
| **In review** | Done, waiting for a check | Someone else needs to sign it off |
| **Done** | Finished and accepted | The work is complete |
| **Cancelled** | Not doing it | Plans changed; the history stays |

## To change a status

1. Open the task, or hover over it in a list.
2. Choose **Status** and pick the new one. On the board, you can also drag the card to another column.

## Habits that keep the board honest

- Keep **In progress** small. If you have more than three, finish one first.
- If you can't mark a task done yourself, move it to **In review** (see *Who can mark a task done*).
- Never delete work you did. Cancel it instead, so the history stays.$md$,
 'status backlog todo in progress review done cancelled board'),

('ppm-create-and-assign', 'Creating and assigning work',
 'Give every task one owner, and see who has room before you assign it.',
$md$A task has exactly one assignee: the person who will move it to done. If two people share the work, split it into two tasks.

## Create a task

1. Press **C** anywhere (or use **+ New task**).
2. Type a title. Add the project, assignee, due date and priority if you know them.
3. Press **⌘ Enter** (Ctrl Enter on Windows) to create it. Turn on **Create more** to add several in a row.

## Assign it

1. Open the task, or hover over it in a list.
2. Choose **Assignee**. The list shows how many open and late tasks each person has, so you can see who has room.
3. The person is notified in their inbox, and by email.

In a list, move to a task with **J** and **K** and press **I** to assign it to yourself.

## When the work changes hands

Reassign the task. The history keeps who had it before, and the new assignee is notified.$md$,
 'create new task assign assignee owner workload reassign'),

('ppm-who-can-mark-done', 'Who can mark a task done',
 'Each task says who signs it off: anyone, someone other than the assignee, the assigner, the reviewer, or chosen people.',
$md$Some work is finished when the person doing it says so. Some needs a second pair of eyes. Each task carries its own rule, under **Sign-off** in the task panel. The database enforces it.

| Rule | Who can mark it done |
|---|---|
| Anyone | Anyone on the team, including the assignee. This is the default |
| Not the assignee | Anyone except the person doing the work |
| The assigner | Only the person who assigned it |
| The reviewer | Only the person named as **Reviewer** |
| Chosen people | Only the people you pick |

## Set the rule

1. Open the task and choose **Sign-off**.
2. Pick a rule. For **The reviewer**, also set **Reviewer**. For **Chosen people**, pick at least one person under **Signed off by**: the rule isn't saved until you do.

You can also set it when you create the task.

## When you can't mark it done

Move the task to **In review**. If the rule names someone (the assigner, the reviewer, or the chosen people), they're notified and asked to sign it off.

## Admins

Admins can sign off any task in someone's place, so nothing gets stuck when a reviewer is away. The button reads **Sign off as admin**, and the history records whose sign-off it replaced.$md$,
 'sign off signoff approve review reviewer done mark complete rule chosen people assigner admin'),

('ppm-repeating-tasks', 'Repeating tasks',
 'Work that comes back on a schedule: finish one and the next is made for you.',
$md$## Make a task repeat

1. Open the task (or create one) and choose **Repeats**.
2. Pick **Every day**, **Every weekday**, **Every week**, **Every two weeks** or **Every month**.
3. Give it a due date: the next one is due that far after it.

## What happens when it's done

When you mark it done, the next one is created straight away, with the same assignee, sign-off rule and project, and its checklist unticked. The panel tells you when the next one will be due.

To stop it repeating, set **Repeats** back to **Doesn't repeat**.$md$,
 'repeat recurring every day weekly monthly routine schedule'),

('ppm-private-tasks', 'Private tasks',
 'Use the PPM as your own to-do list too.',
$md$## Make a task private

1. When you create a task, switch **Visible to the team** to **Private**.
2. Only you and its assignee can see it. It still shows on your home screen and calendar.

## Who can change it

Only the person who created a task can make it private or visible again. The database refuses anyone else, admins included.$md$,
 'private personal hidden visibility todo'),

('ppm-planning-your-day', 'Planning your day on the calendar',
 'Block time for your tasks, see the team''s day, and keep private things private.',
$md$The calendar replaces the schedule we used to post in the group chat.

## Plan your day

1. Open **Calendar**, on **My week**.
2. Drag down an empty slot to block time. Name it, or link it to a task.
3. Drag a block to move it, or drag its bottom edge to change when it ends.

Tasks with a due date show at the top of their day. Meetings you're invited to appear on your calendar by themselves.

## Who sees what

Each block has a visibility:

- **Public:** the team sees the title and the time.
- **Busy:** the team sees that you're busy, not what it is.
- **Private:** only you see it.

You can also hide a whole day, as busy or private.

## Ticking it off

Tick a block off when you've done it, or turn on **Tick it off automatically** and it counts as done once its time has passed. The line under each day shows how much of your plan is done.

## Share your plan

**Copy my plan** puts your day on the clipboard for the team chat: public blocks by name, busy ones as "Busy", private ones left out.

**Team day** shows everyone's plan side by side.$md$,
 'calendar plan day block time meeting busy private public schedule copy'),

('ppm-keyboard-shortcuts', 'Keyboard shortcuts',
 'Everything you do often has a key. Press ? anywhere to see them.',
$md$None of these fire while you're typing in a field.

| Key | Does |
|---|---|
| **⌘ K** (Ctrl K) | Search, or run any command |
| **C** | Create a task |
| **G** then **H** | Go home |
| **G** then **I** | Go to the inbox |
| **G** then **M** | Go to my tasks |
| **G** then **T** | Go to all tasks |
| **G** then **C** | Go to the calendar |
| **G** then **P** | Go to projects |
| **G** then **E** | Go to people |
| **G** then **A** | Go to the activity log |
| **G** then **B** | Go to the handbook |
| **J** / **K** | Move down and up a list |
| **Enter** | Open the selected task |
| **X** | Select the task, for changing several at once |
| **I** | Assign the selected task to yourself |
| **Esc** | Close the panel or clear the selection |
| **⌘ Enter** | Save: create a task, post a comment |

Press **?** anywhere to see this list in the app.$md$,
 'keyboard shortcuts keys hotkeys command menu search')

) as a(slug, title, summary, body, keywords)
on conflict (slug) do nothing;
