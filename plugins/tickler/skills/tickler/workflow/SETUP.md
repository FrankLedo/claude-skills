# Tickler — Setup Wizard

Read when `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` is missing or when
the user runs `/tickler setup`.

### Step 1 — Notification method

Use `AskUserQuestion`:

> "How should tickler notify you when something changes?"
> - `direct` — print to the terminal (works anywhere)
> - `slack` — send a DM to yourself on Slack (requires Slack MCP)

If `slack`, ask: "What is your Slack user ID? (Profile → More →
Copy member ID)"

### Step 2 — Work hours

Ask: "What are your work hours? (e.g. 8-18, Mon-Fri)"
Default: start=8, end=18, days=1-5.
Ask: "How often should tickler check during work hours (minutes)?"
Default: 60.

### Step 3 — GitHub token (optional)

Ask: "Do you have a GitHub personal access token? (Recommended if
you watch private repos or want higher rate limits)"
- If yes: "Paste your token (it will be stored in CLAUDE.md)"
- If no: skip (public repos work without a token)

### Step 4 — Jira (optional)

Ask: "Do you want to watch Jira tickets?"
- If yes:
  - "What is your Jira base URL? (e.g. https://myorg.atlassian.net)"
  - "What is your Jira email?"
  - "What is your Jira API token? (atlassian.com/manage-profile/security/api-tokens)"
- If no: skip

### Step 5 — Write config

**Write** the populated config as YAML frontmatter to
`${CLAUDE_PLUGIN_DATA}/CLAUDE.md`, using the template at
`$SKILL_SCRIPTS_DIR/templates/CLAUDE.md` as the base.

Create empty watch list if not present:
**Write** `[]` to `${CLAUDE_PLUGIN_DATA}/tickler.json` (only if
the file does not exist).

### Step 6 — Confirm

Output a summary and offer: "Run a check cycle now?"
