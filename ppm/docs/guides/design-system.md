# The design system

How the PPM looks and behaves, and why, so new screens look like they were always there. Everything visual comes from one stylesheet, `src/app/globals.css`, and a small set of components. Checked against the code on 2026-10-06.

## Principles

1. **A dashboard, not a website.** Dense enough to work in all day, calm enough to read at a glance. The references were Linear's app and dashboard designs in the same spirit ([references](../references/README.md)).
2. **Calm by default; colour means something.** Most of the screen is neutral. Colour appears only where it carries meaning: a status, a warning, the one primary action.
3. **Dark first.** Dark is the primary theme; light follows the same structure, token for token. Both are checked.
4. **Every value is a token.** Components use names like `bg-surface` or `text-fg-2`, never a raw colour. Change the token, and the whole app follows.
5. **Motion explains, never decorates.** Short, purposeful, and absent where it would slow people down.

## Never

- Gradients, emojis, illustrations, or cards inside cards.
- "Pill" badges and pulsing effects to grab attention.
- Raw colour values, or one-off sizes, in a component.
- A new UI or animation library for something plain HTML and CSS can do (the repository's `CLAUDE.md` explains why: a menu once took the old PPM down).
- RTC green for anything but "done" (see "Colour").

## Colour

Each token has one meaning. Use it for that meaning, and only that.

| Token | Means | Used for | Not for |
|---|---|---|---|
| `canvas`, `surface`, `surface-raised`, `surface-inset` | Layers, from the window frame inwards | The frame behind the app; the main sheet; menus and dialogs; wells inside a surface | Signalling anything |
| `hover`, `selected` | Interaction | The row under the pointer; the chosen row, tab or item | Status |
| `line`, `line-strong` | Edges | Dividers and borders; `line-strong` for inputs and a hovered card | Emphasis |
| `fg`, `fg-2`, `fg-3`, `fg-4` | Text, from primary to faint | Titles and values; secondary text; labels and metadata; placeholders | `fg-4` for anything people must read: it's below the 4.5 to 1 contrast that body text needs |
| `brand`, `brand-solid`, `brand-soft` | RTC blue: "act here" or "this is on" | Links, focus rings, the primary button (`brand-solid`), active backgrounds (`brand-soft`), switched-on chips (`border-brand/50`, like Repeat, Private or a chosen template) | Decoration |
| `navy` | RTC navy | Brand moments, like the logo | Interface states |
| `danger`, `danger-soft` | Something is wrong, or can't be undone | Errors, overdue dates, destructive buttons | Warnings |
| `warning` | Time and risk | Due today, a project at risk, more work than the load limit, someone invited who hasn't signed in, draft articles, paused projects | Form validation: an empty required field is not a risk (the lesson of the "Chosen people" chip, [report](../reports/2026-10-04-session-report.md#the-chosen-people-orange-border)) |
| `success` | Done | Rare: a finished state | Generic "good" |
| `status-backlog` … `status-cancelled` | The six task statuses | Status icons and markers only | Anything else |
| `priority-urgent` | Urgent priority | The urgent priority icon | Warnings |
| `chart-1` … `chart-5`, `chart-track` | Charts | Bars, rings and progress, RTC blues first | Interface states |
| `cal-teal`, `cal-purple`, `cal-pink`, `cal-slate` | A colour someone chose for a time block | A block's edge and tint, and its bar in lists; the usual blue is `brand` | Anything else. There's no green, amber, red or orange among them on purpose: those already mean done, time and risk, errors and urgent. Meetings keep `status-in-review` |

**Why green is rare:** RTC's brand has navy, blue and green. Kyan asked for more blue and less green, so the blues lead and green keeps one meaning, "done".

**Contrast:** every text token people must read meets WCAG AA (4.5 to 1) on its surfaces, in both themes (measured 2026-10-02). If you change a colour, measure again.

## Type

- **Inter,** loaded through `next/font`, with its optical sizes and the stylistic sets `cv01`, `cv09`, `cv11` and `ss03`, which make it read more crisply.
- **A tight scale,** set in `@theme`: `text-2xs` (11 px) to `text-3xl` (30 px). Most of the interface is `text-sm` (13 px) and `text-xs` (12 px). Page titles in the header are `text-sm` in medium weight, beside the page's icon; the home greeting (`text-2xl`) is the largest text in the app.
- **Numbers line up:** the `tabular` utility gives figures equal widths, for counts, dates and times.
- **Task keys** (`RTC-12`) are in the monospace font.

## Space, density and shape

- **Density "in between":** not a spreadsheet, not roomy. List rows are 36 to 40 px (`h-9`, `h-10`), toolbar controls and chips 28 px (`h-7`), and spacing follows a 4 px grid.
- **Radius** from tokens: most controls and menu items `rounded-md` (7 px); larger surfaces get larger radii, up to `rounded-xl` for dialogs.
- **Elevation:** floating things (menus, popovers, dialogs, toasts) use `shadow-popover`; the main sheet uses `shadow-sheet`. Rows have no shadow. Board cards have a 1 px ring that strengthens on hover.

## Motion

The rules come from Emil Kowalski's design engineering ([references](../references/README.md)):

- **Easing tokens:** `ease-out` for things that appear, `ease-in-out` for things that move, `ease-drawer` for the task panel.
- **Durations:** a press 160 ms; tooltips 125 ms, and instant once one is open; menus and popovers 160 ms (100 ms to close); dialogs 200 ms (120 ms to close); the panel 280 ms.
- **Utilities, in `globals.css`:** `ui-popup`, `ui-tooltip`, `ui-dialog`, `ui-backdrop`, `ui-panel`, and `pressable`, which shrinks a button to 97 % while it's pressed.
- **Popovers grow from their trigger;** dialogs from the centre. Nothing starts from zero size: start at 95 %, with opacity.
- **No animation for keyboard actions.** The command menu (⌘K) appears instantly: it's used too often to wait for.
- **Transitions, not keyframes,** so a quick open-close-open never restarts. Animate `transform` and `opacity` only.
- **Reduced motion is respected,** in the stylesheet and in the panel (`useReducedMotion`).

## Icons and images

- **Hugeicons** (the free set), always through the `Icon` wrapper in `src/components/app/icon.tsx`, usually at 13 to 16 px.
- **People** are shown by `Avatar` (`src/components/app/avatar.tsx`): their photo, or their initials on a tint chosen from their id, so it's the same everywhere.

## Components: which one for what

Components live in three places:
- `src/components/ui/`: building blocks from shadcn on Base UI, restyled to our tokens (button, dialog, dropdown menu, popover, tooltip, select, switch, tabs, sheet, toast and more).
- `src/components/app/`: app-wide pieces: the shell and sidebar, the page frame (`PageHeader`, `PageToolbar`, `PageBody`, `Section`, `EmptyState`, `Kbd`), `ModalShell`, `Avatar`, `Icon`, the charts (`BarChart`, `StackedBar`, `Progress`, `Ring`), the command menu, shortcuts, and `PasswordInput`.
- `src/domains/<area>/components/`: pieces that belong to one business area.

Choosing:

| You need | Use | Example |
|---|---|---|
| Pick one value from a list | `PickerMenu` (`src/domains/tasks/components/pickers.tsx`): search, arrow keys, Enter, a hint in its footer | Status, priority, assignee, project |
| Pick several | `PickerMenu` with `multiple`, showing photos and names; it clears its search after each choice | Chosen people who may sign off |
| Pick several people, as a form field | `PeoplePicker` (`src/domains/people/components/people-picker.tsx`): who's chosen as photos and names in the field, a searchable list behind it, chosen people first when it opens | Meeting guests, project members |
| More than fits | Show what fits, then "N more" or "+N", which opens the full list | A busy day in the month view, crowded hours, a day's due tasks |
| Actions on one thing | `DropdownMenu` behind a ⋯ button | A task's or a project's menu |
| A few fields or details, anchored to something | `Popover` | A calendar entry's details |
| A focused decision, or a short form | `ModalShell` (`src/components/app/modal.tsx`) | Invite, Deactivate, Delete project |
| Make something in another form, without a second dialog | A switch in the dialog's footer that changes what it saves; the main button says what it will do | Save as template, in the new-task dialog and Plan time |
| Look at or edit a task | The side panel: no page load | Click any task |
| Make a task | The create dialog (press C) | |
| Tell people it worked | A toast (`sonner`), with **Undo** when the action can be undone | "Task deleted. Undo" |
| A main action with quick variants | A split button: `splitButton()` in `src/components/app/split-button.tsx`, one shape, one hairline, each part lighting up on its own | Plan time, with templates under the arrow; Copy my plan, with how it reads |

Two rules learned the hard way:
- **A menu's label must sit inside the group it names** (`DropdownMenuLabel` inside `DropdownMenuGroup` or `DropdownMenuRadioGroup`). Outside one, Base UI throws and the screen goes down. `npm run test:menus` catches it.
- **Single-choice menus close after a choice.** The radio item does this by default; don't turn it off.

## States

| State | Looks like |
|---|---|
| Hover | `bg-hover` |
| Selected, current | `bg-selected` |
| Switched on (a chip or toggle) | `border-brand/50` and `text-fg` |
| Keyboard focus | A visible 2 px ring in `brand` |
| Disabled | Reduced opacity; never hidden if people need to know it exists |
| Saving | The button's own text changes ("Saving…"); no overlay spinners |
| Empty | `EmptyState`: a title, one sentence, and the next action |
| Error | `danger`, at the field, with one plain sentence on what to do |

## Forms

- **Fill in what you can.** Sensible defaults, the current context (a project page fills in the project), the last choice where it helps.
- **Validate when someone tries to submit,** or leaves a field, not while they're still choosing. Show the error at the field in `danger`, with one sentence, and move focus there. Toasts are for results, not for field errors.
- **Buttons say what they do:** "Send invitation", "Add to calendar", "Delete project and 2 tasks".
- **Things that can't be undone ask first,** in a dialog that says exactly what goes. Small deletes can confirm in place: the button turns red and reads "Delete" for a few seconds.

## Copy

The interface talks like a helpful colleague: plain, short and kind. Sentence case everywhere. Verbs on buttons. Dates as "Today", "Tomorrow", "Mon" or "Oct 9", in Manila time. Errors say what to do next ("Only Kenneth can mark it done. Move it to In review instead."). No exclamation marks, no jargon, no emojis.

## Accessibility

- Contrast meets WCAG AA in both themes (above).
- Everything works by keyboard: rows, cards and chips are reachable by Tab and open with Enter; focus is always visible; icon buttons have labels.
- Touch is respected: scrolling a list or the calendar never starts a drag by accident.

## Design tools in this repository

This page and the tokens in `globals.css` decide the PPM's look. A general design skill or library brings its own styles, palettes and fonts, and none of them overrides the system. The repository includes one such skill, `ui-ux-pro-max` (in `.claude/skills/`, since 2026-07-22), which tells sessions to generate a fresh design system for new pages: don't, for the PPM. If an outside source suggests something better, propose it as a change to the system (below).

## Changing the system

1. Change the token in `globals.css`, in **both** themes.
2. Measure contrast again if it's a colour.
3. Look at every screen that uses it, in dark and light.
4. If a token's **meaning** changes, record a decision in [`../decisions/`](../decisions/) and add an entry to [`../log.md`](../log.md). A new value with the same meaning only needs the log.
