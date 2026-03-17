# fxl — Claude Code Skills

A collection of Claude Code skills by [FrankLedo](https://github.com/FrankLedo).

## Installation

```text
/plugin install https://github.com/FrankLedo/claude-skills
```

## Skills

| Skill | Description |
|-------|-------------|
| [slack-monitor](skills/slack-monitor/) | Scan Slack for unanswered DMs, @mentions, and thread replies. Drafts context-aware replies and asks permission before sending. |

## Usage

Skills are invoked with the `fxl` prefix:

```text
/fxl:skill-name
```

## Contributing

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(skill-name): add new capability` — new feature (minor bump)
- `fix(skill-name): correct behaviour` — bug fix (patch bump)
- `feat!: rename skill invocation` — breaking change (major bump)
- `docs:`, `chore:`, `refactor:` — no version bump

Releases are automated via release-please on merge to `main`.

## License

MIT
