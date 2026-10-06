# Skills and plugins for Claude Code

What we found on 2026-10-06 when we looked for skills to help with Supabase, Next.js, architecture, performance and security: what's built in, what we installed, what's worth adding later, and what we chose not to use. A **skill** is a folder of instructions that a Claude Code session loads when a task needs it. A **plugin** bundles skills, commands, hooks or connections to other tools (MCP servers) into one install.

**The rule of thumb:** a skill that teaches facts about a tool we use (Supabase, Postgres, a framework) helps. A skill that brings its own opinions about how things should look or be organised competes with our guides, and our guides must win. One general design skill, for example, tells sessions to generate a fresh design system for every new project, which pulls the work away from the PPM's own.

## Built into Claude Code

These come with Claude Code itself, in every terminal session, for everyone. Nothing to install, and they aren't part of the claude.ai chat.

| Command | What it does | Kind |
|---|---|---|
| `/security-review` | Reviews the changes on your branch, compared with `main`, for security problems: injection, sign-in and permission issues, data exposure | Built-in command: you type it |
| `/code-review` | Reviews the current changes, or a pull request, for bugs; `--fix` applies what it finds | Bundled skill |
| `/simplify` | Four reviewers check the changed code for reuse of existing helpers, simpler code, efficiency, and the right level of abstraction. It doesn't look for bugs | Bundled skill |
| `/run` and `/verify` | Start the app and check a change against it, rather than relying on tests alone | Bundled skills |

"Built-in command" and "bundled skill" are Claude Code's own terms. A built-in command runs fixed logic when you type it. A bundled skill is a set of instructions that Claude follows with its tools; you can type it, and Claude may also reach for some of them when they fit ([Claude Code's commands](https://code.claude.com/docs/en/commands)).

## Installed (on Kyan's Mac, for this repository only)

| Skill | From | What it gives a session |
|---|---|---|
| `supabase` | Supabase's official [agent skills](https://github.com/supabase/agent-skills) | Current guidance for everything Supabase: sign-in and sessions, row-level security, migrations, the CLI, and debugging. It also adds Supabase's documentation search as a connection, which asks for a Supabase sign-in before it works; it's fine to leave it signed out |
| `postgres-best-practices` | The same repository | Postgres rules ranked by impact: queries, indexes, schema design, row-level security, locking |

They're installed as plugins at "local" scope, so they're on only for Kyan's sessions in this repository. Anyone can add them the same way:

```bash
claude plugin marketplace add supabase/agent-skills
claude plugin install supabase@supabase-agent-skills --scope local
claude plugin install postgres-best-practices@supabase-agent-skills --scope local
```

## Not needed

- **Next.js.** Vercel retired its Next.js best-practices skill. Since Next.js 16.3 the framework ships its own documentation inside the package (`node_modules/next/dist/docs/`, 456 pages for our version), and `next dev` writes the `AGENTS.md` that points sessions to it. The PPM already has that file, so sessions read the docs for the exact version we run.

## Worth adding when the need comes

| What | From | Good for | Cost |
|---|---|---|---|
| `typescript-lsp` | Anthropic's plugin directory | Sessions see type errors right after each edit, and find definitions and every use by symbol rather than by text. The biggest help for large refactors | Free. Needs `npm install -g typescript-language-server typescript`. Terminal sessions only |
| `claude-security` | Anthropic | A deep security scan of a whole app, where independent reviewers try to disprove each finding before it's reported | A large, one-off token cost, stated before it starts |
| `security-guidance` | Anthropic | Security checks while code is written: pattern warnings on every edit, an Opus review of the changes at the end of every turn, and a review on every commit | A token cost on every turn and commit. The end-of-turn review can be switched off with `ENABLE_STOP_REVIEW=0` |
| `react-best-practices` | [Vercel](https://github.com/vercel-labs/agent-skills) | 70 performance rules for React and Next.js, led by request waterfalls and bundle size. It notes where React Compiler, which the PPM uses, already does the work | Free |
| `supply-chain-risk-auditor` | [Trail of Bits](https://github.com/trailofbits/skills) | Checks our npm packages for known advisories, abandoned projects and install scripts | Free. Worth a run now and then |
| `/run-skill-generator` | Built in | Records how to start the PPM (Docker, the local database, `.env.local`), so `/run` and `/verify` can check changes against the running app | It commits a small skill to `.claude/skills/` |

## Not using

- **Architecture and folder-structure skills.** We found none worth trusting, and a generic one would compete with our own structure the way a general design skill competes with a design system. Our folders follow domain-driven design ([the PPM's decision 0011](../../ppm/docs/decisions/0011-domain-driven-folders.md)). If we want a skill for it, we'll write one from the architecture guide.
- **General design skills for the PPM.** The PPM's design system decides its look ([design-system.md](../../ppm/docs/guides/design-system.md)).
- **Supabase's full database connection** (its MCP server with database access, not the documentation search). It can run SQL on a project, and nothing runs on the live database without Kenneth's OK.

## Sources

- [supabase/agent-skills](https://github.com/supabase/agent-skills), [vercel-labs/next-skills](https://github.com/vercel-labs/next-skills) (where Next.js's skills went), [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), [trailofbits/skills](https://github.com/trailofbits/skills), [Anthropic's plugin directory](https://github.com/anthropics/claude-plugins-official)
- Claude Code's docs: [commands](https://code.claude.com/docs/en/commands), [skills](https://code.claude.com/docs/en/skills), [code intelligence](https://code.claude.com/docs/en/plugins/code-intelligence)
