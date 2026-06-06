# recover-session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `recover-session` plugin that finds Claude Code sessions missing from the `/resume` picker (transcripts under `~/.claude/projects/`), summarizes them, and offers to relaunch them in the right directory — and remove the superseded `agents-resume` plugin from the marketplace.

**Architecture:** A Node helper (`recover.js`, built-in modules only, read-only) does all deterministic work — listing recent transcripts and locating/extracting one by id. A thin `SKILL.md` interprets that output, warns about secrets, and offers a background relaunch using a detached-spawn + `/bg` pattern. Packaged as its own plugin at `plugins/recover-session/`.

**Tech Stack:** Node.js (built-in `fs`, `path`, `os` only). No npm, no test runner — verification uses throwaway Node `assert` scripts against crafted JSONL fixtures.

---

## Transcript format reference (verified against real data)

A transcript is `~/.claude/projects/<encoded-cwd-dir>/<sessionId>.jsonl`. Each line is one JSON object. Key facts the code relies on:

- The **filename stem is the canonical `sessionId`** (`<uuid>.jsonl`).
- `cwd` and `sessionId` fields appear on **many** line types (`user`, `assistant`, `system`, …) but **not reliably on line 1** (line 1 may be `queue-operation`, `attachment`, etc.). Decode `cwd` from the **first line that carries a `cwd` string**.
- `user`/`assistant` lines have `message.content` that is **either a string or an array of blocks** (`{type:"text"|"tool_use"|"tool_result", ...}`).
- Subagent turns carry `isSidechain: true` — skip them for the main-conversation view.
- `tool_use` / `tool_result` blocks are skipped (noisy, may contain credentials); only `text` blocks are kept.

## Fixture helper used by the tests

Several tasks build the same fixture. Create it fresh in each test script (repeated intentionally so tasks can be run out of order). It writes a fake `$HOME` whose `.claude/projects/` holds one well-formed transcript (with a non-cwd first line, a sidechain turn, a tool_result-only user turn, and one **malformed** line) so tests exercise the tricky paths.

```js
// makeFixture(root) -> { sessionId, projectDir, file }
const fs = require('fs');
const path = require('path');
function makeFixture(root) {
  const sessionId = '11111111-2222-3333-4444-555555555555';
  const projectDir = path.join(root, '.claude', 'projects', '-Users-x-proj');
  fs.mkdirSync(projectDir, { recursive: true });
  const file = path.join(projectDir, sessionId + '.jsonl');
  const lines = [
    // 1: non-cwd first line (must NOT be treated as the cwd source)
    JSON.stringify({ type: 'queue-operation', sessionId }),
    // 2: first cwd-bearing line + the real user intent (string content)
    JSON.stringify({ type: 'user', cwd: '/Users/x/proj', sessionId, message: { role: 'user', content: 'Fix the login bug' } }),
    // 3: assistant turn mixing text + tool_use (tool_use must be dropped)
    JSON.stringify({ type: 'assistant', cwd: '/Users/x/proj', message: { role: 'assistant', content: [ { type: 'text', text: 'Looking into it' }, { type: 'tool_use', name: 'Bash', input: { command: 'export TOKEN=secret' } } ] } }),
    // 4: malformed line (must warn to stderr and be skipped)
    '{ this is not json',
    // 5: user turn that is only a tool_result (no text -> skipped)
    JSON.stringify({ type: 'user', cwd: '/Users/x/proj', message: { role: 'user', content: [ { type: 'tool_result', content: 'secret output' } ] } }),
    // 6: sidechain (subagent) turn -> skipped
    JSON.stringify({ type: 'assistant', isSidechain: true, message: { role: 'assistant', content: [ { type: 'text', text: 'subagent chatter' } ] } }),
    // 7: final assistant text turn
    JSON.stringify({ type: 'assistant', cwd: '/Users/x/proj', message: { role: 'assistant', content: [ { type: 'text', text: 'Fixed it' } ] } }),
  ];
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return { sessionId, projectDir, file };
}
module.exports = { makeFixture };
```

Each test sets `process.env.HOME` to the fixture root **before** requiring `recover.js`, because the script resolves `~/.claude/projects` via `os.homedir()` (which honors `$HOME` on macOS/Linux). The tests run the script as a child process so `os.homedir()` re-reads the env.

---

### Task 1: Scaffold `recover.js` with shared helpers + `list` command

**Files:**
- Create: `plugins/recover-session/skills/recover-session/scripts/recover.js`
- Test (throwaway, not committed): `$CLAUDE_JOB_DIR/tmp/test-list.js`

- [ ] **Step 1: Write the failing test**

Create `$CLAUDE_JOB_DIR/tmp/test-list.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// inline fixture (see plan's fixture helper)
function makeFixture(root) {
  const sessionId = '11111111-2222-3333-4444-555555555555';
  const projectDir = path.join(root, '.claude', 'projects', '-Users-x-proj');
  fs.mkdirSync(projectDir, { recursive: true });
  const file = path.join(projectDir, sessionId + '.jsonl');
  const lines = [
    JSON.stringify({ type: 'queue-operation', sessionId }),
    JSON.stringify({ type: 'user', cwd: '/Users/x/proj', sessionId, message: { role: 'user', content: 'Fix the login bug' } }),
    JSON.stringify({ type: 'assistant', cwd: '/Users/x/proj', message: { role: 'assistant', content: [ { type: 'text', text: 'Looking into it' }, { type: 'tool_use', name: 'Bash', input: {} } ] } }),
    '{ this is not json',
    JSON.stringify({ type: 'assistant', cwd: '/Users/x/proj', message: { role: 'assistant', content: [ { type: 'text', text: 'Fixed it' } ] } }),
  ];
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return { sessionId, file };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-list-'));
const { sessionId } = makeFixture(root);
const script = path.resolve(__dirname, '../../plugins/recover-session/skills/recover-session/scripts/recover.js');

const out = execFileSync('node', [script, 'list'], { env: { ...process.env, HOME: root }, encoding: 'utf8' });
const sessions = JSON.parse(out);
assert.strictEqual(sessions.length, 1, 'one session listed');
assert.strictEqual(sessions[0].sessionId, sessionId, 'sessionId from filename');
assert.strictEqual(sessions[0].cwd, '/Users/x/proj', 'cwd from first cwd-bearing line, not line 1');
assert.strictEqual(sessions[0].intent, 'Fix the login bug', 'intent from first real user turn');
assert.ok(sessions[0].mtime, 'has mtime');
console.log('PASS test-list');
```

(Adjust the `script` path resolution if your `$CLAUDE_JOB_DIR/tmp` is not two levels below the repo root; use the absolute repo path instead.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node "$CLAUDE_JOB_DIR/tmp/test-list.js"`
Expected: FAIL — `Cannot find module .../recover.js` (script doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `plugins/recover-session/skills/recover-session/scripts/recover.js`:

```js
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const projectsDir = path.join(os.homedir(), '.claude', 'projects');
const TURN_CAP = 12;

function die(msg, code = 1) { console.error(msg); process.exit(code); }

// Read a JSONL file, invoking cb(obj, lineNo) per parseable line.
// Malformed lines warn to stderr and are skipped. Return false from cb to stop.
function eachLine(file, cb) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { console.error(`⚠ Cannot read ${file}: ${e.message}`); return; }
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let obj;
    try { obj = JSON.parse(lines[i]); }
    catch (e) { console.error(`⚠ ${file}:${i + 1}: ${e.message}`); continue; }
    if (cb(obj, i + 1) === false) return;
  }
}

// Extract showable text from a message.content (string or block array).
function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => b && b.type === 'text' && b.text)
      .map(b => b.text)
      .join('\n');
  }
  return '';
}

// All .jsonl transcripts, newest first: [{ full, name, mtime }]
function listFiles() {
  let projectDirs;
  try { projectDirs = fs.readdirSync(projectsDir); }
  catch { return null; } // signal "no projects dir"
  const files = [];
  for (const d of projectDirs) {
    const dir = path.join(projectsDir, d);
    let entries;
    try { entries = fs.readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (!name.endsWith('.jsonl')) continue;
      const full = path.join(dir, name);
      try { files.push({ full, name, mtime: fs.statSync(full).mtime }); } catch { /* skip */ }
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files;
}

function idOf(name) { return name.replace(/\.jsonl$/, ''); }

// cwd + first user intent, reading only as far as needed.
function summarize(file) {
  let cwd = null, intent = '';
  eachLine(file.full, (o) => {
    if (!cwd && typeof o.cwd === 'string') cwd = o.cwd;
    if (!intent && o.type === 'user' && !o.isSidechain && o.message) {
      const t = textOf(o.message.content).trim();
      if (t) intent = t;
    }
    if (cwd && intent) return false;
  });
  return {
    sessionId: idOf(file.name),
    cwd: cwd || os.homedir(),
    mtime: file.mtime.toISOString(),
    intent: intent.replace(/\s+/g, ' ').slice(0, 80),
  };
}

// --- dispatch ---
const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'list': {
    const files = listFiles();
    if (files === null) { console.log('No ~/.claude/projects directory found.'); process.exit(0); }
    const li = args.indexOf('--limit');
    const limit = li !== -1 ? (parseInt(args[li + 1], 10) || 20) : 20;
    console.log(JSON.stringify(files.slice(0, limit).map(summarize), null, 2));
    break;
  }
  default:
    die(`Unknown command: ${cmd || '(none)'}\nCommands: list [--limit N], find <session-id>`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "$CLAUDE_JOB_DIR/tmp/test-list.js"`
Expected: `PASS test-list`

- [ ] **Step 5: Verify malformed-line warning goes to stderr (not stdout)**

Run: `node "$CLAUDE_JOB_DIR/tmp/test-list.js" 2>/dev/null` then separately `node "$CLAUDE_JOB_DIR/tmp/test-list.js" 2>&1 1>/dev/null`
Expected: the first still prints `PASS test-list` (stdout JSON is clean), the second shows a `⚠ ...:4: ...` warning. (The test already parses stdout as JSON, so a leaked warning would have failed it.)

- [ ] **Step 6: Commit**

```bash
git add plugins/recover-session/skills/recover-session/scripts/recover.js
git commit -m "feat(recover-session): add recover.js list command"
```

---

### Task 2: Add `find <id>` command (locate + extract turns)

**Files:**
- Modify: `plugins/recover-session/skills/recover-session/scripts/recover.js`
- Test (throwaway): `$CLAUDE_JOB_DIR/tmp/test-find.js`

- [ ] **Step 1: Write the failing test**

Create `$CLAUDE_JOB_DIR/tmp/test-find.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function makeFixture(root) {
  const sessionId = '11111111-2222-3333-4444-555555555555';
  const projectDir = path.join(root, '.claude', 'projects', '-Users-x-proj');
  fs.mkdirSync(projectDir, { recursive: true });
  const file = path.join(projectDir, sessionId + '.jsonl');
  const lines = [
    JSON.stringify({ type: 'queue-operation', sessionId }),
    JSON.stringify({ type: 'user', cwd: '/Users/x/proj', sessionId, message: { role: 'user', content: 'Fix the login bug' } }),
    JSON.stringify({ type: 'assistant', cwd: '/Users/x/proj', message: { role: 'assistant', content: [ { type: 'text', text: 'Looking into it' }, { type: 'tool_use', name: 'Bash', input: { command: 'export TOKEN=secret' } } ] } }),
    '{ this is not json',
    JSON.stringify({ type: 'user', cwd: '/Users/x/proj', message: { role: 'user', content: [ { type: 'tool_result', content: 'secret output' } ] } }),
    JSON.stringify({ type: 'assistant', isSidechain: true, message: { role: 'assistant', content: [ { type: 'text', text: 'subagent chatter' } ] } }),
    JSON.stringify({ type: 'assistant', cwd: '/Users/x/proj', message: { role: 'assistant', content: [ { type: 'text', text: 'Fixed it' } ] } }),
  ];
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return { sessionId, file };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-find-'));
const { sessionId, file } = makeFixture(root);
const script = path.resolve(__dirname, '../../plugins/recover-session/skills/recover-session/scripts/recover.js');
const env = { ...process.env, HOME: root };

// found case
const out = JSON.parse(execFileSync('node', [script, 'find', sessionId], { env, encoding: 'utf8' }));
assert.strictEqual(out.sessionId, sessionId);
assert.strictEqual(out.cwd, '/Users/x/proj');
assert.strictEqual(out.path, file);
const texts = out.turns.map(t => t.text);
assert.deepStrictEqual(texts, ['Fix the login bug', 'Looking into it', 'Fixed it'], 'text-only turns, no tool_use/tool_result/sidechain');
const blob = JSON.stringify(out);
assert.ok(!blob.includes('secret'), 'no tool_use/tool_result credential content leaks');
assert.ok(!blob.includes('subagent chatter'), 'sidechain turns excluded');

// not-found case -> non-zero exit + message on stderr
let failed = false;
try { execFileSync('node', [script, 'find', 'no-such-id'], { env, encoding: 'utf8' }); }
catch (e) { failed = true; assert.ok(/not found/i.test(String(e.stderr)), 'clear not-found message'); }
assert.ok(failed, 'find exits non-zero when id missing');

console.log('PASS test-find');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node "$CLAUDE_JOB_DIR/tmp/test-find.js"`
Expected: FAIL — `Unknown command: find` printed to stderr and non-zero exit (the `find` case is unimplemented), so the found-case `execFileSync` throws before assertions.

- [ ] **Step 3: Write minimal implementation**

In `recover.js`, add these two functions above the `// --- dispatch ---` line:

```js
// Find a transcript by id: fast path on filename, fallback to a structured
// scan of the `sessionId` field. A raw substring scan is avoided on purpose —
// it would false-match any transcript that merely *mentions* the id in a
// message (e.g. a session discussing another session's id).
function findFile(id) {
  const files = listFiles();
  if (!files) return null;
  const hit = files.find(f => f.name === `${id}.jsonl`);
  if (hit) return hit;
  for (const f of files) {
    let matched = false;
    eachLine(f.full, (o) => {
      if (o.sessionId === id) { matched = true; return false; }
    });
    if (matched) return f;
  }
  return null;
}

// Full cwd + text-only turn list for one transcript (last TURN_CAP turns).
function extract(file) {
  let cwd = null;
  const turns = [];
  eachLine(file.full, (o) => {
    if (!cwd && typeof o.cwd === 'string') cwd = o.cwd;
    if ((o.type === 'user' || o.type === 'assistant') && !o.isSidechain && o.message) {
      const text = textOf(o.message.content).trim();
      if (text) turns.push({ role: o.type, text });
    }
  });
  return {
    sessionId: idOf(file.name),
    path: file.full,
    cwd: cwd || os.homedir(),
    turns: turns.slice(-TURN_CAP),
  };
}
```

Then add a `find` case to the `switch`, before `default:`:

```js
  case 'find': {
    const id = args[1];
    if (!id) die('find requires <session-id>');
    const file = findFile(id);
    if (!file) die(`Session not found: ${id}`);
    console.log(JSON.stringify(extract(file), null, 2));
    break;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node "$CLAUDE_JOB_DIR/tmp/test-find.js"`
Expected: `PASS test-find`

- [ ] **Step 5: Smoke-test against real data (read-only)**

Run:
```bash
node plugins/recover-session/skills/recover-session/scripts/recover.js list --limit 3
ID=$(node plugins/recover-session/skills/recover-session/scripts/recover.js list --limit 1 | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).pop().sessionId)')
node plugins/recover-session/skills/recover-session/scripts/recover.js find "$ID" | node -e 'const o=JSON.parse(require("fs").readFileSync(0));console.log("cwd:",o.cwd,"turns:",o.turns.length)'
```
Expected: `list` prints up to 3 sessions with real cwds/intents; `find` prints a real cwd and a non-zero turn count. No crash.

- [ ] **Step 6: Commit**

```bash
git add plugins/recover-session/skills/recover-session/scripts/recover.js
git commit -m "feat(recover-session): add recover.js find command with turn extraction"
```

---

### Task 3: Write `SKILL.md`

**Files:**
- Create: `plugins/recover-session/skills/recover-session/SKILL.md`

- [ ] **Step 1: Create the skill file**

Create `plugins/recover-session/skills/recover-session/SKILL.md`:

```markdown
---
name: recover-session
description: >
  Use when a Claude Code session can't be found — `/resume` returns "Session
  not found", a session is missing from the resume picker, or the user says
  they "lost" a session or can't find it. Locates the transcript under
  ~/.claude/projects/, summarizes what was happening, and offers to relaunch
  it in the correct directory.
user-invocable: true
argument-hint: "[session-id]"
---

# Recover Session

Finds Claude Code sessions that have fallen off the `/resume` picker (the picker
scopes to the current directory, but every transcript is on disk under
`~/.claude/projects/`), reconstructs context, and offers to relaunch.

## Skill Directory

The skill's base directory is available as `$SKILL_SCRIPTS_DIR` (provided in the
`Base directory for this skill:` header). The helper is at
`$SKILL_SCRIPTS_DIR/scripts/recover.js`. It is **read-only** — it never edits or
deletes transcripts.

## Flow

1. **Warn before showing any transcript content.** Both the `list` output
   (`intent`) and the later summary are derived from transcript text, so print
   this prominently *before* running any command that displays session content:

   > ⚠ Session transcripts can contain secrets or personal data. This summary is
   > for your eyes — don't paste it into untrusted contexts.

   (The helper already strips `tool_use`/`tool_result` blocks, which is where
   credential output usually lives, but plain text turns can still contain
   sensitive material.)

2. **Locate the session.**
   - If the user gave a session id:
     ```bash
     node "$SKILL_SCRIPTS_DIR/scripts/recover.js" find <id>
     ```
     If that exits non-zero ("Session not found"), fall back to the no-id
     path and help them pick.
   - If no id was given (or the id wasn't found):
     ```bash
     node "$SKILL_SCRIPTS_DIR/scripts/recover.js" list --limit 20
     ```
     Show the recent sessions (intent, cwd, time) and ask which one to recover,
     then run `find <id>` on their choice.

3. **Summarize.** From the `turns` in the `find` output, give a short
   reconstruction: the original intent (first user turn), the last user request,
   the last assistant action, and what looked like the next step.

4. **Offer to relaunch.** Show the manual command:
   ```bash
   cd "<cwd>" && claude --resume <id>
   ```
   Then offer to relaunch it in the background for them. If they accept, spawn it
   detached in the decoded `cwd`: run `claude --resume <id>` with `cwd` set to the
   session's cwd, `detached: true`, write `/bg\n` to its stdin, and `unref()` it.
   Confirm what was launched.

Do not relaunch without explicit confirmation.
```

- [ ] **Step 2: Sanity-check the frontmatter parses**

Run:
```bash
node -e 'const fs=require("fs");const t=fs.readFileSync("plugins/recover-session/skills/recover-session/SKILL.md","utf8");const m=t.match(/^---\n([\s\S]*?)\n---/);if(!m)throw new Error("no frontmatter");["name:","description:","user-invocable:"].forEach(k=>{if(!m[1].includes(k))throw new Error("missing "+k)});console.log("frontmatter OK")'
```
Expected: `frontmatter OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/recover-session/skills/recover-session/SKILL.md
git commit -m "feat(recover-session): add SKILL.md"
```

---

### Task 4: Scaffold the standalone plugin, register it, and retire agents-resume

Tasks 1–3 already created `plugins/recover-session/skills/recover-session/{scripts/recover.js,SKILL.md}`. This task adds the plugin manifest/docs, registers the plugin, and removes `agents-resume` from the marketplace.

**Files:**
- Create: `plugins/recover-session/.claude-plugin/plugin.json`
- Create: `plugins/recover-session/README.md`
- Create: `plugins/recover-session/CHANGELOG.md`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `release-please-config.json`
- Modify: `.release-please-manifest.json`
- Modify: `README.md` (root)

- [ ] **Step 1: Create the plugin manifest**

Create `plugins/recover-session/.claude-plugin/plugin.json`:

```json
{
  "name": "recover-session",
  "version": "0.1.0",
  "description": "Find Claude Code sessions missing from the /resume picker. Locates transcripts in ~/.claude/projects/, summarizes them, and offers to relaunch in the original directory.",
  "author": {
    "name": "Frank Ledo",
    "url": "https://github.com/FrankLedo"
  },
  "repository": "https://github.com/FrankLedo/claude-skills",
  "license": "MIT",
  "keywords": [
    "session",
    "recover",
    "resume",
    "transcript",
    "productivity"
  ]
}
```

- [ ] **Step 2: Create the plugin README**

Create `plugins/recover-session/README.md`:

```markdown
# recover-session

Find a Claude Code session that has fallen off the `/resume` picker.

The `/resume` picker scopes to the current working directory, so a session created elsewhere can be missing from the list — or `/resume <id>` returns "Session not found". The transcript is still on disk under `~/.claude/projects/`. This skill finds it, summarizes what was happening, and offers to relaunch it in the right directory.

## Usage

```text
/recover-session [session-id]
```

It also triggers automatically when you mention that `/resume` failed, a session id wasn't found, or you "lost" a session.

## How it works

1. With an id → locates `<id>.jsonl` under `~/.claude/projects/` (falling back to a content scan); without one → lists recent sessions to pick from
2. Decodes the working directory from the transcript and extracts the conversation turns (skipping tool calls/results, which can contain secrets)
3. Summarizes intent, last action, and next step — with a reminder that transcripts may contain sensitive data
4. Offers to relaunch via `claude --resume <id>` in the decoded directory

The helper is read-only — it never edits or deletes transcripts.
```

- [ ] **Step 3: Create an empty CHANGELOG**

Create `plugins/recover-session/CHANGELOG.md`:

```markdown
# Changelog
```

- [ ] **Step 4: Register in the marketplace (and remove agents-resume)**

In `.claude-plugin/marketplace.json`, replace the `agents-resume` entry (the last object in `plugins`) with a `recover-session` entry.

Change:
```json
    {
      "name": "agents-resume",
      "source": "./plugins/agents-resume",
      "description": "Resume all background agents after a reboot. Reads job state from ~/.claude/jobs/ and relaunches each non-completed session."
    }
```
to:
```json
    {
      "name": "recover-session",
      "source": "./plugins/recover-session",
      "description": "Find Claude Code sessions missing from the /resume picker via transcripts in ~/.claude/projects/, summarize them, and offer to relaunch."
    }
```

- [ ] **Step 5: Add the release-please package**

In `release-please-config.json`, add a `plugins/recover-session` package after the `plugins/agents-resume` block (leave `agents-resume` intact). Insert this entry inside `packages` (mind the trailing comma on the preceding block):

```json
    "plugins/recover-session": {
      "release-type": "simple",
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": true,
      "extra-files": [
        {
          "type": "json",
          "path": ".claude-plugin/plugin.json",
          "jsonpath": "$.version"
        }
      ]
    }
```

- [ ] **Step 6: Add the release-please manifest entry**

In `.release-please-manifest.json`, add the new plugin (leave `agents-resume` intact):

```json
{
  "plugins/slack-monitor": "0.3.7",
  "plugins/tickler": "0.4.8",
  "plugins/agents-resume": "0.1.3",
  "plugins/recover-session": "0.1.0"
}
```

- [ ] **Step 7: Update the root README plugins table**

In `README.md`, remove the `agents-resume` row and add a `recover-session` row.

Remove:
```text
| [agents-resume](plugins/agents-resume/) | Resume all background agents after a reboot. |
```
Add (in its place):
```text
| [recover-session](plugins/recover-session/) | Find sessions missing from the `/resume` picker, summarize them, and relaunch in the original directory. |
```

- [ ] **Step 8: Verify all touched JSON is valid**

Run:
```bash
for f in plugins/recover-session/.claude-plugin/plugin.json .claude-plugin/marketplace.json release-please-config.json .release-please-manifest.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'));console.log('OK $f')"; done
```
Expected: four `OK ...` lines. Also confirm `agents-resume` is gone from the marketplace but still present in release-please:
```bash
node -e 'const m=JSON.parse(require("fs").readFileSync(".claude-plugin/marketplace.json"));console.log("marketplace:",m.plugins.map(p=>p.name).join(", "))'
```
Expected: `marketplace: slack-monitor, tickler, recover-session` (no `agents-resume`).

- [ ] **Step 9: Commit**

```bash
git add plugins/recover-session/.claude-plugin/plugin.json plugins/recover-session/README.md plugins/recover-session/CHANGELOG.md .claude-plugin/marketplace.json release-please-config.json .release-please-manifest.json README.md
git commit -m "feat(recover-session): scaffold plugin, register it, remove agents-resume from marketplace"
```

---

### Task 5: Final verification and PR

**Files:** none (verification + PR only)

- [ ] **Step 1: Re-run both unit tests**

Run:
```bash
node "$CLAUDE_JOB_DIR/tmp/test-list.js" && node "$CLAUDE_JOB_DIR/tmp/test-find.js"
```
Expected: `PASS test-list` then `PASS test-find`.

- [ ] **Step 2: Confirm the skill tree and JSON are intact**

Run:
```bash
find plugins/recover-session -type f | sort
node -e 'JSON.parse(require("fs").readFileSync("plugins/recover-session/.claude-plugin/plugin.json","utf8"));console.log("plugin.json OK")'
```
Expected: lists `plugin.json`, `README.md`, `CHANGELOG.md`, `SKILL.md`, and `scripts/recover.js`; prints `plugin.json OK`.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/recover-session-skill
gh pr create --repo FrankLedo/claude-skills --base main --head feat/recover-session-skill \
  --title "feat(recover-session): add recover-session plugin" \
  --body "Implements #136. Adds a standalone recover-session plugin that finds sessions missing from the /resume picker via transcripts under ~/.claude/projects/, summarizes them, and offers to relaunch. Deterministic find/decode/extract in recover.js (built-in modules, read-only); judgment in SKILL.md. Also removes the superseded agents-resume plugin from the marketplace (files retained in repo). Spec: docs/superpowers/specs/2026-06-05-recover-session-design.md. Closes #136"
```
Expected: a PR URL. Copilot is auto-requested as reviewer via the repo ruleset.

- [ ] **Step 4: Report the PR URL and that Copilot review was requested.**

---

## Notes for the implementer

- **No version bumps by hand** after creation — `plugin.json` starts at `0.1.0`; thereafter release-please owns `version` and the CHANGELOG, driven by `feat(recover-session):` / `fix(recover-session):` commit subjects.
- **Throwaway tests are not committed.** They live in `$CLAUDE_JOB_DIR/tmp`. Adding test files inside the plugin directory would pollute the marketplace structure (the repo has no test suite by design).
- **recover.js stays read-only.** It never writes to `~/.claude/projects/`. The only process-spawning (relaunch) lives in `SKILL.md`, gated on user confirmation.
- If the `path.resolve(__dirname, ...)` in `test-list.js` doesn't point at the repo, hardcode the absolute script path as `test-find.js` does.
