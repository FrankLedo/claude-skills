---
name: slack-monitor
description: Scan Slack for unanswered DMs, @mentions, and replies to your threads since the last scan. Drafts replies and asks permission before sending each one.
user-invocable: true
argument-hint: "[setup | (no args to scan)]"
---

# Slack Monitor Skill

Scans Slack for messages that need your attention since
the last scan, drafts replies, and asks your approval
before sending anything. This skill has **no scripts or
dependencies** — it uses only Claude's native
Read/Write/Edit tools and MCP integrations.

## Skill Directory

The skill's base directory is provided by Claude Code
in the `Base directory for this skill:` header when the
skill loads. Use that path directly as
`SKILL_SCRIPTS_DIR`.

```
SKILL.md           — core workflow (this file)
README.md          — user-facing documentation
agents/
  monitor-prompt.md — isolated monitor agent prompt
workflow/          — on-demand workflow details:
  SETUP.md         — first-run setup wizard
  GUARDRAILS.md    — safety limits and rules
  HANDLE.md        — message handling + learning
  REVIEW.md        — review modes + formatting
  SELF-DM.md       — self-DM command processing
  DM-REVIEW.md     — DM review reply processing
  FORMATS.md       — state file schemas
templates/         — default files for first run
```

**Token optimization:** Only this file (SKILL.md) is
loaded on every cycle. The `workflow/` files are
**Read on demand** — only when the specific feature is
needed (e.g., HANDLE.md only when actionable messages
are found). On idle cycles with no new messages, none
of the workflow files are read.

## Configuration

All configuration lives in `${CLAUDE_PLUGIN_DATA}/CLAUDE.md`
(YAML frontmatter). **Read** the frontmatter only (not
the body) at the start of each cycle.

```yaml
---
userId: UXXXXXXXXXX
workspaceDomain: myteam.slack.com
selfDmChannel:
channels:
groups:
autoReply: true
autoReplyConfidence: 90
draftMode: false
reviewMode: slack
interval: 15
activeInterval: 1
offhoursInterval:
startHour: 7
endHour: 16
days: 1-5
maxAutoReply: 5
maxDmNotify: 10
maxSends: 15
maxQueue: 25
---
```

**Required:** `userId`, `workspaceDomain`

### Setup

The setup wizard (and migration check) runs when
`${CLAUDE_PLUGIN_DATA}/CLAUDE.md` does not exist, or
when the user passes `setup` as an argument:
`/slack-monitor setup`.

When triggered, **Read**
`$SKILL_SCRIPTS_DIR/workflow/SETUP.md` and follow the wizard.

## State Directory

All persistent state lives at `${CLAUDE_PLUGIN_DATA}/`.
This path is provided by the Claude plugin framework
(cross-platform).

- `CLAUDE.md` — config (frontmatter) + knowledge (body)
- `last_scan` — ISO 8601 UTC timestamp
- `pending_review.json` — messages awaiting review
- `search_cache.json` — thread read cache
- `saved_messages.md` — log of sent replies
- `people/` — per-person profiles

For file format details, **Read**
`$SKILL_SCRIPTS_DIR/workflow/FORMATS.md` when needed.

## Monitor Cycle (no-arg invocation)

1. In parallel, **Read**:
   - `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` — parse YAML frontmatter only.
     If missing, run setup (see above).
   - `${CLAUDE_PLUGIN_DATA}/last_scan` — ISO 8601 timestamp.
     If missing, default to 15 minutes ago.

2. Compute `current_time` (current UTC ISO 8601 timestamp).

3. **Read** `$SKILL_SCRIPTS_DIR/agents/monitor-prompt.md`.

4. **Dispatch Agent** with the monitor prompt. Pass the following as
   part of the prompt text:
   - `SKILL_SCRIPTS_DIR=<resolved path>`
   - `CLAUDE_PLUGIN_DATA=<resolved path>`
   - All config values from CLAUDE.md frontmatter
   - `last_scan=<timestamp>`
   - `current_time=<timestamp>`

5. Receive the `MONITOR_SUMMARY` block from the agent.
   State writes (`last_scan`, `search_cache.json`) are handled by the
   monitor agent (see `agents/monitor-prompt.md` Step 5).

6. **Schedule next scan** using `CronList` then `CronCreate`:
   - Compute `local_hour` and `local_dow` from current time and user
     timezone
   - Outside working hours (`local_hour >= endHour` or
     `local_hour < startHour` or `local_dow` outside `days`):
     - If `offhoursInterval` is set → recurring cron at that interval
     - Otherwise → one-shot cron for `startHour:03` on next active day
   - Within working hours:
     - If `active: true` in MONITOR_SUMMARY → use `activeInterval`
       (See `agents/monitor-prompt.md` for the definition of `active`
       and all MONITOR_SUMMARY fields.)
     - Otherwise → use `interval`
   - Use `CronCreate` to schedule the cron (skip if a matching cron
     already exists per `CronList`).

7. **Report** to user:
   - `self_dm_commands`: N
   - `dm_replies_processed`: N sent / N skipped
   - `messages_found`: N (DMs: N / mentions: N / threads: N)
   - `auto_sent`: N
   - `queued`: N
   - `pending_queue_depth`: N
   - `active`: true|false
   - Next scan scheduled for: `<time>`
