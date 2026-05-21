# tickler `interactive` Action Verb — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `interactive` tier-2 action verb that, when triggered, presents the user with a menu of options and a free-form conversation loop instead of firing a single pre-wired action.

**Architecture:** The monitor agent (haiku) detects the trigger and writes `interactive_pending.json` — it does not execute anything. The parent skill (SKILL.md) reads the file in a new step 5c, presents options via `AskUserQuestion`, executes the chosen action via existing scripts, and loops until dismissed. Free-form mode requires no new agent — the parent skill is Claude in conversation.

**Tech Stack:** Markdown prompt files only. No new scripts. `actions.js` and `state.js` are called unchanged.

---

## File Map

| File | Change |
|---|---|
| `plugins/tickler/skills/tickler/agents/monitor-prompt.md` | Add `interactive` to Tier-2 section; add `interactive_pending.json` write logic; add `interactive_pending: N` to MONITOR_SUMMARY |
| `plugins/tickler/skills/tickler/SKILL.md` | Add step 5c (interaction loop) after 5b; parse `interactive_pending` from MONITOR_SUMMARY |
| `plugins/tickler/skills/tickler/workflow/ADD.md` | Add `interactive` to verb table; add config example |
| `plugins/tickler/README.md` | Add recipe: CI failure → interactive response |

---

## Task 1: Update monitor-prompt.md — Tier-2 section + MONITOR_SUMMARY

**Files:**
- Modify: `plugins/tickler/skills/tickler/agents/monitor-prompt.md`

- [ ] **Step 1: Add `interactive` to the Tier-2 actions section**

Find this block (currently lines 105–114):

```
**Tier-2 actions** (`run`, `slack_dm`) — always execute immediately
(these are never subject to confirm, as they are themselves agentic):

- `run`: dispatch an **Agent** with `args.cmd` (a slash command or prompt
  string) as the prompt, plus the item URL as context.
- `slack_dm`: use the Slack MCP `slack_send_message` tool to DM
  `slackUserId` with `args.body`.

Track totals: `actions_fired` (executed this cycle),
`actions_pending_confirm` (written to pending_actions.json).
```

Replace with:

```
**Tier-2 actions** (`run`, `slack_dm`, `interactive`) — always execute immediately
(these are never subject to confirm, as they are themselves agentic):

- `run`: dispatch an **Agent** with `args.cmd` (a slash command or prompt
  string) as the prompt, plus the item URL as context.
- `slack_dm`: use the Slack MCP `slack_send_message` tool to DM
  `slackUserId` with `args.body`.
- `interactive`: do NOT execute. Write the item to
  `<CLAUDE_PLUGIN_DATA>/interactive_pending.json` (append or create):
  ```json
  [{
    "url": "<item-url>",
    "label": "<item title from state>",
    "on": "<triggering condition>",
    "prompt": "<args.prompt>",
    "options": <args.options or []>,
    "context": <full newState object from CHECK_OUTPUT for this item>
  }]
  ```
  Then call `append-fired-action` as normal. If `notify` is `"slack"`,
  skip `interactive` actions with a logged warning — they only work in
  `direct` mode.

Track totals: `actions_fired` (executed this cycle),
`actions_pending_confirm` (written to pending_actions.json),
`interactive_pending` (written to interactive_pending.json).
```

- [ ] **Step 2: Add `interactive_pending` to MONITOR_SUMMARY**

Find the Return block:

```
MONITOR_SUMMARY
items_checked: N
items_changed: N
notifications_sent: N
items_removed: N
actions_fired: N
actions_pending_confirm: N
changed_urls: <comma-separated URLs from changed[], or empty>
```

Replace with:

```
MONITOR_SUMMARY
items_checked: N
items_changed: N
notifications_sent: N
items_removed: N
actions_fired: N
actions_pending_confirm: N
interactive_pending: N
changed_urls: <comma-separated URLs from changed[], or empty>
```

- [ ] **Step 3: Verify the edit reads correctly**

Read `agents/monitor-prompt.md` and confirm:
- `interactive` appears in the Tier-2 header line alongside `run` and `slack_dm`
- The `interactive_pending.json` write block is present with the correct JSON schema
- `interactive_pending: N` appears in MONITOR_SUMMARY
- The slack-mode skip warning is present

- [ ] **Step 4: Commit**

```bash
git add plugins/tickler/skills/tickler/agents/monitor-prompt.md
git commit -m "feat(tickler): add interactive verb to monitor-prompt — writes interactive_pending.json"
```

---

## Task 2: Update SKILL.md — parse interactive_pending + step 5c

**Files:**
- Modify: `plugins/tickler/skills/tickler/SKILL.md`

- [ ] **Step 1: Add `interactive_pending` to the MONITOR_SUMMARY parse line**

Find (line ~135):

```
   Receive `MONITOR_SUMMARY` from the agent. Parse `items_checked`,
   `items_changed`, `notifications_sent`, `items_removed`, `actions_fired`,
   `actions_pending_confirm`, and `changed_urls` from it.
```

Replace with:

```
   Receive `MONITOR_SUMMARY` from the agent. Parse `items_checked`,
   `items_changed`, `notifications_sent`, `items_removed`, `actions_fired`,
   `actions_pending_confirm`, `interactive_pending`, and `changed_urls` from it.
```

- [ ] **Step 2: Insert step 5c after step 5b**

Find the block ending step 5b (line ~155):

```
    - No → remove the item from `pending_actions.json` without executing.

6. **Schedule next run** using `CronList` then `CronCreate`.
```

Replace with:

```
    - No → remove the item from `pending_actions.json` without executing.

5c. If `interactive_pending` > 0, **Read**
    `${CLAUDE_PLUGIN_DATA}/interactive_pending.json`. For each item, run
    this loop until the user dismisses:

    **Present** `AskUserQuestion` with:
    - Question: `item.prompt`
    - Options: `item.options` (pre-wired) + any context-aware additions you
      identify from `item.context` (e.g. "Approve PR" if `approvals === 0`)
    - Always append built-ins: `Snooze 1h` / `Snooze 4h` / `Snooze tomorrow`
      / `Remove from watch` / `Dismiss` / `Other`

    **Execute** the chosen option:
    - Tier-1 verb (`comment`, `close`, `merge`, `jira_transition`,
      `remove_from_watch`) → call `actions.js` (same invocation as step 5b)
    - Tier-2 verb (`run`) → dispatch Agent with `args.cmd` + item URL as context
    - `Snooze 1h` → `node state.js set-state --data $CLAUDE_PLUGIN_DATA '<url>' '{"snoozed_until":"<now+1h ISO>"}'`
    - `Snooze 4h` → same with now+4h
    - `Snooze tomorrow` → same with start of next work day (`startHour:00`)
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

6. **Schedule next run** using `CronList` then `CronCreate`.
```

- [ ] **Step 3: Verify the edit reads correctly**

Read `SKILL.md` and confirm:
- `interactive_pending` appears in the MONITOR_SUMMARY parse line in step 5
- Step 5c is present between 5b and step 6
- The step 5c loop covers all option types: tier-1 verbs, tier-2 `run`, all three snooze variants, Remove, Dismiss, Other/free-form
- File deletion at end of 5c is present

- [ ] **Step 4: Commit**

```bash
git add plugins/tickler/skills/tickler/SKILL.md
git commit -m "feat(tickler): add step 5c interaction loop for interactive_pending actions"
```

---

## Task 3: Update ADD.md — verb table + config example

**Files:**
- Modify: `plugins/tickler/skills/tickler/workflow/ADD.md`

- [ ] **Step 1: Add `interactive` to the verb table**

Find the verb table (lines ~63–71):

```
   | Verb | Notes | confirm default |
   |---|---|---|
   | `merge` | `args.method`: `squash` (default), `merge`, `rebase` | `true` |
   | `close` | Closes issue or PR | `true` |
   | `comment` | Posts `args.body` as a comment | `false` |
   | `jira_transition` | Transitions to `args.to` status | `false` |
   | `remove_from_watch` | Drops from tickler.json | `false` |
   | `run` | Dispatches `args.cmd` as an Agent prompt | `false` |
   | `slack_dm` | DMs `args.body` to the configured slackUserId | `false` |
```

Replace with:

```
   | Verb | Notes | confirm default |
   |---|---|---|
   | `merge` | `args.method`: `squash` (default), `merge`, `rebase`; `args.admin: true` to bypass branch protection | `true` |
   | `close` | Closes issue or PR | `true` |
   | `comment` | Posts `args.body` as a comment | `false` |
   | `jira_transition` | Transitions to `args.to` status | `false` |
   | `remove_from_watch` | Drops from tickler.json | `false` |
   | `run` | Dispatches `args.cmd` as an Agent prompt | `false` |
   | `slack_dm` | DMs `args.body` to the configured slackUserId | `false` |
   | `interactive` | Presents a menu + free-form conversation loop to the user (direct mode only); `args.prompt` required, `args.options[]` optional | N/A |
```

- [ ] **Step 2: Add an `interactive` example to the GitHub PR actions examples**

Find the GitHub PR examples block (around line 46–52):

```
   **GitHub PR:**
   - `When approved → merge (squash)` — `{ "on": "approved", "do": "merge", "confirm": true }`
   - `When merged → transition Jira ticket` — `{ "on": "merged", "do": "jira_transition", "args": { "to": "Done" } }`
   - `When merged → remove from watch list` — `{ "on": "merged", "do": "remove_from_watch" }`
   - `When merged → run a command` — `{ "on": "merged", "do": "run", "args": { "cmd": "/my-skill" } }`
```

Add one more line:

```
   **GitHub PR:**
   - `When approved → merge (squash)` — `{ "on": "approved", "do": "merge", "confirm": true }`
   - `When merged → transition Jira ticket` — `{ "on": "merged", "do": "jira_transition", "args": { "to": "Done" } }`
   - `When merged → remove from watch list` — `{ "on": "merged", "do": "remove_from_watch" }`
   - `When merged → run a command` — `{ "on": "merged", "do": "run", "args": { "cmd": "/my-skill" } }`
   - `When CI fails → interactive menu` — `{ "on": "ci-failed", "do": "interactive", "args": { "prompt": "CI failed — how do you want to respond?", "options": [{ "label": "Post a comment", "do": "comment", "args": { "body": "CI failed — investigating" } }, { "label": "Close PR", "do": "close" }] } }`
```

- [ ] **Step 3: Verify the edit reads correctly**

Read `workflow/ADD.md` and confirm:
- `interactive` row is present in the verb table with correct notes
- The CI-failed example is present in the GitHub PR examples block
- No other rows were accidentally modified

- [ ] **Step 4: Commit**

```bash
git add plugins/tickler/skills/tickler/workflow/ADD.md
git commit -m "docs(tickler): add interactive verb to ADD.md verb table and examples"
```

---

## Task 4: Update README.md — recipe + verb table

**Files:**
- Modify: `plugins/tickler/README.md`

- [ ] **Step 1: Add `interactive` to the verb table**

Find the verb table in the Actions section:

```
| `merge` | `gh pr merge` (`args.method`: squash/merge/rebase; `args.admin: true` to bypass branch protection) | `true` |
| `close` | Closes the PR or issue | `true` |
| `comment` | Posts `args.body` as a comment | `false` |
| `jira_transition` | Transitions Jira ticket to `args.to` status | `false` |
| `remove_from_watch` | Removes item from the watch list | `false` |
| `run` | Dispatches `args.cmd` as an Agent prompt | `false` |
| `slack_dm` | DMs `args.body` to your configured Slack user | `false` |
```

Replace with:

```
| `merge` | `gh pr merge` (`args.method`: squash/merge/rebase; `args.admin: true` to bypass branch protection) | `true` |
| `close` | Closes the PR or issue | `true` |
| `comment` | Posts `args.body` as a comment | `false` |
| `jira_transition` | Transitions Jira ticket to `args.to` status | `false` |
| `remove_from_watch` | Removes item from the watch list | `false` |
| `run` | Dispatches `args.cmd` as an Agent prompt | `false` |
| `slack_dm` | DMs `args.body` to your configured Slack user | `false` |
| `interactive` | Presents a menu + free-form conversation when triggered (`args.prompt` required, `args.options[]` optional; direct mode only) | N/A |
```

- [ ] **Step 2: Add a recipe for interactive CI failure response**

Find the last recipe before `## Actions` (the Jira recipe):

```
### Watch a Jira ticket → notify when done

```text
/tickler add PROJ-789 status:Done
```

Tickler notifies you when the ticket transitions to Done. Combine with `remove_from_watch` to auto-clean the list.

---

## Actions
```

Insert a new recipe before `## Actions`:

```
### Watch a PR for CI failure → interactive response

```text
/tickler add https://github.com/org/repo/pull/123 ci-failed
```

When prompted for actions, set:
- When `ci-failed` → `interactive`, prompt: "CI failed — how do you want to respond?", options:
  - Post a comment (`comment`, body: "CI failed — investigating")
  - Close PR (`close`)

When CI fails, tickler presents the menu and waits for your input. Choose an option or say anything — tickler enters a free-form conversation with full PR context loaded.

---

## Actions
```

- [ ] **Step 3: Verify the edit reads correctly**

Read `README.md` and confirm:
- `interactive` row appears in the Actions verb table
- The CI failure interactive recipe appears in the Recipes section before `## Actions`
- No existing content was accidentally removed or duplicated

- [ ] **Step 4: Commit**

```bash
git add plugins/tickler/README.md
git commit -m "docs(tickler): add interactive verb to README verb table and recipes"
```

---

## Task 5: Open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git checkout -b feat/tickler-interactive-action
# cherry-pick or push directly if already on the right branch
git push -u origin feat/tickler-interactive-action
gh pr create \
  --title "feat(tickler): interactive action verb — menu + free-form conversation on trigger" \
  --body "Adds the \`interactive\` tier-2 action verb. When triggered, the monitor agent writes to \`interactive_pending.json\`. The parent skill presents an \`AskUserQuestion\` menu (pre-wired options + built-ins), executes the chosen action, and loops until dismissed. Picking 'Other' opens a free-form conversation with full item context. Closes the gap between binary confirm gates and fully agentic actions."
```

- [ ] **Step 2: Verify PR is open and links back to the design spec**

```bash
gh pr view --web
```

---

## Self-Review

**Spec coverage:**
- ✓ `interactive` verb config format (Task 3, 4)
- ✓ `interactive_pending.json` schema (Task 1)
- ✓ Monitor agent writes file, calls `append-fired-action`, adds to MONITOR_SUMMARY (Task 1)
- ✓ Slack-mode skip warning (Task 1)
- ✓ Parent skill step 5c with full option type coverage (Task 2)
- ✓ Free-form "Other" mode (Task 2)
- ✓ File deletion after all items handled (Task 2)
- ✓ Context-aware option supplementation by parent skill (Task 2 — covered in step 5c instructions)
- ✓ Multi-step loop ("Anything else?") (Task 2)
- ✓ README recipe (Task 4)

**No placeholders:** All edits show exact text to find and exact replacement text.

**Type consistency:** No new code types introduced — all existing script interfaces used unchanged.
