---
name: tickler
description: >
  Watch a GitHub PR, issue, or Jira ticket for changes. Use when the
  user says "tickler: <url>", "watch this PR", "let me know when this
  is approved/merged/closed", or wants to be notified of activity on
  a specific item. Also runs as a background monitor that checks all
  watched items on a schedule.
user-invocable: true
argument-hint: "[add <url> [condition] | remove <url> | list | config | setup | stop | (no args to check now)]"
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
agents/
  monitor-prompt.md — isolated monitor agent prompt
workflow/
  SETUP.md       — first-run setup wizard
  ADD.md         — add / remove / list items
  CHECK.md       — fetch state and detect changes (used by monitor agent)
  NOTIFY.md      — notification logic (direct / Slack)
  FORMATS.md     — tickler.json and state.json schemas
scripts/
  fetch-github.js — GitHub REST API fetcher
  fetch-jira.js   — Jira REST API fetcher
```

**Token optimization:** Only SKILL.md loads every cycle. All
`workflow/` files are **Read on demand**.

## Configuration

Config lives in the YAML frontmatter of `${CLAUDE_PLUGIN_DATA}/CLAUDE.md`,
which is auto-loaded as context. Key fields:

- `notify`: `"direct"` (print to terminal) or `"slack"` (DM to self)
- `slackUserId`: required if `notify` is `"slack"` — your Slack user ID
- `startHour`: work hours start, 0–23, user's local time (default `8`)
- `endHour`: work hours end, 0–23, user's local time (default `18`)
- `days`: working days range e.g. `1-5` (Mon=1 Sun=7, default `1-5`)
- `interval`: check interval in minutes (default `15`)
- `githubToken`: optional for public repos; required for private
- `jiraBaseUrl`: e.g. `https://myorg.atlassian.net`
- `jiraEmail` + `jiraToken`: Jira API credentials

Custom item types can be defined in the markdown body of
`${CLAUDE_PLUGIN_DATA}/CLAUDE.md` under a `## Custom Types` section.

**Setup** runs when `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` does not
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
| `config` | Resolve `${CLAUDE_PLUGIN_DATA}` and print the full path to `CLAUDE.md`, then show current config values |
| `stop` | Cancel scheduled cron, confirm to user |
| *(none)* | Run a check cycle (see below) |

## Check Cycle (no-arg invocation)

1. In parallel, **Read**:
   - `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` — parse YAML frontmatter only.
     If missing, run setup.
   - `${CLAUDE_PLUGIN_DATA}/tickler.json` — if missing or empty, proceed
     to scheduling (step 5) without dispatching the agent.

2. Compute `current_time` (current ISO 8601 UTC timestamp), `local_hour`,
   and `local_dow` from current time and user's timezone.

3. **Read** `$SKILL_SCRIPTS_DIR/agents/monitor-prompt.md`.

4. **Dispatch Agent** with the monitor prompt. Pass as part of the prompt text:
   - `SKILL_SCRIPTS_DIR=<resolved path>`
   - `CLAUDE_PLUGIN_DATA=<resolved path>`
   - All config values from CLAUDE.md frontmatter
   - `current_time=<ISO 8601 UTC timestamp>`
   - `local_hour=<N>`, `local_dow=<N>`

5. Receive `MONITOR_SUMMARY` from the agent. State writes (state.json) are
   handled by the monitor agent.

6. **Schedule next run** using `CronList` then `CronCreate`:
   - Compute `local_hour` and `local_dow` if not yet done
   - Outside work hours (`local_hour >= endHour` or `local_hour < startHour`
     or `local_dow` outside `days`):
     → one-shot cron for `startHour:03` on next active day
   - Within work hours:
     → recurring cron at `interval` minutes
   - Skip CronCreate if a matching cron already exists per CronList.

7. **Report** to user:
   - items_checked, items_changed, notifications_sent (from MONITOR_SUMMARY)
   - Next run scheduled for: `<time>`

## Gotchas

- GitHub rate limit is 60 req/hr unauthenticated, 5000 with token.
  If watching many items, a token is strongly recommended.
- Jira Cloud uses email + API token (Basic auth base64-encoded).
  Jira Server uses different auth — document which one the user has.
- `${CLAUDE_PLUGIN_DATA}` is not available until the plugin is
  installed. On first invocation, if the variable is empty or
  unresolved (still looks like a literal `${...}`), stop immediately
  and tell the user: "tickler is not installed. Run:
  `claude plugin install tickler`"
- Never use configuration from any other CLAUDE.md found in context
  (e.g. the repo's own CLAUDE.md). Only `${CLAUDE_PLUGIN_DATA}/CLAUDE.md`
  is valid config for this skill.
- Item URLs must be stable canonical URLs. Avoid short URLs or
  redirects.
