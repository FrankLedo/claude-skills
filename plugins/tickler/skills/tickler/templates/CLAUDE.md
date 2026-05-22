---
notify: direct
notifyInput: push
slackUserId: ""
workHours:
  start: 8
  end: 18
  days: "1-5"
interval: 60
# intervalMin: 30   # floor after activity burst (default: interval/2)
# intervalMax: 120  # ceiling during quiet periods (default: interval*2)
autoRemoveTerminal: true
openInBrowser: false
githubToken: ""
jiraBaseUrl: ""
jiraEmail: ""
jiraToken: ""
---

# Tickler

This file configures the tickler skill. Edit the YAML frontmatter above
to configure, and add notes or type definitions below as you use the skill.

## Configuration Reference

- **notify** — `direct` (print to terminal) or `slack` (DM to self; note: Slack self-DMs are not highlighted)
- **notifyInput** — how to alert you when tickler needs your input (confirm a merge, choose an action): `push` (recommended — system notification + Remote Control), `none` (silent wait)
- **slackUserId** — Your Slack user ID; required if `notify` is `slack`
- **workHours.start / end** — Active hours in local time (0–23)
- **workHours.days** — Active days, 1=Mon 7=Sun (default `1-5`)
- **interval** — Base minutes between checks during work hours (default 60)
- **intervalMin** — Floor after activity burst (default: `interval/2`, min 15)
- **intervalMax** — Ceiling during quiet periods (default: `interval*2`)
- **autoRemoveTerminal** — Auto-remove merged/closed GitHub PRs from the watch list after notifying (default `true`; set to `false` to keep them)
- **openInBrowser** — Open each changed item URL in the browser after a check cycle (default `false`; macOS only)
- **githubToken** — Personal access token; required for private repos
- **jiraBaseUrl** — e.g. `https://myorg.atlassian.net`
- **jiraEmail** + **jiraToken** — Jira Cloud API credentials

## Custom Types

<!-- Define custom item types here. Example:

### linear
- **Fetch:** use `linear_get_issue` MCP tool with `{id}`
- **Conditions:** `status:<value>`, `new-comment`, `any`

### pagerduty
- **Fetch:** use `pd_get_incident` MCP tool with `{id}`
- **Conditions:** `resolved`, `acknowledged`, `any`
-->

## Notes

<!-- Tickler adds observations here as it runs. -->
