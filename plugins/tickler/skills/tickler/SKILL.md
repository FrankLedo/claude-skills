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
  notify.js              — script-path monitor: notify + tier-1 actions, no agent (qualifying cycles only)
  adaptive-interval.js   — standalone adaptive-interval tool (logic now also built into check.js)
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
- `notifyInput`: `"push"` (system notification + Remote Control push) or `"none"` (silent wait) — how to alert when tickler needs your input. Default: `"push"`.
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
| `stop` | Write `stopped` sentinel to `${CLAUDE_PLUGIN_DATA}/stopped`, confirm to user that tickler will stop after its next scheduled wakeup |
| *(none)* | Run a check cycle (see below) |

## Check Cycle (no-arg invocation)

1. **Stop check** — run `[ -f "${CLAUDE_PLUGIN_DATA}/stopped" ]` via Bash (use
   bracket syntax, not `test`, to avoid npm interference in the scripts dir).
   If it exits 0, delete the file (`rm "${CLAUDE_PLUGIN_DATA}/stopped"`) and
   output "Tickler stopped. Run `/tickler` to resume." Do not schedule another
   wakeup. Exit.

   **Read** `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` — parse YAML frontmatter only.
   If missing, run setup.

   **Migration check** — if `notifyInput` is absent from the frontmatter (existing
   install, not set during original setup), prompt once with `AskUserQuestion`:
   > "tickler has a new setting: when it needs your input (e.g. to confirm a merge),
   > how should it alert you?"
   > - `push` **(Recommended)** — system notification + Remote Control push
   > - `none` — no alert; tickler waits silently

   Save the chosen value by adding `notifyInput: <value>` to the YAML frontmatter
   of `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` (read the file, insert the line after
   `notify:`, rewrite with the Write tool). Then continue the check cycle.

2. Run `date -u +"%Y-%m-%dT%H:%M:%SZ" && date +"%H %u"` via Bash to get
   the actual `current_time` (UTC ISO 8601), `local_hour` (0–23), and
   `local_dow` (1=Mon … 7=Sun). Do NOT estimate or infer the time from
   context.

   **If outside work hours** (`local_hour >= endHour` or `local_hour < startHour`
   or `local_dow` outside `days`): skip steps 3–5 entirely and go directly
   to step 6. Do NOT run `check.js` or make any API calls.

3. Run `check.js` directly via Bash (resolving `env:` token prefixes from config):
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/check.js \
     --data $CLAUDE_PLUGIN_DATA \
     --token <githubToken> \
     --jira-base-url <jiraBaseUrl> \
     --jira-email <jiraEmail> \
     --jira-token <jiraToken> \
     --base <interval> \
     [--min <intervalMin>] [--max <intervalMax>]
   ```
   Parse output: `items_checked`, `changed[]`, `terminal_items[]`, `next_interval`.
   State and `changed_pending.json` are saved by `check.js` automatically.
   Use `next_interval` from the output in step 6 instead of the static `interval` config value.

   **If `items_checked === 0`** (empty watch list): skip to step 6 (scheduling).
   Report `items_checked: 0`, all other counts 0.

4. **If `changed` is empty**: no agent needed.
   If `terminal_items` is non-empty and `autoRemoveTerminal` is `true`, remove
   each one directly — no agent spawn required:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js remove-item \
     --data $CLAUDE_PLUGIN_DATA "<url>"
   ```
   Set `items_removed` to the count removed. Skip to step 6.
   Report `items_checked: N`, `items_changed: 0`, `items_removed: N`, all others 0.

5. **Changes detected** — choose script path or agent path:

   **Use script path** when ALL of these are true:
   - `notify === "direct"`
   - No `pending_actions` entry across any changed item has `do` equal to
     `"run"`, `"slack_dm"`, or `"interactive"`, or starting with `"todoist_"`
   - No `pending_actions` entry has `confirm: true`

   **Script path** — run `notify.js` directly (no agent spawned):
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/notify.js \
     --data $CLAUDE_PLUGIN_DATA \
     --skill-dir $SKILL_SCRIPTS_DIR/scripts \
     [--jira-base-url <jiraBaseUrl>] [--jira-email <jiraEmail>] [--jira-token <jiraToken>]
   ```
   notify.js reads `changed_pending.json` written by check.js and deletes it on completion.
   Parse MONITOR_SUMMARY from its stdout. Set `actions_pending_confirm: 0`
   and `interactive_pending: 0`.

   **Agent path** (Slack, `run`/`interactive`/`confirm` actions) —
   **Read** `$SKILL_SCRIPTS_DIR/agents/monitor-prompt.md`,
   then **Dispatch Agent** (`model: haiku`) with the monitor prompt. Pass as
   part of the prompt text:
   - `SKILL_SCRIPTS_DIR=<resolved path>`
   - `CLAUDE_PLUGIN_DATA=<resolved path>`
   - `notify=<value>` and `autoRemoveTerminal=<value>` from config
   - `slackUserId=<value>` (if notify is "slack")
   - `jiraBaseUrl`, `jiraEmail`, `jiraToken` (if non-empty)
   - `current_time=<ISO 8601 UTC timestamp>`
   - `CHANGED_ITEMS=<changed[] array as compact JSON string>`

   Receive `MONITOR_SUMMARY` from the agent. Parse `notifications_sent`,
   `actions_fired`, `actions_pending_confirm`, `interactive_pending`,
   and `changed_urls` from it. Use `changed[].length` for `items_changed`
   and `terminal_items` handled in step 4 for `items_removed`.

5a. If `openInBrowser: true` in config and `changed_urls` is non-empty,
    open each URL in the browser — one separate Bash call per URL:
    ```
    open "<url1>"
    open "<url2>"
    ```
    (Multi-arg `open` causes blank pages on macOS; one call per URL is required.)

5b. If `actions_pending_confirm` > 0, and `notifyInput` is `"push"`, fire
    `PushNotification` with `message: "tickler: [N] action(s) need your approval"`,
    `status: "proactive"` before presenting questions.

    **Read** `${CLAUDE_PLUGIN_DATA}/pending_actions.json`. For each action, use
    `AskUserQuestion` to prompt the user before firing:
    > "[label] — [url] triggered '[on]'. Execute '[do]'?"
    - Yes → call `actions.js` with the action's verb and args (same invocation
      as the monitor agent uses in Step 3), then remove the item from
      `pending_actions.json`.
    - No → remove the item from `pending_actions.json` without executing.

5c. If `interactive_pending` > 0, and `notifyInput` is `"push"`, fire
    `PushNotification` once (before the first item) with
    `message: "tickler: [item.label] needs your input"` (use first item's label),
    `status: "proactive"`.

    **Read** `${CLAUDE_PLUGIN_DATA}/interactive_pending.json`. For each item, run
    this loop until the user dismisses:

    **Present** `AskUserQuestion` with:
    - Question: `item.prompt`
    - Options: `item.options` (pre-wired) + any context-aware additions you
      identify from `item.context` (e.g. "Approve PR" if `approvals === 0`)
    - Always append built-ins: `Snooze 1h` / `Snooze 4h` / `Snooze tomorrow`
      / `Remove from watch` / `Dismiss` / `Other`

    **Execute** the chosen option:
    - Tier-1 verb (`comment`, `close`, `merge`, `jira_transition`,
      `remove_from_watch`) → call `actions.js` using the chosen option's `do`
      and `args` fields:
      ```bash
      node <SKILL_SCRIPTS_DIR>/scripts/actions.js \
        --do <option.do> --url <item.url> --data <CLAUDE_PLUGIN_DATA> \
        [--body <option.args.body>] [--method <option.args.method>] \
        [--admin <option.args.admin>] [--to <option.args.to>]
      ```
    - Tier-2 verb (`run`) → dispatch Agent with `option.args.cmd` as the
      prompt and `item.url` appended as context (same pattern as the monitor
      agent uses for `run` actions)
    - `Snooze 1h` → `node state.js set-state --data $CLAUDE_PLUGIN_DATA '<url>' '{"snoozed_until":"<now+1h ISO>"}'`
    - `Snooze 4h` → same with now+4h
    - `Snooze tomorrow` → same with start of next work day (next calendar day
      at `startHour:00` according to config — skip weekends if `days` excludes them)
    - `Remove from watch` → `node state.js remove-item --data $CLAUDE_PLUGIN_DATA '<url>'`
    - `Dismiss` → no action; exit loop for this item
    - `Other` → print item context inline and enter free-form conversation:
      ```
      [item.label] — [item.url]
      Condition: [item.on] | [key context fields from item.context]

      What would you like to do?
      ```
      Handle the user's request naturally (call scripts as needed), then ask
      "Anything else on '[item.label]'?" to return to the options loop.

    After each execution (except Dismiss): ask "Anything else on '[item.label]'?"
    - Yes → loop back to AskUserQuestion
    - No / Dismiss → move to next item

    After all items handled: delete `interactive_pending.json`.

6. **Schedule next run** using `ScheduleWakeup`. The session ends after this
   turn and goes dormant until the wakeup fires — no persistent "Working" state.

   Use `next_interval` (from adaptive-interval.js) as the delay. If step 3 was
   skipped (empty watch list), use `interval` from config.
   - If step 3 returned `items_checked === 0` (empty list), run
     `date -u +"%Y-%m-%dT%H:%M:%SZ" && date +"%H %u"` to get
     `local_hour` and `local_dow` now — do NOT estimate
   - Outside work hours (`local_hour >= endHour` or `local_hour < startHour`
     or `local_dow` outside `days`):
     → `ScheduleWakeup(delaySeconds: 3600, prompt: "/tickler:tickler", reason: "tickler out-of-hours — waiting for startHour")`
     Do NOT run `check.js`. This wakeup is time-keeping only — no API calls,
     no notifications, no state changes. The next wakeup will re-check the
     time and either skip again or proceed to step 3.
   - Within work hours:
     → `ScheduleWakeup(delaySeconds: min(next_interval * 60, 3600), prompt: "/tickler:tickler", reason: "tickler check")`

   No `CronList`, `CronCreate`, or `CronDelete` calls needed — `ScheduleWakeup`
   always anchors to now, so drift is corrected automatically each cycle.

7. **Report** to user:
   - items_checked, items_changed, notifications_sent, items_removed,
     actions_fired (from MONITOR_SUMMARY)
   - Next run scheduled for: `<time>`
   - If `cycle_count` from check.js output is a non-zero multiple of 10,
     append: "💡 Tip: Run `/compact` to trim session history and keep
     per-cycle token cost low (this session has run `cycle_count` cycles)."

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
