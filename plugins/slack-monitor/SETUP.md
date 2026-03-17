# Slack Monitor — First Run Setup

This file is read by the skill when no `CLAUDE.md` is
found at `~/.slack-monitor/CLAUDE.md`. It walks the
user through initial configuration.

## Setup Wizard

### Step 1 — Copy templates

Copy the entire templates directory to create the
state directory with all default files:

```bash
cp -r $SKILL_SCRIPTS_DIR/templates ~/.slack-monitor
```

This creates `~/.slack-monitor/` with `CLAUDE.md`
and `people/_template.md` in one command.

### Step 2 — Walk through configuration

Use `AskUserQuestion` for each field. Show the default
value and a brief description.

**Required (no default — must be provided):**

- `userId` — "What is your Slack user ID? (Find it
  in your Slack profile > More > Copy member ID)"
- `workspaceDomain` — "What is your Slack workspace
  domain? (e.g. `myteam.slack.com`)"

**Recommended (have defaults but commonly customized):**

- `selfDmChannel` — "What is your self-DM channel ID?
  (Leave blank to skip self-DM commands)"
- `channels` — "Which channels should I watch?
  (Comma-separated channel IDs, or blank for none)"
- `groups` — "Which group @mentions should I monitor?
  (Comma-separated subteam IDs, or blank for none)"
- `reviewMode` — offer options: `slack` (recommended
  for background monitoring) or `direct` (for active
  terminal sessions)

**Optional (sensible defaults — offer to skip):**

After the recommended fields, offer:

> "Use defaults for the rest, or customize?"

Options:
- `Use defaults` — skip to Step 3
- `Customize` — continue with:
  - `autoReply` / `autoReplyConfidence`
  - `interval` / `activeInterval`
  - `startHour` / `endHour` / `days`
  - `offhoursInterval`
  - Guardrail limits (`maxAutoReply`, `maxDmNotify`,
    `maxSends`, `maxQueue`)

### Step 3 — Write config

**Write** the populated JSON to
`~/.slack-monitor/CLAUDE.md`.

### Step 4 — Confirm and proceed

Output a summary of the configuration, then proceed
with the first scan cycle using those values.
