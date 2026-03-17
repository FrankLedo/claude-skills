---
userId:
workspaceDomain:
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

# Slack Monitor

This file configures and provides context for the
slack-monitor skill. Edit the YAML frontmatter above
to configure, and add knowledge below as you use the
skill.

## Configuration Reference

### Required

- **userId** — Your Slack user ID (e.g. `UXXXXXXXXXX`).
  Find it in Slack profile > More > Copy member ID.
- **workspaceDomain** — Your Slack workspace URL
  (e.g. `myteam.slack.com`). Used for building
  permalinks.

### Recommended

- **selfDmChannel** — Channel ID for your self-DM.
  Enables sending yourself commands via Slack.
- **channels** — Comma-separated channel IDs to watch.
  All messages in these channels are treated as
  actionable.
- **groups** — Comma-separated subteam IDs for group
  @mention monitoring.
- **reviewMode** — `slack` (non-blocking DM review) or
  `direct` (inline CLI review). Default: `slack`.

### Schedule

- **interval** — Minutes between idle scans (default 15)
- **activeInterval** — Minutes between active scans
  (default 1)
- **offhoursInterval** — Minutes between off-hours
  scans. Leave blank to disable.
- **startHour** / **endHour** — Working hours, local
  time 0-23 (default 7-16)
- **days** — Active days, 1=Mon 7=Sun (default 1-5)

### Auto-Reply

- **autoReply** — Enable auto-sending high-confidence
  replies (default true)
- **autoReplyConfidence** — Minimum confidence 0-100
  to auto-send (default 90)

### Guardrail Limits

- **maxAutoReply** — Per cycle (default 5)
- **maxDmNotify** — Per cycle (default 10)
- **maxSends** — Total per cycle (default 15)
- **maxQueue** — Queue depth (default 25)

## People

Per-person context is maintained in individual files
under `~/.slack-monitor/people/`. See SKILL.md Step 4
and Step 7 for details.

**Verifying DM history:** To check if the user has
DM history with someone, use `slack_read_channel` with
their Slack user ID (not their name). Name-based
search is unreliable.

<!-- Add any additional enrichment sources for person
     files here. Example:

**Person enrichment via [source]:** When creating or
updating a person file, also query [source] to get
additional details (e.g., team, role, products).
-->

## Projects

<!-- Add projects the skill should search for context
     when drafting replies. Example:

### My Project

- Location: `/path/to/project`
- Search `docs/` for documentation
- Search source files with Grep for functions/patterns
- Check `CLAUDE.md` for conventions
-->

## Common Questions

<!-- Add recurring question patterns and tips here.
     The skill updates this section as it learns. -->

## Channel Conventions

<!-- Add channel-specific conventions here. Example:

- **#my-channel**: PR links = review requests.
  React with :eyes: when looking, :approved: when done.
-->

## Useful Repo Paths

<!-- Add paths discovered during scans that were
     helpful for answering questions. Example:

- `/path/to/project/docs/architecture.md`
- `/path/to/project/src/api/routes.ts`
-->
