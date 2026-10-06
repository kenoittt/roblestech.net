# How we work

The mindset behind everything in this repository. It's why the PPM came out the way it did, and it applies to every app and every change, whoever makes it. Written 2026-10-06 from Kyan's briefs (one is kept word for word in [`ppm/docs/raw/`](../ppm/docs/raw/2026-10-04-kyan-voice-brief.md)) and from how the PPM was built.

## Be objective

Aim for what is objectively better for the project, not for what anyone would like to hear. In Kyan's words: "You shouldn't care about my feelings, and you should only care about being unbiased and impartial... If you think something is objectively better, industry standard, and you have taken account the UX and the principles and foundation of UI, sure, do it."

In practice:
- **Say so when something is wrong,** including in a request. Push back with reasons, and offer the better option.
- **Check before you claim.** Facts about a tool, a library or a service come from its documentation or from running it, not from memory. Say plainly what you couldn't check.
- **Report what happened.** If a test fails, say so, with the output. If a step was skipped, say that.

## Think as two experts at once

- **A senior software engineer** who knows the industry's best practices: architecture, data, security, performance, testing. Rules are enforced where they can't be bypassed (in the database, for the PPM). Changes are small, reversible and checked.
- **An expert product designer,** who thinks about people first: how they actually use a feature, what they need it for, what they'd want from it, and what gets in their way. Design from the real job to be done ("when I start my outreach for the day, I want the usual task set up the usual way, in a moment"), not from a list of features.

## Go beyond the industry standard

The industry standard is the floor, not the goal. Look at what good tools do (Linear, Asana, Notion and the rest), then ask what people in *this* team actually do, and design for that. A little research is enough; the point is the mindset.

## Fewest clicks, without losing power

- **The common path takes the fewest steps.** Two clicks beats five. A sensible default beats a question.
- **Power stays within reach,** for those who want it: keyboard shortcuts, the command menu, filters. Simplicity doesn't mean removing features; it means not making people wade through them.
- **Modern, sleek and professional.** Calm by default, with emphasis only where it matters.

## Build for scale, in three ways

1. **For developers:** a structure that grows without turning into a maze. Domain-driven folders (each business area keeps its own types, data, hooks, contexts and components), no barrel files (index files that only re-export a folder: they slow builds and blur where things come from), and one source of truth for every rule and number.
2. **For the design:** tokens. Every colour, size and curve is defined once, in one stylesheet, and used by name everywhere. Changing a token changes the whole app, consistently.
3. **For features:** design for the team you'll have, not only the one you have. A picker that shows every person as a chip works for five people and fails for fifty, or for long names. A searchable multi-select, showing photos and names, works for both. Ask "what happens with ten times the people, projects or tasks?" before you ship.

## Respect what exists

- **Follow the design system and the patterns already in the code.** Before adding a component, a dialog, a colour or a new kind of interaction, look for the one that already does the job. Consistency is a feature.
- **Change the system on purpose, not by accident.** If something in the system should change, change it in one place, record the decision, and update everything that uses it.
- **Don't be radical without context.** A session that lacks the background should play it safe: follow the existing system closely and ask when unsure.

## Write like a teammate

Every document, commit and pull request reads like a teammate walking someone through something: warm, plain and straight to the point. For example: "This is what we made for the team. You sign in like this: type your email in the first box, your password in the next, and press Sign in." Short sentences, no jargon without an explanation, and no em dashes. The details for a later reader belong in the docs; commits stay short ([git-conventions.md](git-conventions.md)).

## Leave the docs better than you found them

If you learned something the docs didn't tell you, add it. If a page was wrong, fix it in the same commit. The next person, or the next session, starts from what you leave behind.
