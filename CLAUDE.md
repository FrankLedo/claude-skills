# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Claude Code plugin marketplace collection. Plugins are prompt-driven workflows (markdown + YAML config) distributed via the Claude Code plugin marketplace. There are no build steps, no package managers, and no test suite — plugins are pure documentation that Claude Code interprets and executes.

## Release Process

Releases are fully automated via GitHub Actions + Release Please:
- Merging to `main` triggers automated version bumping and CHANGELOG generation
- Uses **Conventional Commits**: `feat:` = minor bump, `fix:` = patch bump, `feat!:` = major bump
- PR titles must pass semantic commit validation (`amannn/action-semantic-pull-request`)
- Version is bumped in both `.claude-plugin/plugin.json` (root) and `plugins/<plugin>/.claude-plugin/plugin.json`

## Plugin Architecture

Each plugin lives in `plugins/<plugin-name>/` and follows the official Claude Code plugin structure:

```
plugins/<plugin-name>/
  .claude-plugin/plugin.json   — plugin metadata (name, version, description)
  README.md                    — user-facing documentation
  skills/<skill-name>/         — skill(s) within this plugin
    SKILL.md                   — always-loaded entry point
    workflow/                  — on-demand workflow files
    templates/                 — default state files copied on setup
    scripts/                   — optional Node.js helpers (built-ins only, no npm)
    agents/                    — optional agent prompt files (e.g., `monitor-prompt.md`); read by SKILL.md and dispatched via the Agent tool to run the monitor cycle in isolation, preventing cross-skill context contamination
```

The `skills/<skill-name>/` nesting follows the official `anthropics/claude-plugins-official` structure where `plugins/<plugin>/skills/<skill>/SKILL.md` is the canonical path.

### Token optimization

Only `SKILL.md` loads every cycle. All `workflow/` files are **Read on demand** — only when the specific feature is needed. On idle cycles with nothing to do, none of the workflow files load.

### slack-monitor Plugin

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
- `DM-REVIEW.md` — processes user replies to DM review threads (slack reviewMode only)
- `GUARDRAILS.md` — safety limits and rules
- `SELF-DM.md` — processing commands sent via self-DM
- `FORMATS.md` — state file JSON schemas

MCP dependencies: `slack_search_public_and_private`, `slack_read_thread`, `slack_read_channel`, `slack_send_message`, `slack_send_message_draft`, `slack_search_users`

## Design Principles (for adding/modifying plugins)

1. **No npm packages or build steps** — use Claude's native Read/Write/Edit/Bash tools and MCP integrations; `scripts/` Node.js helpers are acceptable if they use only built-in modules and are invoked via `Bash`
2. **Token efficiency** — load files on-demand via `Read` tool; minimize what's always loaded
3. **Delegate mechanical work to subagents** — use `haiku` model for expensive search/filter operations
4. **State in `${CLAUDE_PLUGIN_DATA}/`** — never hardcode paths like `~/.plugin-name/`
5. **Scheduling lives in SKILL.md, not the agent** — after a monitor agent returns, SKILL.md handles CronCreate/CronList. Scheduling logic is intentionally duplicated across plugins (not shared) because each plugin is independently installable with no guaranteed shared file path.
6. **MCP-first for external APIs** — prefer MCP tools when available (no Bash permission needed), fall back to `gh` CLI (already permitted for GitHub), then Node.js scripts as last resort

## Adding a New Plugin

1. Create `plugins/<plugin-name>/` following the structure above
2. Add the plugin's `plugin.json` path to the `extra-files` array in `release-please-config.json` (there is a single root package `.`; do not add a new entry under `packages`)
3. Update root `README.md` plugins table
4. Add the plugin to `.claude-plugin/marketplace.json` — this is what the Claude Code marketplace reads; omitting it means the plugin won't appear to users
5. Reference `planning/` for in-progress specs (not published to marketplace)
