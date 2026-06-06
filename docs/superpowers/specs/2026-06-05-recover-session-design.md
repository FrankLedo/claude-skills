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

- **Packaging:** a *new skill inside the existing `agents-resume` plugin*, not a
  standalone plugin. One install gives both complementary tools; shared
  versioning.
- **End behavior:** summarize the recovered session, then *offer to relaunch* it
  in the correct working directory (reusing `resume.js`'s detached-spawn + `/bg`
  pattern).
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
plugins/agents-resume/
  .claude-plugin/plugin.json          ← broaden description + keywords (no manual version bump)
  README.md                           ← document both skills
  skills/
    agents-resume/                    ← existing, unchanged
      SKILL.md
      scripts/resume.js
    recover-session/                  ← NEW
      SKILL.md
      scripts/recover.js
```

No `marketplace.json` or `release-please-config.json` changes — the
`agents-resume` plugin is already registered as a package, and a second skill
lives inside it. The version bump is driven by the `feat(agents-resume):` commit
via release-please; `plugin.json`'s `version` field is **not** edited by hand.

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

- Missing `~/.claude/projects` directory → clean message, exit 0.
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

1. **Locate.**
   - Id provided → `recover.js find <id>`. If not found, fall back to
     `recover.js list` and ask which session.
   - No id → `recover.js list`, present recent sessions, ask which to recover.
2. **Summarize.** From `turns`, present a concise reconstruction: original
   intent, the last user request, the last assistant action, and what was coming
   next.
3. **Warn (prominent).** Before showing any transcript content, display a
   secret/PII warning: transcripts may contain secrets or personal data; don't
   paste output outside a trusted context.
4. **Offer relaunch.** Show the manual command `cd <cwd> && claude --resume
   <id>`, and offer to relaunch in the background using the same detached-spawn +
   `/bg` pattern as `resume.js` (spawn `claude --resume <id>` with `cwd`,
   `detached`, write `/bg\n` to stdin, `unref`).

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

- `plugins/agents-resume/README.md` — document both skills (resume vs. recover)
  and when each applies.
- `plugins/agents-resume/.claude-plugin/plugin.json` — broaden `description` and
  add recovery `keywords` (e.g. `recover`, `session`, `transcript`).
- Root `README.md` — check the plugins-table entry for `agents-resume` and widen
  its scope wording if it only mentions reboot-resume.

## Out of scope (YAGNI)

- No new standalone plugin, marketplace entry, or release-please package.
- No editing/redacting transcripts — recovery is read-only.
- No interactive TUI picker in the script; selection is handled conversationally
  by the skill.
- No automatic relaunch without confirmation.
