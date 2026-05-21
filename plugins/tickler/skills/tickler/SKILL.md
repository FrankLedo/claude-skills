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
  NOTIFY.md      — notification logic (direct / Slack)
  FORMATS.md     — tickler.json and state.json schemas
scripts/
  check.js               — fetch state + detect changes for all items (deterministic)
  adaptive-interval.js   — compute next check interval based on activity
  actions.js             — execute tier-1 actions (merge, close, comment, jira_transition, remove_from_watch)
  fetch-github.js        — GitHub REST API fetcher (used by check.js)
  fetch-jira.js          — Jira REST API fetcher (used by check.js)
  state.js               — tickler.json read/write API
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
- `interval`: base check interval in minutes (default `60`)
- `intervalMin`: minimum interval after activity (default `interval/2`, min 15); shortens checks after a change
- `intervalMax`: maximum interval during quiet periods (default `interval*2`); backs off when nothing changes
- `autoRemoveTerminal`: auto-remove merged/closed GitHub PRs and closed GitHub issues from watch list after notifying (default `true`)
- `openInBrowser`: open each changed item URL in the browser after a check cycle (default `false`; macOS only)
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

1. **Read** `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` — parse YAML frontmatter only.
   If missing, run setup.

2. Run `date -u +"%Y-%m-%dT%H:%M:%SZ" && date +"%H %u"` via Bash to get
   the actual `current_time` (UTC ISO 8601), `local_hour` (0–23), and
   `local_dow` (1=Mon … 7=Sun). Do NOT estimate or infer the time from
   context.

3. Run `check.js` directly via Bash (resolving `env:` token prefixes from config):
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/check.js \
     --data $CLAUDE_PLUGIN_DATA \
     --token <githubToken> \
     --jira-base-url <jiraBaseUrl> \
     --jira-email <jiraEmail> \
     --jira-token <jiraToken>
   ```
   Parse output: `items_checked`, `changed[]`, `terminal_items[]`.
   State is saved by `check.js` automatically.

   Then compute the adaptive next interval:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/adaptive-interval.js \
     --data $CLAUDE_PLUGIN_DATA \
     --base <interval> \
     [--min <intervalMin>] [--max <intervalMax>] \
     --changed <1 if changed[] non-empty, else 0>
   ```
   Capture the printed integer as `next_interval`. Use it in step 6 instead of
   the static `interval` config value.

   **If `items_checked === 0`** (empty watch list): skip to step 6 (scheduling).
   Report `items_checked: 0`, all other counts 0.

4. **If `changed` is empty AND `terminal_items` is empty**: no agent needed.
   Skip to step 6. Report `items_checked: N`, `items_changed: 0`, all others 0.

5. **Changes detected** — **Read** `$SKILL_SCRIPTS_DIR/agents/monitor-prompt.md`,
   then **Dispatch Agent** (`model: haiku`) with the monitor prompt. Pass as
   part of the prompt text:
   - `SKILL_SCRIPTS_DIR=<resolved path>`
   - `CLAUDE_PLUGIN_DATA=<resolved path>`
   - All config values from CLAUDE.md frontmatter
   - `current_time=<ISO 8601 UTC timestamp>`
   - `local_hour=<N>`, `local_dow=<N>`
   - `CHECK_OUTPUT=<full JSON string from check.js>`

   Receive `MONITOR_SUMMARY` from the agent. Parse `items_checked`,
   `items_changed`, `notifications_sent`, `items_removed`, `actions_fired`,
   `actions_pending_confirm`, and `changed_urls` from it.

5a. If `openInBrowser: true` in config and `changed_urls` is non-empty,
    open each URL in the browser — one separate Bash call per URL:
    ```
    open "<url1>"
    open "<url2>"
    ```
    (Multi-arg `open` causes blank pages on macOS; one call per URL is required.)

5b. If `actions_pending_confirm` > 0, **Read**
    `${CLAUDE_PLUGIN_DATA}/pending_actions.json`. For each action, use
    `AskUserQuestion` to prompt the user before firing:
    > "[label] — [url] triggered '[on]'. Execute '[do]'?"
    - Yes → call `actions.js` with the action's verb and args (same invocation
      as the monitor agent uses in Step 3), then remove the item from
      `pending_actions.json`.
    - No → remove the item from `pending_actions.json` without executing.

6. **Schedule next run** using `CronList` then `CronCreate`.
   Use `next_interval` (from the adaptive-interval.js call in step 3) as the
   interval value. If step 3 was skipped (empty watch list), use `interval` from config.
   - If step 3 returned `items_checked === 0` (empty list), run
     `date -u +"%Y-%m-%dT%H:%M:%SZ" && date +"%H %u"` to get
     `local_hour` and `local_dow` now — do NOT estimate
   - Outside work hours (`local_hour >= endHour` or `local_hour < startHour`
     or `local_dow` outside `days`):
     → one-shot cron for `startHour:03` on next active day
   - Within work hours — drift-aware scheduling:
     1. Run `CronList` and look for an existing recurring tickler cron.
     2. If one exists, compute minutes until its next fire relative to
        `current_time`. If that gap is less than `next_interval - 10` minutes,
        the current run was late and the next fire is too soon — cancel with
        `CronDelete` and create a fresh recurring cron at `next_interval` minutes
        anchored to now.
     3. If the gap is ≥ `next_interval - 10` minutes, the schedule is healthy —
        leave the existing cron in place (skip CronCreate).
     4. If no existing cron is found, create a new recurring cron at
        `next_interval` minutes.

7. **Report** to user:
   - items_checked, items_changed, notifications_sent, items_removed,
     actions_fired (from MONITOR_SUMMARY)
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
