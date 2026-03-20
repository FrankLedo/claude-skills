---
notify: direct
slackUserId: ""
workHours:
  start: 8
  end: 18
  days: "1-5"
interval: 60
githubToken: ""
jiraBaseUrl: ""
jiraEmail: ""
jiraToken: ""
---

# Tickler

This file configures the tickler skill. Edit the YAML frontmatter above
to configure, and add notes or type definitions below as you use the skill.

## Configuration Reference

- **notify** — `direct` (print to terminal) or `slack` (DM to self)
- **slackUserId** — Your Slack user ID; required if `notify` is `slack`
- **workHours.start / end** — Active hours in local time (0–23)
- **workHours.days** — Active days, 1=Mon 7=Sun (default `1-5`)
- **interval** — Minutes between checks during work hours (default 60)
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
