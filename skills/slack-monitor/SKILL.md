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
SETUP.md           — first-run setup wizard
README.md          — user-facing documentation
workflow/          — on-demand workflow details:
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

All configuration lives in `~/.slack-monitor/CLAUDE.md`
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

The setup wizard runs when `~/.slack-monitor/CLAUDE.md`
does not exist, or when the user passes `setup` as an
argument: `/slack-monitor setup`.

When triggered, **Read**
`$SKILL_SCRIPTS_DIR/SETUP.md` and follow the wizard.

## State Directory

All persistent state lives at `~/.slack-monitor/`.
This path is hardcoded (cross-platform: `$HOME` on
macOS/Linux, `%USERPROFILE%` on Windows).

- `CLAUDE.md` — config (frontmatter) + knowledge (body)
- `last_scan` — ISO 8601 UTC timestamp
- `pending_review.json` — messages awaiting review
- `search_cache.json` — thread read cache
- `saved_messages.md` — log of sent replies
- `people/` — per-person profiles

For file format details, **Read**
`$SKILL_SCRIPTS_DIR/workflow/FORMATS.md` when needed.

## Workflow

### 1. Initialize

**Read** these two files in parallel:

1. `~/.slack-monitor/CLAUDE.md` — parse YAML
   frontmatter only (not the body). If missing, run
   setup (see above).
2. `~/.slack-monitor/last_scan` — ISO 8601 timestamp.
   If missing, default to 15 minutes ago.

Compute inline:

- `current_time` — current UTC ISO 8601
- `last_scan_epoch` — last_scan as Unix epoch seconds
- `after_date` — calendar date **one day before**
  last_scan (for Slack `after:` query modifier)
- `local_hour` — current hour (0–23) in user's
  timezone
- `local_dow` — current day-of-week (1=Mon, 7=Sun)

Validate: if `userId` is empty, abort with
`"GUARDRAIL: userId not configured"`.

### 1.5. Process DM Review Replies

If `reviewMode` is `slack`, **Read**
`$SKILL_SCRIPTS_DIR/workflow/DM-REVIEW.md` and follow
the DM review process.

If `reviewMode` is `direct`, skip this step.

### 1.7. Process Self-DM Commands

If `selfDmChannel` is set, **Read**
`$SKILL_SCRIPTS_DIR/workflow/SELF-DM.md` and follow
the self-DM process.

If `selfDmChannel` is empty, skip to Step 2.

### 2. Search Slack

**Delegate to a haiku-model Agent subagent.** Steps 2–3
are mechanical work. The haiku agent runs all searches
in parallel, filters results, and returns only the
actionable message list + unique senders.

**CRITICAL:** Every cycle MUST run Searches A (DMs),
B (@mentions), and D (watched channels). Never skip
A or B.

Use `slack_search_public_and_private` with
`sort: timestamp`, `sort_dir: asc`,
`include_bots: false`, `response_format: "concise"`,
`include_context: false`. **Do NOT pass the `after`
Unix timestamp parameter** — use the date modifier in
the query string only, then filter by `message_ts`.

**Search A** — `"to:me after:<after_date>"`

**Search B** — `"<@$userId> after:<after_date>"`

**Search C** — `"from:<@$userId> is:thread after:<after_date>"`
(check search cache before reading threads)

**Search D** — `slack_read_channel` for each channel in
`channels` with `oldest: <last_scan_epoch>`, `limit: 20`,
`response_format: "detailed"`

**Search E** — one search per subteam in `groups`:
`"<!subteam^SXXXXXXXXXX> after:<after_date>"`

### 3. Deduplicate and Filter

The haiku agent filters inline:

1. Remove already-replied (you sent the last reply)
2. Remove duplicates by `message_ts` + channel
3. Filter by timestamp > `last_scan_epoch`

Returns: `actionable` list, `unique_senders`, `stats`.

**Short-circuit on empty:** If 0 actionable AND no
self-DM commands in Step 1.7, skip to Step 5.

### 4. Handle Messages

**Read** `$SKILL_SCRIPTS_DIR/workflow/GUARDRAILS.md`
and `$SKILL_SCRIPTS_DIR/workflow/HANDLE.md`, then
process each actionable message.

### 5. Update Timestamp

**Write** `current_time` to `~/.slack-monitor/last_scan`.
Also write search cache if modified.

### 6. Schedule Next Scan

Use `CronList` to check for existing cron.

**Working hours gate** (using `local_hour`, `local_dow`):

- Outside working hours (`>= endHour` or `< startHour`
  or day outside `days`):
  - If `offhoursInterval` is set, schedule recurring
    cron at that interval
  - Otherwise, schedule one-shot for `startHour:03`
    on the next active day
- Within working hours: use `interval` (idle) or
  `activeInterval` (active conversation detected)

**Active** = messages found this cycle, pending queue
has items (slack mode only), or self-DM commands
processed.

### 7. Learn and Improve

Handled in HANDLE.md (loaded in Step 4). If no messages
were found, skip entirely.

### 8. Report Summary

- Self-DM commands: N
- DM replies processed: N sent / N skipped
- Searched from / to timestamps
- Messages found (DMs / mentions / threads)
- Auto-sent / queued
- Pending queue depth
- Next scan from: `<new timestamp>`
