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

## Getting Started

After installing, run the setup wizard once to configure tickler:

```text
/tickler setup
```

The wizard walks you through:

1. **Notification method** — `direct` (messages appear in your terminal) or `slack` (DMs to yourself)
2. **Work hours** — tickler stays quiet outside these hours
3. **Polling interval** — how often to check (default: 5 minutes)
4. **GitHub credentials** — uses the GitHub MCP server if you have it; otherwise prompts for a `GITHUB_TOKEN`
5. **Jira credentials** — optional; only needed if you watch Jira tickets

Setup writes a config file and an empty watch list. After that, tickler starts its background monitor and you're ready to add watches.

## Usage

### Add a watch

```text
/tickler add https://github.com/org/repo/pull/123 approved
/tickler add https://github.com/org/repo/pull/123 merged
/tickler add https://github.com/org/repo/pull/123 changes-requested
/tickler add https://github.com/org/repo/pull/123 ci-passed
/tickler add https://github.com/org/repo/pull/123 ci-failed
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
| GitHub PR | `approved`, `merged`, `closed`, `changes-requested`, `ci-passed`, `ci-failed`, `new-comment`, `any` |
| GitHub Issue | `closed`, `new-comment`, `labeled:<label>`, `any` |
| Jira | `status:<value>`, `new-comment`, `new-subtask`, `any` |

## Recipes

### Watch a PR → notify when approved

```text
/tickler add https://github.com/org/repo/pull/123 approved
```

Tickler notifies you when the PR gets its first approval. After that, snooze or remove it manually.

---

### Watch a PR → auto-merge when approved, then stop tracking

```text
/tickler add https://github.com/org/repo/pull/123 any
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When approved, merge it (squash). Ask me first. When merged, remove it from the watch list.

Tickler will ask for your approval before merging, then drop the item from the watch list automatically.

---

### Watch a PR → merge when CI passes

```text
/tickler add https://github.com/org/repo/pull/123 ci-passed
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When CI passes, merge it (squash). Ask me first. When merged, remove it from the watch list.

Tickler polls CI status and prompts you to merge once all checks go green.

---

### Watch a PR end-to-end: CI + approval → merge → Jira → stop

```text
/tickler add https://github.com/org/repo/pull/123 any
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When CI fails, DM me on Slack: "CI failed on PR #123". When approved, merge it (squash). Ask me first. When merged, transition the Jira ticket to Done and remove it from the watch list.

---

### Watch a GitHub issue → remove when closed

```text
/tickler add https://github.com/org/repo/issues/456 closed
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When closed, remove it from the watch list.

Useful for issues you filed and want to forget about until they're resolved.

---

### Watch a Jira ticket → notify when done

```text
/tickler add PROJ-789 status:Done
```

Tickler notifies you when the ticket transitions to Done. When adding, you can also tell it to remove it from the watch list automatically on that transition.

---

### Mark a draft PR ready when CI passes, then auto-merge on approval

```text
/tickler add https://github.com/org/repo/pull/123 any
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When CI passes, run this shell command: `gh pr ready https://github.com/org/repo/pull/123`. When approved, merge it (squash). Ask me first. When merged, transition the Jira ticket to In Review and remove it from the watch list.

CI going green promotes the draft, a reviewer approves it, tickler asks you to confirm the merge, then updates the Jira ticket and cleans up — all from a single watch.

---

### React to a stalled PR: comment and label when changes requested

```text
/tickler add https://github.com/org/repo/pull/123 any
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When changes are requested, post a comment: "Addressed the review comments, please take another look." Also when changes are requested, run this shell command: `gh pr edit https://github.com/org/repo/pull/123 --add-label "needs-review"`. When approved, merge it (squash). Ask me first. When merged, remove it from the watch list.

Multiple actions can share the same trigger — they all fire in order.

---

### Watch a dependency update PR: auto-merge if CI passes, close if it fails

```text
/tickler add https://github.com/org/repo/pull/456 any
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When CI passes, merge automatically — no confirmation needed. When CI fails, close the PR automatically. When merged, remove it from the watch list.

Fully automated dependency merging — no human in the loop unless something goes wrong.

---

### Watch a PR for CI failure → interactive response

```text
/tickler add https://github.com/org/repo/pull/123 ci-failed
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When CI fails, show me an interactive menu asking "CI failed — how do you want to respond?" with options: post a comment saying "CI failed — investigating", or close the PR.

When CI fails, tickler presents the menu and waits for your input. Choose an option or say anything — tickler enters a free-form conversation with full PR context loaded.

---

## Actions

Every `/tickler add` command ends with: **"Would you like to add any actions?"** Just describe what you want in plain English — tickler translates it into the right configuration. You can say things like "when approved, merge it and ask me first" or "when CI fails, DM me on Slack."

Under the hood, actions are stored as a JSON array on the watched item:

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
| `merge` | `gh pr merge` (`args.method`: squash/merge/rebase; `args.admin: true` to bypass branch protection) | `true` |
| `close` | Closes the PR or issue | `true` |
| `comment` | Posts `args.body` as a comment | `false` |
| `jira_transition` | Transitions Jira ticket to `args.to` status | `false` |
| `remove_from_watch` | Removes item from the watch list | `false` |
| `run` | Dispatches `args.cmd` as an Agent prompt (multi-step reasoning or slash commands) | `false` |
| `shell` | Runs `args.cmd` directly — no agent spawned; use for single shell commands (e.g. `gh pr ready`) | `false` |
| `slack_dm` | DMs `args.body` to your configured Slack user | `false` |
| `interactive` | Presents a menu + free-form conversation when triggered (`args.prompt` required, `args.options[]` optional; direct mode only) | N/A |
| `todoist_close` | Marks a Todoist task complete; `args.task` = task name or numeric ID | `false` |
| `todoist_create` | Creates a new Todoist task; `args.title` required, `args.due` and `args.project` optional | `false` |
| `todoist_comment` | Adds a comment to a Todoist task; `args.task` = task name or ID, `args.body` required | `false` |

Actions with `confirm: true` are held until you approve them — tickler will prompt you before firing. Actions are idempotent: once a `on:do` pair fires successfully it won't re-fire even if the condition is re-observed.

Todoist actions require the [Todoist MCP server](https://github.com/Doist/todoist-mcp) to be installed and configured.

---

### PR merged → complete a Todoist task

```text
/tickler add https://github.com/org/repo/pull/123 merged
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When merged, complete my Todoist task "Ship feature X". Also remove it from the watch list.

Tickler will close the Todoist task and stop watching the PR — all automatically when the merge lands.

---

### CI failed → create a Todoist task to investigate

```text
/tickler add https://github.com/org/repo/pull/123 ci-failed
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When CI fails, create a Todoist task "Investigate CI failure on PR #123" due today in my Work project.

---

### PR approved → comment on the linked Todoist task

```text
/tickler add https://github.com/org/repo/pull/123 approved
```

After adding, tickler asks: **"Would you like to add any actions?"** Tell it:

> When approved, add a comment "PR approved — ready to merge" to the Todoist task "Ship feature X".

## Notifications

Configure in setup: `direct` (terminal) or `slack` (DM to self).

## Running locally (without installing)

The skill needs `${CLAUDE_PLUGIN_DATA}` and `$SKILL_SCRIPTS_DIR` to be set.
You can bootstrap a local dev session by setting them in your shell before
starting Claude Code:

```bash
export SKILL_SCRIPTS_DIR="/path/to/claude-skills/plugins/tickler/skills/tickler"
export CLAUDE_PLUGIN_DATA="$HOME/.tickler-dev"
mkdir -p "$CLAUDE_PLUGIN_DATA"

# Copy starter state files
cp "$SKILL_SCRIPTS_DIR/templates/CLAUDE.md" "$CLAUDE_PLUGIN_DATA/CLAUDE.md"
echo "[]" > "$CLAUDE_PLUGIN_DATA/tickler.json"
```

Then edit `~/.tickler-dev/CLAUDE.md` (YAML frontmatter) with your credentials
and invoke the skill by asking Claude to read `$SKILL_SCRIPTS_DIR/SKILL.md`
and run it.

## How it works / token cost

Tickler is designed to run continuously in the background without burning tokens on quiet periods.

- **State is fetched by a Node.js script** (`check.js`), not a model — zero AI cost per cycle when nothing has changed.
- **On quiet cycles** (nothing changed), the skill schedules the next run and exits immediately — no agent is dispatched.
- **On active cycles** (something changed), a small [Claude Haiku](https://www.anthropic.com/claude) agent handles notifications and fires actions. Haiku is the fastest and cheapest Claude model.
- **Adaptive intervals** — tickler automatically shortens the polling interval after activity (burst mode) and lengthens it during quiet stretches, so it's responsive when things are happening and cheap when they're not.
- **Actions are tier-1 by default** — `merge`, `close`, `comment`, `shell`, etc. run as deterministic scripts with no model invocation. Only `run` (agentic tasks) and `slack_dm` require the agent.

Typical cost for a watch list of 5–10 items: a few cents per day during active development, near zero during quiet periods.

## Requirements

- Node.js (for fetch scripts)
- **GitHub:** [GitHub MCP server](https://github.com/github/github-mcp-server) (preferred), or set `GITHUB_TOKEN` env var for the fetch script
- **Jira:** [Jira MCP server](https://github.com/sooperset/mcp-atlassian) (preferred), or set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_TOKEN` env vars
- **Slack notifications:** Slack MCP server
