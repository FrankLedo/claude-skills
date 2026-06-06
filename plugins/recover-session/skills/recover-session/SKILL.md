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

1. **Locate the session.**
   - If the user gave a session id:
     ```bash
     node "$SKILL_SCRIPTS_DIR/scripts/recover.js" find <id>
     ```
     If that exits non-zero ("Session not found"), fall back to the no-id path
     below and help them pick.
   - If no id was given (or the id wasn't found):
     ```bash
     node "$SKILL_SCRIPTS_DIR/scripts/recover.js" list --limit 20
     ```
     Show the recent sessions (intent, cwd, time) and ask which one to recover,
     then run `find <id>` on their choice.

2. **Summarize.** From the `turns` in the `find` output, give a short
   reconstruction: the original intent (first user turn), the last user request,
   the last assistant action, and what looked like the next step.

3. **Warn before showing transcript content.** Print this prominently:

   > ⚠ Session transcripts can contain secrets or personal data. This summary is
   > for your eyes — don't paste it into untrusted contexts.

   (The helper already strips `tool_use`/`tool_result` blocks, which is where
   credential output usually lives, but plain text turns can still contain
   sensitive material.)

4. **Offer to relaunch.** Show the manual command:
   ```bash
   cd "<cwd>" && claude --resume <id>
   ```
   Then offer to relaunch it in the background for them. If they accept, spawn it
   detached in the decoded `cwd`: run `claude --resume <id>` with `cwd` set to the
   session's cwd, `detached: true`, write `/bg\n` to its stdin, and `unref()` it.
   Confirm what was launched.

Do not relaunch without explicit confirmation.
