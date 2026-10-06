# UX principles for every app

How anything we build should feel to use, in every app in this repository: the public site, the PPM and the client portal. UI and UX are among the first things we weigh in any change, alongside correctness and security. Each app keeps its own look (the PPM's is in [its design system](../ppm/docs/guides/design-system.md)), but these principles are shared. The PPM's guide adds its own patterns on top ([ppm/docs/guides/ux-principles.md](../ppm/docs/guides/ux-principles.md)), and the mindset behind them is in [how-we-work.md](how-we-work.md).

## Designing anything

Before building, answer these, in order:

1. **What's the job to be done?** Who does it, how often, and why. Write it as a sentence: "When I start my outreach for the day, I want the usual task set up the usual way, in a moment."
2. **What do good products do?** A quick look, not a research project. That's the floor.
3. **What do our people actually do?** The team, a client, a visitor to the site. Design for that, beyond the floor.
4. **Where does it live?** Use a place that already exists before adding a new page, dialog or window.
5. **What's the fewest-step path for the common case?** Count the clicks, before and after.
6. **What happens at ten times the size?** Ten times the people, projects, posts or data (see "Scale").
7. **Who may do it?** Decide the rule, then enforce it on the server or in the database, never only by hiding a button.
8. **What are its states?** Empty, loading, error, refused, done.

## The principles

### Fewest clicks, without losing power
The common path takes the fewest steps, and a sensible default beats a question. Power stays within reach for those who want it: keyboard shortcuts, search, filters.

### Instant, then right
Show a change at once, and roll it back with the reason if the server refuses it. Avoid spinners: keep the old content until the new arrives, or change the button's own text ("Saving…").

### Undo over "are you sure?"
What can be undone just happens, with Undo in the confirmation. Ask first only when it can't be undone, or when it notifies other people.

### Rules explain themselves
When something isn't allowed, say why and what to do instead. A refusal that looks like a bug costs everyone time.

### Defaults that are already right
Fields start filled in sensibly, from what the person is doing and where they started.

### Errors at the field, at the right moment
Check when someone tries to submit, not while they're still typing, and show the problem next to the field.

### Phones can follow
Every app works at phone width. Desktop first is fine for the PPM and the portal, as long as nothing breaks on a phone.

### Speed is a feature
No waiting that isn't needed: no splash screens, no animation on things used a hundred times a day, and no image or script that doesn't earn its weight.

### Accessible to everyone
Text contrast meets WCAG AA, everything works by keyboard with a visible focus, every control has a label, and motion respects the "reduce motion" setting.

### Consistent within its app
Use the app's existing components, colours and patterns before adding new ones. Consistency is a feature.

## Scale

Design for the team and the clients you'll have, not only the ones you have.

- **Lists of people or things** need search, and show photos and names compactly. A picker that shows everyone as a chip works for five people and fails for fifty, or for long names; a searchable multi-select works for both.
- **Long text** truncates, with the full text on hover, and never pushes a layout apart.
- **Counts grow:** a list of 3 and a list of 300 both need to work, and so does an empty one.

## Before you call it done

- Every state works: empty, loading, error, refused, done.
- It works by keyboard, at desktop and phone width, and in dark and light where the app has both.
- It works for every role that can reach it, and stays closed to those who can't.
- The click count for the common path is as low as it can be.
- The docs say what changed.
