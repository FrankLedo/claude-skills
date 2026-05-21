# Design: tickler `interactive` action verb

**Date:** 2026-05-21
**Status:** Approved, ready for implementation

## Problem

The current action model supports two interaction modes:
- **Fully automated** — tier-1 scripts fire without asking (`confirm: false`)
- **Binary confirm** — `confirm: true` presents a yes/no gate before a single pre-wired action

There is no way to present the user with a menu of options, guide them through a multi-step decision, or open a free-form conversation when a condition triggers. The `run` verb dispatches a sub-agent but it runs in isolation with no user interaction.

## Solution

A new `interactive` tier-2 action verb. When triggered, the monitor agent writes a pending interaction record to `interactive_pending.json`. The parent skill (SKILL.md) picks it up, presents a menu of options via `AskUserQuestion`, executes the chosen action, and loops until the user dismisses. If the user wants to discuss freely, the parent skill enters a natural conversation with full item context loaded.

## Action Config Format

```json
{
  "on": "ci-failed",
  "do": "interactive",
  "args": {
    "prompt": "CI failed on this PR. How do you want to respond?",
    "options": [
      { "label": "Re-run CI",      "do": "run",     "args": { "cmd": "gh workflow run ci.yml" } },
      { "label": "Post a comment", "do": "comment", "args": { "body": "CI failed — investigating" } },
      { "label": "Close PR",       "do": "close" },
      { "label": "Snooze 1h" }
    ]
  }
}
```

- `prompt`: shown to user as the opening question. Required.
- `options`: pre-wired choices. Optional — if omitted, the agent generates options dynamically based on item type and change context.
- Each option maps to a tier-1 verb (`comment`, `close`, `merge`, `jira_transition`, `remove_from_watch`), a tier-2 verb (`run`), or a built-in (`Snooze 1h`, `Snooze 4h`, `Snooze tomorrow`, `Remove from watch`, `Dismiss`).
- The parent skill (Claude in conversation) may append context-aware options to the configured list before presenting — based on the `context` snapshot in `interactive_pending.json` (e.g. "Approve PR" if `approvals === 0`). The monitor agent does not modify options.
- Built-ins (`Snooze`, `Remove from watch`, `Dismiss`, `Other`) are always appended automatically.

## `interactive_pending.json` Schema

Written by the monitor agent; read and cleared by the parent skill.

```json
[
  {
    "url": "https://github.com/org/repo/pull/123",
    "label": "Fix the auth bug",
    "on": "ci-failed",
    "prompt": "CI failed on this PR. How do you want to respond?",
    "options": [
      { "label": "Re-run CI",      "do": "run",     "args": { "cmd": "gh workflow run ci.yml" } },
      { "label": "Post a comment", "do": "comment", "args": { "body": "CI failed — investigating" } },
      { "label": "Close PR",       "do": "close" },
      { "label": "Snooze 1h" }
    ],
    "context": {
      "ci_status": "failure",
      "title": "Fix the auth bug",
      "approvals": 1,
      "changes_requested": false,
      "merged": false,
      "status": "open"
    }
  }
]
```

- `context` is snapshotted from `CHECK_OUTPUT` at detection time. The parent skill and free-form conversation use it directly — no re-fetch from GitHub.
- Multiple items may be present if multiple watches triggered `interactive` in the same cycle.
- The file is deleted when all items have been handled.

## Monitor Agent Changes

When the agent encounters an `interactive` action in `pending_actions`:

1. Write the item record to `interactive_pending.json` (append or create).
2. Do NOT execute any action.
3. Call `state.js append-fired-action` as normal so the `interactive` action does not re-fire next cycle.
4. Increment `interactive_pending` count in `MONITOR_SUMMARY`.

`MONITOR_SUMMARY` gains one new line:
```
interactive_pending: N
```

## Parent Skill — Step 5c (new)

Inserted after existing step 5b (pending_actions confirm gate) in SKILL.md's check cycle.

```
If interactive_pending > 0:
  Read interactive_pending.json

  For each item:
    Loop:
      Present AskUserQuestion:
        - Question: item.prompt
        - Options: item.options (pre-wired) + parent-skill-supplemented options (from context snapshot) + built-ins
          Built-ins always appended: Snooze 1h / Snooze 4h / Snooze tomorrow /
          Remove from watch / Dismiss / Other

      Execute chosen option:
        - Tier-1 verb (comment, close, merge, jira_transition, remove_from_watch)
            → call actions.js
        - Tier-2 verb (run)
            → dispatch Agent with args.cmd + item URL as context
        - Snooze 1h/4h/tomorrow
            → call state.js set-state with snoozed_until
        - Remove from watch
            → call state.js remove-item
        - Dismiss
            → no action; break loop
        - Other
            → enter free-form mode (see below)

      After execution: ask "Anything else on '[label]'?"
        Yes → loop
        No / Dismiss → break loop

  Delete interactive_pending.json
```

### Free-form mode

When the user picks "Other", no new agent is dispatched. The parent skill loads the item context snapshot and presents it inline:

```
PR #123 — "Fix the auth bug"
CI status: failure | Approvals: 1 | Changes requested: no
URL: https://github.com/org/repo/pull/123

What would you like to do?
```

The user types anything. The parent skill responds naturally — calling `actions.js`, `gh` CLI, or `state.js` as needed — and loops until the user is done. This is zero additional complexity: the parent skill is already Claude in a live session.

After free-form resolves: "Anything else on this PR?" → back to the `AskUserQuestion` loop.

## Files Changed

| File | Change |
|---|---|
| `agents/monitor-prompt.md` | Document `interactive` as tier-2; write to `interactive_pending.json`; add `interactive_pending: N` to MONITOR_SUMMARY |
| `SKILL.md` | New step 5c interaction loop; document `interactive_pending` in config section |
| `workflow/ADD.md` | Add `interactive` to verb table with config format example |
| `README.md` | Add recipe: "Watch PR for CI failure → interactive response" to Recipes section |
| `interactive_pending.json` | New runtime state file (not committed; created and deleted by skill) |

No new scripts needed. `actions.js` and `state.js` are called unchanged.

## What Is Not In Scope

- Compound conditions ("approved AND ci-passed") — separate future feature.
- Persistent interaction history — each cycle is stateless; once `interactive_pending.json` is deleted, the interaction is over.
- Slack-mode interactive actions — `interactive` only fires in `direct` notify mode. In `slack` mode, the action is skipped with a warning logged. (Slack DM interactions could be a future extension via `slack_dm` + a follow-up DM-REVIEW flow, but that's out of scope here.)
