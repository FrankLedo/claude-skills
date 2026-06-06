# recover-session — design

**Issue:** [#136](https://github.com/FrankLedo/claude-skills/issues/136)
**Date:** 2026-06-05
**Status:** Approved (brainstorming complete)

## Problem

`agents-resume` relaunches known background jobs from `~/.claude/jobs/`. A
different failure mode has no coverage: `/resume <id>` returns "Session not
found", or a session never appears in the resume picker at all. The picker
scopes to the current working directory, so sessions created from a different
directory are invisible — even though the `.jsonl` transcript is always on disk
under `~/.claude/projects/`.

`recover-session` is the complementary skill: it finds sessions that have fallen
off the picker, reconstructs what was happening, and offers to relaunch them.

## Scope decisions (from brainstorming)

- **Packaging:** a *new standalone plugin* at `plugins/recover-session/`.
  (Originally planned as a second skill inside `agents-resume`, but that plugin
  is being **removed from the marketplace** — its bulk reboot-relaunch is
  superseded by Claude Code's `claude agents` view, which restores background
  sessions for reattach/restart. So `recover-session` stands on its own.)
- **Retiring `agents-resume`:** remove its entry from
  `.claude-plugin/marketplace.json` (no longer discoverable/installable). The
  plugin **files stay in the repo** (and its release-please package config is
  left intact) so existing installs and history are undisturbed.
- **End behavior:** summarize the recovered session, then give the user the
  command to relaunch it in the correct working directory. Background relaunch is
  *not* automated — `/background` only detaches a session a human is
  interactively attached to, so a detached spawn just orphans a TUI. The user
  runs the resume command and can `/bg` it themselves.
- **Trigger:** *description-based auto-trigger* (the native skill mechanism) plus
  `user-invocable: true`. A publisher cannot inject a global `CLAUDE.md` into a
  consumer's projects, so the skill `description` is the real trigger.
- **Implementation split (Approach B):** a fat Node helper does all
  deterministic work (find / decode / extract); a thin `SKILL.md` handles
  judgment (summary, warnings, relaunch decision). This follows the repo's
  design principle 3 (deterministic logic → `scripts/`, model for judgment) and
  avoids any `python3` dependency.

## Architecture

```
plugins/recover-session/                ← NEW standalone plugin
  .claude-plugin/plugin.json            ← name, version 0.1.0, description, keywords
  README.md
  CHANGELOG.md                          ← empty header; release-please populates
  skills/recover-session/
    SKILL.md
    scripts/recover.js
```

Registration (per repo CLAUDE.md "Adding a New Plugin"):

- `.claude-plugin/marketplace.json` — **add** a `recover-session` entry and
  **remove** the `agents-resume` entry.
- `release-please-config.json` — **add** a `plugins/recover-session` package
  (same shape as the others). Leave `plugins/agents-resume` intact.
- `.release-please-manifest.json` — **add** `"plugins/recover-session": "0.1.0"`.
  Leave `plugins/agents-resume` intact.
- Root `README.md` — **add** a `recover-session` row and **remove** the
  `agents-resume` row (no longer in the marketplace).

`plugin.json`'s `version` starts at `0.1.0` and thereafter is owned by
release-please (driven by `feat(recover-session):` / `fix(recover-session):`
commit subjects) — not edited by hand after creation.

## Component: `recover.js` (deterministic core)

Node, built-in modules only (`fs`, `path`, `os`). Reads `~/.claude/projects/`.
**Read-only** — never writes or deletes transcripts.

### `recover.js list [--limit N]`

Scan `~/.claude/projects/*/*.jsonl`. For each file, read the first line to get
`cwd`, and the first user turn for an `intent` preview. Emit recent sessions
sorted by mtime (newest first):

```json
[
  { "sessionId": "<uuid>", "cwd": "/path/to/project", "mtime": "<ISO>", "intent": "first user turn, truncated" }
]
```

- Default limit: 20.
- `cwd` comes from the first JSONL line's `cwd` field — **not** the path-encoding
  heuristic (replacing `-` with `/` is ambiguous for hyphenated directory
  names).

### `recover.js find <id>`

Locate the transcript and extract context:

1. **Fast path:** look for a file named `<id>.jsonl` under
   `~/.claude/projects/*/`.
2. **Fallback:** if not found by filename, scan file contents for the id (a
   session may be referenced inside another file).
3. Emit:

```json
{
  "sessionId": "<uuid>",
  "path": "/abs/path/to/<id>.jsonl",
  "cwd": "/decoded/from/first/line",
  "turns": [ { "role": "user|assistant", "text": "..." } ]
}
```

- `turns` includes only **text** blocks from user/assistant messages.
  `tool_use` and `tool_result` blocks are skipped — they are noisy and often
  contain credential output.
- To stay token-cheap, `turns` is capped to the last N turns (default ~12).
- Not found → exit non-zero with a clear message so `SKILL.md` can fall back to
  `list`.

### Error handling (shared)

- Missing `~/.claude/projects` directory → clean message. `list` exits 0
  (nothing to recover); `find` exits non-zero so `SKILL.md` can detect the
  failure and fall back.
- Per-line `JSON.parse` failure → warn to **stderr** (`⚠ <file>:<line>: <msg>`)
  and continue. One corrupt line never aborts the run, and errors are surfaced,
  not silently discarded.
- Empty transcript (no extractable turns) → still emit `sessionId`/`cwd`/`path`
  with empty `turns` so the user gets the location even when context is thin.

## Component: `SKILL.md` (judgment + flow)

Frontmatter:

```yaml
name: recover-session
description: >
  Use when a Claude Code session can't be found — `/resume` returns "Session not
  found", a session is missing from the resume picker, or the user says they
  "lost" a session. Finds the transcript under ~/.claude/projects/, summarizes
  what was happening, and offers to relaunch it in the right directory.
user-invocable: true
argument-hint: "[session-id]"
```

Flow:

1. **Warn (prominent).** Before showing any transcript content — including the
   `list` `intent` and the later summary — display a secret/PII warning:
   transcripts may contain secrets or personal data; don't paste output outside a
   trusted context.
2. **Locate.**
   - Id provided → `recover.js find <id>`. If not found, fall back to
     `recover.js list` and ask which session.
   - No id → `recover.js list`, present recent sessions, ask which to recover.
3. **Summarize.** From `turns`, present a concise reconstruction: original
   intent, the last user request, the last assistant action, and what was coming
   next.
4. **Offer relaunch.** Give the user the command `cd <cwd> && claude --resume
   <id>` to run themselves. Background relaunch can't be automated:
   `/background` requires a human-attached terminal, so a detached spawn just
   orphans a TUI. Note the user can type `/bg` once the session is up.

`SKILL.md` stays lean — it interprets `recover.js` output and decides next
steps; it does not re-implement finding/parsing.

## Testing

No repo test suite exists, so verification is ad-hoc (and read-only against the
real transcript store):

- `recover.js list` returns recent sessions with plausible `cwd`/`intent`.
- `recover.js find <known-id>` returns the right `cwd` and non-empty `turns`,
  with `tool_use`/`tool_result` content absent.
- `recover.js find <bogus-id>` exits non-zero with a clear message (degrades to
  `list` in the skill).
- Corrupt-line handling: craft a temp `.jsonl` with one malformed line; confirm
  a stderr warning and that the remaining lines still parse.
- Missing `~/.claude/projects` (simulate via a temp HOME) → clean message,
  exit 0.

## Documentation

- `plugins/recover-session/README.md` — user-facing docs: what it does, when it
  triggers, how it works.
- `plugins/recover-session/.claude-plugin/plugin.json` — `description` +
  `keywords` (`recover`, `session`, `transcript`, `resume`).
- Root `README.md` — add a `recover-session` row; remove the `agents-resume` row.

## Out of scope (YAGNI)

- No editing/redacting transcripts — recovery is read-only.
- No interactive TUI picker in the script; selection is handled conversationally
  by the skill.
- No automatic relaunch without confirmation.
