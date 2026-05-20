# Slack Monitor — State Script + Haiku Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Node.js state script for atomic JSON I/O and switch the monitor agent to haiku, reducing per-cycle token cost.

**Architecture:** A single `scripts/state.js` (built-in Node.js modules only) becomes the sole I/O layer for `pending_review.json`, `search_cache.json`, and `cycle_checkpoint.json`. Every inline Read/parse/Write sequence in the monitor agent and skill is replaced with a `node state.js <command>` Bash call. The monitor Agent dispatch in SKILL.md gains `model: haiku`.

**Tech Stack:** Node.js (built-ins only: `fs`, `path`). No npm packages. Pattern mirrors `plugins/tickler/skills/tickler/scripts/state.js` exactly.

---

## File Map

| File | Action |
|---|---|
| `plugins/slack-monitor/skills/slack-monitor/scripts/state.js` | **Create** — state API script |
| `plugins/slack-monitor/skills/slack-monitor/agents/monitor-prompt.md` | **Modify** — checkpoint + cache ops |
| `plugins/slack-monitor/skills/slack-monitor/workflow/REVIEW.md` | **Modify** — pending-add in remote-control mode |
| `plugins/slack-monitor/skills/slack-monitor/SKILL.md` | **Modify** — pending-list/remove, haiku model, header, checkpoint-clear |

---

## Task 1: Create `scripts/state.js`

**Files:**
- Create: `plugins/slack-monitor/skills/slack-monitor/scripts/state.js`

All state file paths are derived from the `--data <dir>` flag:
- `pending_review.json` — JSON array of pending review items
- `search_cache.json` — `{ "threads": { "<key>": { "latest_reply_ts": "...", "checked_at_epoch": N } } }`
- `cycle_checkpoint.json` — arbitrary JSON object

`pending-add` supports both inline JSON (positional arg) and `--file <path>` (for message content containing shell-special characters).

- [ ] **Step 1: Create the scripts directory and write state.js**

```bash
mkdir -p "plugins/slack-monitor/skills/slack-monitor/scripts"
```

Write `plugins/slack-monitor/skills/slack-monitor/scripts/state.js`:

```javascript
#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const cmd  = argv[0];

const dataIdx = argv.indexOf('--data');
if (dataIdx === -1 || !argv[dataIdx + 1]) {
  die('Usage: node state.js <command> --data <dir> [args...]');
}
const dataDir = argv[dataIdx + 1];

// positional args: everything except cmd, --data, and its value
const pos = argv.filter((_, i) => i !== 0 && i !== dataIdx && i !== dataIdx + 1);

const fileIdx = argv.indexOf('--file');
const filePath = fileIdx !== -1 ? argv[fileIdx + 1] : null;

function die(msg) { console.error(msg); process.exit(1); }

function readJSON(p, fallback) {
  try {
    const raw = fs.readFileSync(p, 'utf8').trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeAtomic(p, data) {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, p);
}

const pendingPath    = path.join(dataDir, 'pending_review.json');
const cachePath      = path.join(dataDir, 'search_cache.json');
const checkpointPath = path.join(dataDir, 'cycle_checkpoint.json');

switch (cmd) {

  // ── pending_review.json ──────────────────────────────────────────────────

  case 'pending-list': {
    console.log(JSON.stringify(readJSON(pendingPath, []), null, 2));
    break;
  }

  case 'pending-count': {
    console.log(readJSON(pendingPath, []).length);
    break;
  }

  case 'pending-add': {
    const jsonStr = filePath
      ? fs.readFileSync(filePath, 'utf8')
      : pos.filter((_, i) => {
          // strip --file and its value from pos if present
          return true;
        })[0];
    if (!jsonStr) die('pending-add requires <json> or --file <path>');
    const item = JSON.parse(jsonStr);
    if (!item.id) die('pending-add: item must have an id field');
    const items = readJSON(pendingPath, []);
    if (!items.some(i => i.id === item.id)) {
      items.push(item);
      writeAtomic(pendingPath, items);
      console.log(`Added: ${item.id}`);
    } else {
      console.log(`Duplicate skipped: ${item.id}`);
    }
    break;
  }

  case 'pending-remove': {
    const id = pos[0];
    if (!id) die('pending-remove requires <id>');
    const items = readJSON(pendingPath, []);
    const kept  = items.filter(i => i.id !== id);
    writeAtomic(pendingPath, kept);
    console.log(`Removed: ${id}`);
    break;
  }

  // ── search_cache.json ────────────────────────────────────────────────────

  case 'cache-get': {
    const key   = pos[0];
    if (!key) die('cache-get requires <key>');
    const cache = readJSON(cachePath, { threads: {} });
    console.log(JSON.stringify(cache.threads[key] ?? null, null, 2));
    break;
  }

  case 'cache-set': {
    const key    = pos[0];
    const valStr = filePath ? fs.readFileSync(filePath, 'utf8') : pos[1];
    if (!key || !valStr) die('cache-set requires <key> <json> (or --file <path>)');
    const cache = readJSON(cachePath, { threads: {} });
    cache.threads[key] = JSON.parse(valStr);
    writeAtomic(cachePath, cache);
    console.log(`Cache updated: ${key}`);
    break;
  }

  case 'cache-prune': {
    const cache  = readJSON(cachePath, { threads: {} });
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    let removed  = 0;
    for (const key of Object.keys(cache.threads)) {
      if ((cache.threads[key].checked_at_epoch ?? 0) < cutoff) {
        delete cache.threads[key];
        removed++;
      }
    }
    writeAtomic(cachePath, cache);
    console.log(`Pruned ${removed} cache entries`);
    break;
  }

  // ── cycle_checkpoint.json ────────────────────────────────────────────────

  case 'checkpoint-read': {
    console.log(JSON.stringify(readJSON(checkpointPath, {}), null, 2));
    break;
  }

  case 'checkpoint-write': {
    const jsonStr = filePath ? fs.readFileSync(filePath, 'utf8') : pos[0];
    if (!jsonStr) die('checkpoint-write requires <json> or --file <path>');
    writeAtomic(checkpointPath, JSON.parse(jsonStr));
    console.log('Checkpoint written');
    break;
  }

  case 'checkpoint-clear': {
    writeAtomic(checkpointPath, {});
    console.log('Checkpoint cleared');
    break;
  }

  default:
    die(
      `Unknown command: ${cmd}\n` +
      'Commands: pending-list, pending-count, pending-add, pending-remove, ' +
      'cache-get, cache-set, cache-prune, ' +
      'checkpoint-read, checkpoint-write, checkpoint-clear'
    );
}
```

- [ ] **Step 2: Verify pending commands**

```bash
DATA=$(mktemp -d)
SCRIPT="plugins/slack-monitor/skills/slack-monitor/scripts/state.js"

node "$SCRIPT" pending-count --data "$DATA"
# Expected: 0

node "$SCRIPT" pending-add '{"id":"1234.567-C001","from":"Alice","message_text":"hi"}' --data "$DATA"
# Expected: Added: 1234.567-C001

node "$SCRIPT" pending-count --data "$DATA"
# Expected: 1

node "$SCRIPT" pending-add '{"id":"1234.567-C001","from":"Alice","message_text":"hi"}' --data "$DATA"
# Expected: Duplicate skipped: 1234.567-C001

echo '{"id":"1234.568-C001","from":"Bob","message_text":"it'\''s working"}' > "$DATA/item.json"
node "$SCRIPT" pending-add --file "$DATA/item.json" --data "$DATA"
# Expected: Added: 1234.568-C001

node "$SCRIPT" pending-list --data "$DATA"
# Expected: JSON array with 2 items

node "$SCRIPT" pending-remove "1234.567-C001" --data "$DATA"
# Expected: Removed: 1234.567-C001

node "$SCRIPT" pending-count --data "$DATA"
# Expected: 1

rm -rf "$DATA"
```

- [ ] **Step 3: Verify cache commands**

```bash
DATA=$(mktemp -d)
SCRIPT="plugins/slack-monitor/skills/slack-monitor/scripts/state.js"

node "$SCRIPT" cache-get "1234.000-C001" --data "$DATA"
# Expected: null

node "$SCRIPT" cache-set "1234.000-C001" '{"latest_reply_ts":"1234.999","checked_at_epoch":9999999999}' --data "$DATA"
# Expected: Cache updated: 1234.000-C001

node "$SCRIPT" cache-get "1234.000-C001" --data "$DATA"
# Expected: {"latest_reply_ts":"1234.999","checked_at_epoch":9999999999}

node "$SCRIPT" cache-set "old-key" '{"latest_reply_ts":"0","checked_at_epoch":1}' --data "$DATA"
node "$SCRIPT" cache-prune --data "$DATA"
# Expected: Pruned 1 cache entries

node "$SCRIPT" cache-get "old-key" --data "$DATA"
# Expected: null

rm -rf "$DATA"
```

- [ ] **Step 4: Verify checkpoint commands**

```bash
DATA=$(mktemp -d)
SCRIPT="plugins/slack-monitor/skills/slack-monitor/scripts/state.js"

node "$SCRIPT" checkpoint-read --data "$DATA"
# Expected: {}

node "$SCRIPT" checkpoint-write '{"started_at":"2026-05-20T00:00:00Z","last_step":"init","processed_ids":[]}' --data "$DATA"
# Expected: Checkpoint written

node "$SCRIPT" checkpoint-read --data "$DATA"
# Expected: {"started_at":"2026-05-20T00:00:00Z","last_step":"init","processed_ids":[]}

node "$SCRIPT" checkpoint-clear --data "$DATA"
# Expected: Checkpoint cleared

node "$SCRIPT" checkpoint-read --data "$DATA"
# Expected: {}

rm -rf "$DATA"
```

- [ ] **Step 5: Commit**

```bash
git add plugins/slack-monitor/skills/slack-monitor/scripts/state.js
git commit -m "feat(slack-monitor): add scripts/state.js — atomic JSON state API"
```

---

## Task 2: Update `agents/monitor-prompt.md` — checkpoint and cache

**Files:**
- Modify: `plugins/slack-monitor/skills/slack-monitor/agents/monitor-prompt.md`

Replace all inline checkpoint and cache Read/Write sequences with script calls.
`SKILL_SCRIPTS_DIR` and `CLAUDE_PLUGIN_DATA` are already injected into the agent prompt as resolved paths.

- [ ] **Step 1: Replace Step 1a checkpoint read/write**

Find and replace this block in `agents/monitor-prompt.md`:

Old:
```
**Read** `<CLAUDE_PLUGIN_DATA>/cycle_checkpoint.json`. If it exists:
- Parse `started_at` and `last_step`. If `started_at` is within the
  last 30 minutes, this is a resumable interrupted cycle.
- Load `processed_ids` (array of message IDs already handled).
- Resume from the step after `last_step`. Skip any message whose `id`
  appears in `processed_ids`.
- Log: `"RESUME: continuing interrupted cycle from step <last_step>"`

If the file does not exist (or `started_at` > 30 min ago), start
fresh. **Write** a new checkpoint immediately:
```json
{
  "started_at": "<current_time>",
  "last_step": "init",
  "processed_ids": []
}
```
```

New:
```
Run:
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" checkpoint-read --data "$CLAUDE_PLUGIN_DATA"
```
Parse the JSON output. If the result is `{}`, or if `started_at` is
more than 30 minutes before `current_time`, start fresh and run:
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" checkpoint-write \
  '{"started_at":"<current_time>","last_step":"init","processed_ids":[]}' \
  --data "$CLAUDE_PLUGIN_DATA"
```
If `started_at` is within the last 30 minutes, resume from `last_step`
and skip any message whose `id` appears in `processed_ids`.
Log: `"RESUME: continuing interrupted cycle from step <last_step>"`
```

- [ ] **Step 2: Replace Step 2 (Search C) cache lookup**

Find this line in the Search C section of Step 2:

Old:
```
(check `search_cache.json` before reading threads — skip any thread_ts
already in the cache)
```

New:
```
Before reading each thread, check the cache:
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" cache-get "<thread_ts>-<channel_id>" \
  --data "$CLAUDE_PLUGIN_DATA"
```
If the result is not `null` and `checked_at_epoch >= last_scan_epoch`,
skip reading this thread.
```

- [ ] **Step 3: Replace Step 4 mid-batch checkpoint update**

Find this block in Step 4:

Old:
```
After processing **each individual message**, append its `id` to
`processed_ids` in the checkpoint and update `"last_step": "handle"`:
```json
{
  "started_at": "<original>",
  "last_step": "handle",
  "processed_ids": ["<id1>", "<id2>", ...]
}
```
This allows resuming mid-batch if interrupted.
```

New:
```
After processing **each individual message**, update the checkpoint
(build the JSON with the accumulated `processed_ids` list):
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" checkpoint-write \
  '{"started_at":"<original_started_at>","last_step":"handle","processed_ids":["<id1>","<id2>"]}' \
  --data "$CLAUDE_PLUGIN_DATA"
```
This allows resuming mid-batch if interrupted.
```

- [ ] **Step 4: Replace Step 5 cache write**

Find this block in Step 5:

Old:
```
If there are new thread reads not previously in the cache, **Write**
the merged cache to `<CLAUDE_PLUGIN_DATA>/search_cache.json`.
```

New:
```
For each thread newly read this cycle (not previously in the cache),
run:
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" cache-set "<thread_ts>-<channel_id>" \
  '{"latest_reply_ts":"<ts>","checked_at_epoch":<epoch>}' \
  --data "$CLAUDE_PLUGIN_DATA"
```
After all cache-set calls, prune stale entries:
```bash
node "$SKILL_SCRIPTS_DIR/scripts/state.js" cache-prune --data "$CLAUDE_PLUGIN_DATA"
```
```

- [ ] **Step 5: Commit**

```bash
git add plugins/slack-monitor/skills/slack-monitor/agents/monitor-prompt.md
git commit -m "feat(slack-monitor): replace inline checkpoint/cache I/O with state.js calls"
```

---

## Task 3: Update `workflow/REVIEW.md` — pending queue write

**Files:**
- Modify: `plugins/slack-monitor/skills/slack-monitor/workflow/REVIEW.md`

The `remote-control` mode section currently instructs the agent to Read/append/Write `pending_review.json` inline. Replace with `pending-add`.

Message text can contain single quotes and other shell-special characters. The safe pattern is to write the item JSON to a temp file and pass `--file`.

- [ ] **Step 1: Replace the pending queue write in remote-control mode**

Find this block in `workflow/REVIEW.md` under the `remote-control` section:

Old:
```
b. **Read** the current `pending_review.json`, append
   the item, **Write** back. Log as "queued".
```

New:
```
b. Build the complete queue item JSON (per FORMATS.md). Because
   message text may contain shell-special characters, write the
   item to a temp file first, then add it atomically:
   ```bash
   # Write item JSON to a temp file (use the Write tool)
   # File path: /tmp/slack_monitor_pending_item.json
   node "$SKILL_SCRIPTS_DIR/scripts/state.js" pending-add \
     --file /tmp/slack_monitor_pending_item.json \
     --data "$CLAUDE_PLUGIN_DATA"
   ```
   Log as "queued".
```

- [ ] **Step 2: Commit**

```bash
git add plugins/slack-monitor/skills/slack-monitor/workflow/REVIEW.md
git commit -m "feat(slack-monitor): use state.js pending-add in REVIEW.md remote-control mode"
```

---

## Task 4: Update `SKILL.md` — review queue, checkpoint clear, haiku model, header

**Files:**
- Modify: `plugins/slack-monitor/skills/slack-monitor/SKILL.md`

Four changes in SKILL.md:
1. Review queue reads `pending-list` instead of Read
2. Per-item removal uses `pending-remove` instead of full read/filter/write
3. Monitor agent dispatch gets `model: haiku`
4. Step 5 checkpoint clear uses `checkpoint-clear`
5. Header paragraph updated (no longer "no scripts")

- [ ] **Step 1: Update review queue — Step 1 (read)**

Find this in the `## Review Queue` section:

Old:
```
1. **Read** `${CLAUDE_PLUGIN_DATA}/pending_review.json`.
   If empty or missing, report "No pending items." and stop.
```

New:
```
1. Run:
   ```bash
   node "$SKILL_SCRIPTS_DIR/scripts/state.js" pending-list \
     --data "$CLAUDE_PLUGIN_DATA"
   ```
   Parse the JSON output. If the array is empty, report
   "No pending items." and stop.
```

- [ ] **Step 2: Update review queue — Step 3c (remove after choice)**

Find this in Step 3 of the Review Queue section:

Old:
```
   c. Execute the choice (per REVIEW.md formatting/threading rules).
      Remove the item from the queue. Append to `saved_messages.md`.
```

New:
```
   c. Execute the choice (per REVIEW.md formatting/threading rules).
      Remove the item from the queue:
      ```bash
      node "$SKILL_SCRIPTS_DIR/scripts/state.js" pending-remove "<item.id>" \
        --data "$CLAUDE_PLUGIN_DATA"
      ```
      Append to `saved_messages.md`.
```

- [ ] **Step 3: Update monitor agent dispatch — add model: haiku**

Find Step 4 in the `## Monitor Cycle` section:

Old:
```
4. **Dispatch Agent** with the monitor prompt. Pass the following as
   part of the prompt text:
```

New:
```
4. **Dispatch Agent** with `model: haiku` and the monitor prompt.
   Pass the following as part of the prompt text:
```

- [ ] **Step 4: Update Step 5 — checkpoint clear**

Find Step 5 in the `## Monitor Cycle` section:

Old:
```
   **Write** `{}` to `${CLAUDE_PLUGIN_DATA}/cycle_checkpoint.json`
   (clears the checkpoint in the parent context where plugin data dir
   permissions are established).
```

New:
```
   Run:
   ```bash
   node "$SKILL_SCRIPTS_DIR/scripts/state.js" checkpoint-clear \
     --data "$CLAUDE_PLUGIN_DATA"
   ```
   (Clears the checkpoint in the parent context where plugin data dir
   permissions are established.)
```

- [ ] **Step 5: Update intro paragraph — remove "no scripts" claim**

Find in the intro section of SKILL.md:

Old:
```
Scans Slack for messages that need your attention since
the last scan, drafts replies, and asks your approval
before sending anything. This skill has **no scripts or
dependencies** — it uses only Claude's native
Read/Write/Edit tools and MCP integrations.
```

New:
```
Scans Slack for messages that need your attention since
the last scan, drafts replies, and asks your approval
before sending anything. State file I/O uses
`scripts/state.js` (Node.js built-ins only) for atomic
reads and writes; Slack communication uses MCP
integrations.
```

- [ ] **Step 6: Commit**

```bash
git add plugins/slack-monitor/skills/slack-monitor/SKILL.md
git commit -m "feat(slack-monitor): use state.js in review queue; dispatch monitor agent with haiku model"
```

---

## Self-Review

**Spec coverage:**
- ✅ `scripts/state.js` with all 10 commands — Task 1
- ✅ `pending-add` uses `--file` for shell-safe message text — Task 1 + Task 3
- ✅ Monitor agent checkpoint ops replaced — Task 2 Steps 1, 3
- ✅ Monitor agent cache ops replaced — Task 2 Steps 2, 4
- ✅ REVIEW.md pending queue write replaced — Task 3
- ✅ SKILL.md review queue read/remove replaced — Task 4 Steps 1, 2
- ✅ Monitor agent dispatched with `model: haiku` — Task 4 Step 3
- ✅ SKILL.md checkpoint-clear updated — Task 4 Step 4
- ✅ SKILL.md header updated — Task 4 Step 5
- ✅ `last_scan` intentionally excluded (plain text, no JSON parsing)

**Placeholder scan:** No TBDs. All steps include exact commands and expected output.

**Type consistency:** `item.id` used consistently as the dedup/remove key throughout. `--data` flag position consistent across all script calls. `--file` flag available for pending-add and cache-set.
