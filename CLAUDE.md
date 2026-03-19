# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Claude Code skill marketplace collection. Skills are prompt-driven workflows (markdown + YAML config) distributed via the Claude Code plugin marketplace. There are no build steps, no package managers, and no test suite — skills are pure documentation that Claude Code interprets and executes.

## Release Process

Releases are fully automated via GitHub Actions + Release Please:
- Merging to `main` triggers automated version bumping and CHANGELOG generation
- Uses **Conventional Commits**: `feat:` = minor bump, `fix:` = patch bump, `feat!:` = major bump
- PR titles must pass semantic commit validation (`amannn/action-semantic-pull-request`)
- Version is bumped in both `.claude-plugin/plugin.json` (root) and `skills/<skill>/.claude-plugin/plugin.json`

## Skill Architecture

Each skill lives in `skills/<skill-name>/` and follows a **token-optimized, on-demand loading** pattern:

- **`SKILL.md`** — always-loaded entry point (~200-300 lines); contains orchestration logic and references to workflow files
- **`workflow/`** — specialized files read only when needed (e.g., `HANDLE.md` only when messages exist, `SETUP.md` only on first run)
- **`templates/`** — default config files copied to user's state directory on setup
- **`.claude-plugin/plugin.json`** — skill metadata (id, name, description, version)

The pattern keeps idle scan cycles minimal by deferring file reads until actually needed.

### slack-monitor Skill

Monitors Slack for unanswered DMs, @mentions, thread replies, and watched channels. Drafts context-aware replies and requests approval before sending.

**State directory:** `${CLAUDE_PLUGIN_DATA}/` (injected by Claude Code harness)

Key state files:
- `CLAUDE.md` — YAML frontmatter config + accumulated knowledge in markdown body
- `last_scan` — ISO 8601 timestamp of last check
- `pending_review.json` — messages awaiting approval
- `search_cache.json` — thread read cache
- `people/<name>.md` — per-person context profiles

Workflow files (in `workflow/`):
- `SETUP.md` — first-run wizard
- `HANDLE.md` — message handling + draft generation
- `REVIEW.md` — review modes (slack DM vs. direct CLI)
- `GUARDRAILS.md` — safety limits and rules
- `SELF-DM.md` — processing commands sent via self-DM
- `FORMATS.md` — state file JSON schemas

MCP dependencies: `slack_search_public_and_private`, `slack_read_thread`, `slack_read_channel`, `slack_send_message`, `slack_send_message_draft`, `slack_search_users`

## Design Principles (for adding/modifying skills)

1. **No scripts or dependencies** — use Claude's native Read/Write/Edit/Bash tools and MCP integrations only; avoid npm, shell scripts, or external dependencies in core workflows
2. **Token efficiency** — load files on-demand via `Read` tool; minimize what's always loaded
3. **Delegate mechanical work to subagents** — use `haiku` model for expensive search/filter operations
4. **State in `${CLAUDE_PLUGIN_DATA}/`** — never hardcode paths like `~/.skill-name/`

## Adding a New Skill

1. Create `skills/<skill-name>/` with `SKILL.md`, `workflow/`, `templates/`, and `.claude-plugin/plugin.json`
2. Add the skill to `release-please-config.json` under `packages`
3. Update root `README.md` skills table
4. Reference `planning/` for in-progress specs (not published to marketplace)
