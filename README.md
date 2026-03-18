# fxl — Claude Code Skills

A collection of Claude Code skills by [FrankLedo](https://github.com/FrankLedo).

## Installation

Add the marketplace once (case-sensitive):

```text
claude plugin marketplace add FrankLedo/claude-skills
```

Then install individual skills by name:

```text
claude plugin install slack-monitor
```

## Skills

| Skill | Description |
|-------|-------------|
| [slack-monitor](skills/slack-monitor/) | Scan Slack for unanswered DMs, @mentions, and thread replies. Drafts context-aware replies and asks permission before sending. |

## Usage

Skills are invoked by name:

```text
/slack-monitor
```

## Contributing

### Design principles

Skills should be lightweight and token-efficient. Every byte loaded into
context on each invocation has a cost — keep `SKILL.md` as the lean
entry point and move detail into supporting files that are **read on
demand**.

The `slack-monitor` skill demonstrates the pattern:

- `SKILL.md` — minimal entry point, always loaded. Orchestrates the
  workflow but contains no bulk detail.
- `workflow/` — referenced conditionally. `HANDLE.md` is only read when
  there are actionable messages; `FORMATS.md` only when a file format
  is needed. On idle cycles with nothing to do, none of these load.
- No scripts or compiled dependencies — skills use Claude's native
  tools and MCP integrations only.
- Mechanical sub-tasks (searches, filtering) are delegated to a
  `haiku` model subagent to keep cost low on the hot path.

When adding a skill, also add its `.claude-plugin/plugin.json` to
`release-please-config.json` so its version stays in sync on release.

### Commit convention

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(skill-name): add new capability` — new feature (minor bump)
- `fix(skill-name): correct behaviour` — bug fix (patch bump)
- `feat!: rename skill invocation` — breaking change (major bump)
- `docs:`, `chore:`, `refactor:` — no version bump

Releases are automated via release-please on merge to `main`.

## License

MIT
