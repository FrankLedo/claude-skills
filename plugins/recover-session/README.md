# recover-session

Find a Claude Code session that has fallen off the `/resume` picker.

The `/resume` picker scopes to the current working directory, so a session created elsewhere can be missing from the list — or `/resume <id>` returns "Session not found". The transcript is still on disk under `~/.claude/projects/`. This skill finds it, summarizes what was happening, and offers to relaunch it in the right directory.

## Usage

```text
/recover-session [session-id]
```

It also triggers automatically when you mention that `/resume` failed, a session id wasn't found, or you "lost" a session.

## How it works

1. With an id → locates `<id>.jsonl` under `~/.claude/projects/` (falling back to a structured `sessionId` scan); without one → lists recent sessions to pick from
2. Decodes the working directory from the transcript and extracts the conversation turns (skipping tool calls/results, which can contain secrets)
3. Summarizes intent, last action, and next step — with a reminder that transcripts may contain sensitive data
4. Offers to relaunch via `claude --resume <id>` in the decoded directory

The helper is read-only — it never edits or deletes transcripts.
