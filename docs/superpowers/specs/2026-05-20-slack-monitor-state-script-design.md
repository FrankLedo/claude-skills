# Slack Monitor — State Script + Haiku Agent Design

**Date:** 2026-05-20
**Goal:** Reduce token usage per scan cycle and switch monitor agent to the cheapest model.

## Problem

The slack-monitor monitor agent currently reads, parses, and rewrites full JSON state files inline:

- `pending_review.json` — up to 25 items, each containing full message text + 3 drafted replies. The agent reads the whole array just to append or remove one item.
- `search_cache.json` — thread read cache read wholesale, modified in memory, pruned, written back.
- `cycle_checkpoint.json` — read and overwritten multiple times per cycle.

This inline JSON manipulation consumes tokens on every cycle and prevents using a cheaper model.

## Solution

### 1. New Script: `scripts/state.js`

A Node.js script (built-in modules only) becomes the sole I/O layer for all three JSON state files. Mirrors the pattern established in `tickler/scripts/state.js`: atomic tmp→rename writes, `--data <dir>` flag.

**Commands:**

| Namespace | Command | Description |
|---|---|---|
| pending | `pending-list` | Print all pending_review.json items as JSON |
| pending | `pending-count` | Print item count as integer |
| pending | `pending-add <json>` | Atomically append item; deduplicates by `id` |
| pending | `pending-remove <id>` | Atomically remove item by `id` |
| cache | `cache-get <key>` | Print single cache entry or `null` |
| cache | `cache-set <key> <json>` | Atomically update one entry |
| cache | `cache-prune` | Remove entries where `checked_at_epoch` > 86400s ago |
| checkpoint | `checkpoint-read` | Print checkpoint JSON or `{}` if missing |
| checkpoint | `checkpoint-write <json>` | Atomically write checkpoint |
| checkpoint | `checkpoint-clear` | Write `{}` (success case — marks clean completion) |

`last_scan` is a plain-text single-line file. No script needed — direct Read/Write stays.

Usage pattern:
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" pending-add '<json>' --data "$CLAUDE_PLUGIN_DATA"
```

### 2. Monitor Agent Changes (`agents/monitor-prompt.md`)

All inline JSON read/parse/write sequences replaced with script calls:

| Step | Current | Replacement |
|---|---|---|
| 1a — checkpoint read | Read + parse `cycle_checkpoint.json` | `checkpoint-read` |
| 1a — checkpoint write (new) | Write full JSON inline | `checkpoint-write '<json>'` |
| 4 — checkpoint update (mid-batch) | Write full JSON inline each message | `checkpoint-write '<json>'` |
| 5 — checkpoint clear | Write `{}` | `checkpoint-clear` |
| 2 — cache lookup | Read full cache + find key | `cache-get <key>` |
| 5 — cache update | Read full cache + merge + prune + write | `cache-set <key> <json>` then `cache-prune` |
| 4 — pending add | Read full array + append + write | `pending-add '<json>'` |
| review — pending remove | Read full array + filter + write | `pending-remove <id>` |
| review — pending count | `array.length` inline | `pending-count` |

`FORMATS.md` remains the schema reference for agents building pending-review item objects, but the actual file write is always via `pending-add` — agents no longer need to read the file to perform mutations.

### 3. SKILL.md Changes

**Review queue (`review` argument):**
- Replace `Read pending_review.json` with `node state.js pending-list --data <dir>`
- After each user send/skip choice, replace the full read-filter-write sequence with `node state.js pending-remove <id> --data <dir>`

**Monitor agent dispatch (Step 4):**
- Add `model: haiku` to the Agent tool call

**Self-description header:**
- Remove the claim "this skill has no scripts or dependencies" — update to accurately describe the scripts directory.

### 4. What Does NOT Change

- `last_scan` — plain text, read/write directly
- `convert-timestamp.js` — unchanged
- All `workflow/` files (`HANDLE.md`, `GUARDRAILS.md`, `REVIEW.md`, `DM-REVIEW.md`, `SETUP.md`, `FORMATS.md`) — unchanged
- Scheduling logic, config parsing, argument dispatch — unchanged
- `templates/` — unchanged

## Files Touched

| File | Change |
|---|---|
| `plugins/slack-monitor/skills/slack-monitor/scripts/state.js` | New file |
| `plugins/slack-monitor/skills/slack-monitor/agents/monitor-prompt.md` | Replace inline JSON I/O with script calls |
| `plugins/slack-monitor/skills/slack-monitor/SKILL.md` | Use script for review queue; add `model: haiku`; update header |

## Expected Outcome

- Per-cycle token cost drops significantly: no full JSON blob reads when the pending queue is large
- Monitor agent runs on haiku — cheapest available model — for all scan cycles
- Atomic writes eliminate the risk of partial-write corruption on interrupted cycles
- Pattern is consistent with tickler's established approach
