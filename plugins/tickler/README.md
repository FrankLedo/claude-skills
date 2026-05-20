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
| Jira | `status:<value>`, `new-comment`, `new-subtask`, `any` |

## Actions

Items can carry an `actions[]` array that fires verbs when a condition triggers.
The `/tickler add` command will offer to set these up interactively.

```json
{
  "url": "https://github.com/org/repo/pull/123",
  "condition": "any",
  "actions": [
    { "on": "approved", "do": "merge", "confirm": true, "args": { "method": "squash" } },
    { "on": "merged",   "do": "jira_transition", "args": { "to": "Done" } },
    { "on": "merged",   "do": "remove_from_watch" }
  ]
}
```

| Verb | What it does | `confirm` default |
|---|---|---|
| `merge` | `gh pr merge` (`args.method`: squash/merge/rebase) | `true` |
| `close` | Closes the PR or issue | `true` |
| `comment` | Posts `args.body` as a comment | `false` |
| `jira_transition` | Transitions Jira ticket to `args.to` status | `false` |
| `remove_from_watch` | Removes item from the watch list | `false` |
| `run` | Dispatches `args.cmd` as an Agent prompt | `false` |
| `slack_dm` | DMs `args.body` to your configured Slack user | `false` |

Actions with `confirm: true` are held until you approve them — tickler will prompt you before firing. Actions are idempotent: once a `on:do` pair fires successfully it won't re-fire even if the condition is re-observed.

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
cp "$SKILL_SCRIPTS_DIR/templates/CLAUDE.md" "$CLAUDE_PLUGIN_DATA/CLAUDE.md"
echo "[]" > "$CLAUDE_PLUGIN_DATA/tickler.json"
```

Then edit `~/.tickler-dev/CLAUDE.md` (YAML frontmatter) with your credentials
and invoke the skill by asking Claude to read `$SKILL_SCRIPTS_DIR/SKILL.md`
and run it.

## Requirements

- Node.js (for fetch scripts)
- **GitHub:** [GitHub MCP server](https://github.com/github/github-mcp-server) (preferred), or set `GITHUB_TOKEN` env var for the fetch script
- **Jira:** [Jira MCP server](https://github.com/sooperset/mcp-atlassian) (preferred), or set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_TOKEN` env vars
- **Slack notifications:** Slack MCP server
