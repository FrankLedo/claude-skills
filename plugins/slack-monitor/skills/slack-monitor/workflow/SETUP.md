# Slack Monitor — First Run Setup

This file is read by the skill when no `CLAUDE.md` is
found at `${CLAUDE_PLUGIN_DATA}/CLAUDE.md`. It walks the
user through initial configuration.

## Migration from Legacy Path

Before running the setup wizard, check whether data
exists at the old location (`~/.slack-monitor/`).

If `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` does **not** exist
but `~/.slack-monitor/CLAUDE.md` **does** exist, migrate
automatically:

```bash
cp -r ~/.slack-monitor/. ${CLAUDE_PLUGIN_DATA}/
```

Then inform the user:

> "Migrated your slack-monitor data to the new plugin
> data directory (`${CLAUDE_PLUGIN_DATA}/`). Your
> original data at `~/.slack-monitor/` has been left
> in place — you can delete it once you're satisfied
> everything is working."

After migration, continue with the normal scan cycle
(skip the Setup Wizard — config is already present).

## Setup Wizard

### Step 1 — Copy templates

Copy the entire templates directory to create the
state directory with all default files:

```bash
cp -r $SKILL_SCRIPTS_DIR/templates ${CLAUDE_PLUGIN_DATA}
```

This creates `${CLAUDE_PLUGIN_DATA}/` with `CLAUDE.md`
and `people/_template.md` in one command.

### Step 2 — Walk through configuration

Use `AskUserQuestion` for each field. Show the default
value and a brief description.

**Detect timezone automatically** before asking any questions:

```bash
# macOS / Linux with systemd
readlink /etc/localtime | sed 's|.*/zoneinfo/||'
```

If that returns a valid IANA name (e.g. `America/Los_Angeles`),
use it as the default for `timezone`. Otherwise fall back to
`$(date +%Z)` as a hint, but ask the user to confirm.

**Required (no default — must be provided):**

- `userId` — "What is your Slack user ID? (Find it
  in your Slack profile > More > Copy member ID)"
- `workspaceDomain` — "What is your Slack workspace
  domain? (e.g. `myteam.slack.com`)"

**Recommended (have defaults but commonly customized):**

- `timezone` — Pre-fill with the detected IANA timezone.
  Ask: "Your timezone looks like `<detected>` — is that
  correct? (IANA format, e.g. `America/New_York`)"
- `selfDmChannel` — "What is your self-DM channel ID?
  (Leave blank to skip self-DM commands)"
- `channels` — "Which channels should I watch?
  (Comma-separated channel IDs, or blank for none)"
- `groups` — "Which group @mentions should I monitor?
  (Comma-separated subteam IDs, or blank for none)"
- `draftMode` — offer options: `false` (post replies
  directly to Slack) or `true` (create Slack drafts
  the user edits and sends manually — avoids any
  attribution). Recommended: `true` if the user wants
  to review wording before anything is posted.
- `reviewMode` — offer options: `slack` (recommended
  for background monitoring) or `direct` (for active
  terminal sessions)

**Optional (sensible defaults — offer to skip):**

After the recommended fields, offer:

> "Use defaults for the rest, or customize?"

Options:
- `Use defaults` — skip to Step 3
- `Customize` — continue with:
  - `timezone` (confirm or change the auto-detected value)
  - `autoReply` / `autoReplyConfidence`
  - `interval` / `activeInterval`
  - `startHour` / `endHour` / `days`
  - `offhoursInterval`
  - Guardrail limits (`maxAutoReply`, `maxDmNotify`,
    `maxSends`, `maxQueue`)

### Step 3 — Write config

**Write** the populated JSON to
`${CLAUDE_PLUGIN_DATA}/CLAUDE.md`.

### Step 4 — Confirm and proceed

Output a summary of the configuration, then proceed
with the first scan cycle using those values.
