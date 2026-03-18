# Slack Monitor

A Claude Code skill that scans Slack for unanswered DMs,
@mentions, thread replies, and watched channel activity.
It drafts replies and asks your approval before sending.

## Prerequisites

- Claude Code with the Slack MCP integration connected
- Your Slack user ID (find it in your Slack profile
  under "More" > "Copy member ID")

## Quick Start

Run `/slack-monitor` in Claude Code. If this is your
first time, the skill detects that no config exists and
runs the **setup wizard** (defined in
[SETUP.md](SETUP.md)). The wizard will:

1. Create `${CLAUDE_PLUGIN_DATA}/` with all necessary files
   (copied from `templates/`)
2. Walk you through configuration — required fields
   first (Slack user ID, workspace domain), then
   optional fields (channels, groups, review mode,
   schedule, etc.) with a "use defaults" shortcut
3. Start scanning immediately

Alternatively, set up manually:

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/people"
cp templates/* "${CLAUDE_PLUGIN_DATA}/"
cp -r templates/people/* "${CLAUDE_PLUGIN_DATA}/people/"
```

Then edit `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` with your
values (see [Configuration](#configuration) below) and
run `/slack-monitor`.

## Configuration

All configuration and knowledge lives in
`${CLAUDE_PLUGIN_DATA}/CLAUDE.md`. Configuration is in the
YAML frontmatter; accumulated knowledge (projects,
common questions, people index) is in the markdown body.
A template with defaults is at `templates/CLAUDE.md`.

### Required Fields

| Field             | Description                             |
|-------------------|-----------------------------------------|
| `userId`          | Your Slack user ID (e.g. `UXXXXXXXXXX`) |
| `workspaceDomain` | Slack workspace URL (e.g. `myteam.slack.com`), used for permalinks |

### Optional Fields

| Field                  | Default    | Description                                                          |
|------------------------|------------|----------------------------------------------------------------------|
| `selfDmChannel`        | `""`       | Channel ID for your self-DM (enables self-DM commands)               |
| `channels`             | `""`       | Comma-separated channel IDs to watch                                 |
| `groups`               | `""`       | Comma-separated subteam IDs for group @mention monitoring            |
| `autoReply`            | `true`     | Enable automatic replies for high-confidence drafts                  |
| `autoReplyConfidence`  | `90`       | Minimum confidence score (0-100) to auto-send                        |
| `draftMode`            | `false`    | When `true`, replies are created as Slack drafts instead of being posted directly. You edit and send the draft in Slack — nothing is posted on your behalf. High-confidence auto-replies also become drafts, with a CLI or DM notification. |
| `reviewMode`           | `"slack"`  | `"slack"` (non-blocking DM review) or `"direct"` (inline CLI review) |
| `interval`             | `15`       | Minutes between scans when idle                                      |
| `activeInterval`       | `1`        | Minutes between scans when conversations are active                  |
| `offhoursInterval`     | `null`     | Minutes between off-hours scans (null = no off-hours polling)        |
| `startHour`            | `7`        | Earliest hour to scan (local time, 0-23)                             |
| `endHour`              | `16`       | Latest hour to scan (local time, 0-23)                               |
| `days`                 | `"1-5"`    | Active days (1=Mon, 7=Sun)                                           |
| `maxAutoReply`         | `5`        | Max auto-replies per scan cycle                                      |
| `maxDmNotify`          | `10`       | Max DM notifications per cycle                                       |
| `maxSends`             | `15`       | Max total outbound messages per cycle                                |
| `maxQueue`             | `25`       | Max pending review queue depth                                       |

### Example Config

The config file uses YAML frontmatter with inline
documentation below:

```yaml
---
userId: UXXXXXXXXXX
workspaceDomain: myteam.slack.com
selfDmChannel: DXXXXXXXXXX
channels: CXXXXXXXXXX,CXXXXXXXXXX
groups: SXXXXXXXXXX
autoReply: true
autoReplyConfidence: 90
draftMode: false
reviewMode: slack
interval: 15
activeInterval: 1
offhoursInterval: 60
startHour: 7
endHour: 16
days: 1-5
maxAutoReply: 5
maxDmNotify: 10
maxSends: 15
maxQueue: 25
---
```

See the template at `templates/CLAUDE.md` for full
field descriptions.

## Review Modes

### Slack Mode (default)

Draft replies are sent as Slack DMs to you with
`1`/`2`/`3`/`skip` options. The scan completes
immediately and picks up your reply on the next cycle.
Best for background monitoring.

### Direct Mode

Draft replies are presented in the Claude Code CLI with
clickable options. The scan blocks until you respond.
Best for active terminal sessions where you want instant
control.

## What It Monitors

- **DMs** — direct messages sent to you
- **@mentions** — messages that @mention you
- **Thread replies** — new replies to threads you
  started
- **Watched channels** — all activity in configured
  channels
- **Group mentions** — messages that @mention your
  configured groups
- **Self-DM commands** — instructions you send to
  yourself for the skill to execute

## State Files

All state lives in `${CLAUDE_PLUGIN_DATA}/`:

| File                   | Purpose                                      |
|------------------------|----------------------------------------------|
| `CLAUDE.md`          | Configuration (frontmatter) + knowledge (body) |
| `last_scan`            | Timestamp of last scan (ISO 8601)            |
| `pending_review.json`  | Messages awaiting your review                |
| `search_cache.json`    | Thread read cache (avoids redundant reads)   |
| `saved_messages.md`    | Log of all sent replies                      |
| `people/`              | Per-person profiles and interaction history   |

The state directory is created automatically on first
run. The `CLAUDE.md` template and
`people/_template.md` are copied from the bundled
`templates/` directory.

### Customizing People Profiles

Edit `${CLAUDE_PLUGIN_DATA}/people/_template.md` to add
fields specific to your organization. The default
template includes `name`, `slack_id`, `title`, and
`timezone`. You might add fields like:

```yaml
---
name:
slack_id:
title:
timezone:
department:
team:
manager:
products:
---
```

When the skill encounters a new person, it copies this
template and populates fields it can determine from
the Slack profile. Fields it can't infer are left
blank for you to fill in later (or the skill will ask
you).

## MCP Dependencies

- **Slack MCP** — `slack_search_public_and_private`,
  `slack_read_thread`, `slack_read_channel`,
  `slack_send_message`, `slack_send_message_draft`,
  `slack_search_users`
- Additional MCP integrations are optional — configure
  context sources in your `${CLAUDE_PLUGIN_DATA}/CLAUDE.md`
  knowledge sections

## Architecture

### No scripts or dependencies

This skill has no scripts, no Node.js, no Bash
commands. It uses only Claude's native Read/Write/Edit
tools and MCP integrations.

### Token-optimized file structure

The skill splits its workflow across multiple files to
minimize token consumption on each scan cycle:

```
SKILL.md            ~230 lines — loaded every cycle
workflow/
  GUARDRAILS.md     — loaded only when sending messages
  HANDLE.md         — loaded only when actionable
                      messages are found
  REVIEW.md         — loaded only when presenting
                      drafts for review
  SELF-DM.md        — loaded only when selfDmChannel
                      is configured
  DM-REVIEW.md      — loaded only in slack review mode
  FORMATS.md        — loaded only when reading/writing
                      state files
  SETUP.md          — loaded only on first run or
                      /slack-monitor setup
```

On a typical idle cycle (no new messages), only
`SKILL.md` (~230 lines) is loaded — the `workflow/`
files are never read. This is an **81% reduction**
compared to a single monolithic file, and it means
idle scans (the most common case) are fast and cheap.

When messages are found, the relevant workflow files
are loaded on demand via `Read` calls at the point
they're needed.

## Finding Your Slack IDs

- **User ID:** Slack profile > "More" >
  "Copy member ID"
- **Channel ID:** Right-click channel name >
  "View channel details" > scroll to bottom
- **Self-DM channel:** Open your self-DM, the channel
  ID is in the URL (`/messages/DXXXXXXXXXX`)
- **Subteam ID:** Use the Slack API or ask your
  workspace admin

## Usage

```
/slack-monitor          # Run a scan cycle
/slack-monitor setup    # Run the setup wizard
```

With no arguments, the skill runs a single scan cycle
and schedules the next one via cron. On first run (no
config exists), the setup wizard runs automatically.

Use `setup` to re-run the wizard at any time — it
reads your current config as defaults so you can
update specific fields without starting over.

See [SKILL.md](SKILL.md) for the full workflow
definition.
