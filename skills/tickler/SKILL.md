---
name: tickler
description: >
  Watch a GitHub PR, issue, or Jira ticket for changes. Use when the
  user says "tickler: <url>", "watch this PR", "let me know when this
  is approved/merged/closed", or wants to be notified of activity on
  a specific item. Also runs as a background monitor that checks all
  watched items on a schedule.
user-invocable: true
argument-hint: "[add <url> [condition] | remove <url> | list | setup | stop | (no args to check now)]"
---

# Tickler

Watches GitHub PRs, GitHub issues, and Jira tickets for state changes.
Runs on a schedule during work hours and notifies when a watched item
meets its condition.

## Skill Directory

The skill's base directory is available as `$SKILL_SCRIPTS_DIR`
(provided in the `Base directory for this skill:` header). Scripts
are at `$SKILL_SCRIPTS_DIR/scripts/`.

```
SKILL.md         — core workflow (this file)
README.md        — user-facing docs
workflow/
  SETUP.md       — first-run setup wizard
  ADD.md         — add / remove / list items
  CHECK.md       — fetch state and detect changes
  NOTIFY.md      — notification logic (direct / Slack)
  FORMATS.md     — tickler.json and state.json schemas
scripts/
  fetch-github.js — GitHub REST API fetcher
  fetch-jira.js   — Jira REST API fetcher
```

**Token optimization:** Only SKILL.md loads every cycle. All
`workflow/` files are **Read on demand**.

## Configuration

Config lives at `${CLAUDE_PLUGIN_DATA}/config.json`.

```json
{
  "notify": "direct",
  "slackUserId": "",
  "workHours": { "start": 8, "end": 18, "days": "1-5" },
  "interval": 60,
  "githubToken": "",
  "jiraBaseUrl": "",
  "jiraEmail": "",
  "jiraToken": ""
}
```

- `notify`: `"direct"` (print to terminal) or `"slack"` (DM to self)
- `slackUserId`: required if `notify` is `"slack"` — your Slack user ID
- `githubToken`: optional for public repos; required for private
- `jiraBaseUrl`: e.g. `https://myorg.atlassian.net`
- `jiraEmail` + `jiraToken`: Jira API credentials

**Setup** runs when `${CLAUDE_PLUGIN_DATA}/config.json` does not
exist, or when the user passes `setup`: `/tickler setup`.
When triggered, **Read** `$SKILL_SCRIPTS_DIR/workflow/SETUP.md`.

## Argument Dispatch

Parse `$ARGUMENTS` before doing anything else:

| Argument | Action |
|----------|--------|
| `setup` | Read `workflow/SETUP.md` and run wizard |
| `add <url> [condition]` | Read `workflow/ADD.md` → add item |
| `remove <url>` | Read `workflow/ADD.md` → remove item |
| `list` | Read `workflow/ADD.md` → list items |
| `stop` | Cancel scheduled cron, confirm to user |
| *(none)* | Run a check cycle (Steps 1–5 below) |

## Check Cycle

### Step 1 — Initialize

In parallel:
1. **Read** `${CLAUDE_PLUGIN_DATA}/config.json`. If missing, run setup.
2. **Read** `${CLAUDE_PLUGIN_DATA}/tickler.json`. If missing or empty
   array, skip to Step 4 (still schedule next run).
3. **Read** `${CLAUDE_PLUGIN_DATA}/state.json`. If missing, treat as
   empty object `{}`.

Compute:
- `local_hour` — current hour in user's local timezone
- `local_dow` — day of week (1=Mon, 7=Sun)

### Step 2 — Check Items

**Read** `$SKILL_SCRIPTS_DIR/workflow/CHECK.md` and process each item
in `tickler.json`. Skip items where `snoozed_until` is in the future.

Delegate all fetches to a **haiku-model Agent subagent** — it runs
all API calls in parallel and returns a list of changed items.

### Step 3 — Notify

If any items have changes, **Read**
`$SKILL_SCRIPTS_DIR/workflow/NOTIFY.md` and deliver notifications.

**Short-circuit:** If no items changed, skip Step 3 entirely.

### Step 4 — Save State

**Write** updated `${CLAUDE_PLUGIN_DATA}/state.json` with latest
state for all items.

### Step 5 — Schedule Next Run

Use `CronList` to check for existing cron.

**Work hours gate** (using `local_hour`, `local_dow`, config
`workHours`):

- **Within work hours**: schedule recurring cron at `interval` minutes
- **Outside work hours**: if already past `endHour`, schedule one-shot
  for `startHour:03` on the next active day (skip weekends if
  `days` is `1-5`)

## Gotchas

- GitHub rate limit is 60 req/hr unauthenticated, 5000 with token.
  If watching many items, a token is strongly recommended.
- Jira Cloud uses email + API token (Basic auth base64-encoded).
  Jira Server uses different auth — document which one the user has.
- `${CLAUDE_PLUGIN_DATA}` is not available until the plugin is
  installed. On first invocation, if the variable is empty, abort
  with a clear error message.
- Item URLs must be stable canonical URLs. Avoid short URLs or
  redirects.
