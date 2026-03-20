# tickler

Watch GitHub PRs, GitHub issues, and Jira tickets. Get notified when
something changes or meets a condition you care about.

## Installation

Add the marketplace once (if not already added):

```text
claude plugin marketplace add FrankLedo/claude-skills
```

Then install tickler:

```text
claude plugin install tickler
```

## Usage

### Add a watch

```text
/tickler add https://github.com/org/repo/pull/123 approved
/tickler add https://github.com/org/repo/pull/123 merged
/tickler add https://github.com/org/repo/pull/123 changes-requested
/tickler add https://github.com/org/repo/pull/123 new-comment
/tickler add https://github.com/org/repo/issues/456 closed
/tickler add https://github.com/org/repo/issues/456 new-comment
/tickler add https://github.com/org/repo/issues/456 labeled:bug
/tickler add PROJ-789 status:Done
/tickler add PROJ-789 new-comment
/tickler add https://github.com/org/repo/pull/99
```

### Check now

```text
/tickler
```

### Manage

```text
/tickler list
/tickler remove https://github.com/org/repo/pull/123
/tickler config
/tickler stop
/tickler setup
```

`/tickler config` resolves and prints the full path to your `CLAUDE.md`
config file and shows current settings.

## Conditions

| Type | Conditions |
|------|-----------|
| GitHub PR | `approved`, `merged`, `closed`, `changes-requested`, `new-comment`, `any` |
| GitHub Issue | `closed`, `new-comment`, `labeled:<label>`, `any` |
| Jira | `status:<value>`, `new-comment`, `any` |

## Notifications

Configure in setup: `direct` (terminal) or `slack` (DM to self).

## Running locally (without installing)

The skill needs `${CLAUDE_PLUGIN_DATA}` and `$SKILL_SCRIPTS_DIR` to be set.
You can bootstrap a local dev session by setting them in your shell before
starting Claude Code:

```bash
export SKILL_SCRIPTS_DIR="/path/to/claude-skills/skills/tickler"
export CLAUDE_PLUGIN_DATA="$HOME/.tickler-dev"
mkdir -p "$CLAUDE_PLUGIN_DATA"

# Copy starter state files
cp "$SKILL_SCRIPTS_DIR/templates/CLAUDE.md"    "$CLAUDE_PLUGIN_DATA/CLAUDE.md"
cp "$SKILL_SCRIPTS_DIR/templates/tickler.json" "$CLAUDE_PLUGIN_DATA/tickler.json"
cp "$SKILL_SCRIPTS_DIR/templates/state.json"   "$CLAUDE_PLUGIN_DATA/state.json"
```

Then edit `~/.tickler-dev/CLAUDE.md` (YAML frontmatter) with your credentials
and invoke the skill by asking Claude to read `$SKILL_SCRIPTS_DIR/SKILL.md`
and run it.

## Requirements

- Node.js (for fetch scripts)
- **GitHub:** [GitHub MCP server](https://github.com/github/github-mcp-server) (preferred), or set `GITHUB_TOKEN` env var for the fetch script
- **Jira:** [Jira MCP server](https://github.com/sooperset/mcp-atlassian) (preferred), or set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_TOKEN` env vars
- **Slack notifications:** Slack MCP server
