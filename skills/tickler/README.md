# tickler

Watch GitHub PRs, GitHub issues, and Jira tickets. Get notified when
something changes or meets a condition you care about.

## Usage

### Add a watch

```text
/fxl:tickler add https://github.com/org/repo/pull/123 approved
/fxl:tickler add https://github.com/org/repo/issues/456 closed
/fxl:tickler add PROJ-789 status:Done
/fxl:tickler add https://github.com/org/repo/pull/99
```

### Check now

```text
/fxl:tickler
```

### Manage

```text
/fxl:tickler list
/fxl:tickler remove https://github.com/org/repo/pull/123
/fxl:tickler stop
/fxl:tickler setup
```

## Conditions

| Type | Conditions |
|------|-----------|
| GitHub PR | `approved`, `merged`, `closed`, `changes-requested`, `new-comment`, `any` |
| GitHub Issue | `closed`, `new-comment`, `labeled:<label>`, `any` |
| Jira | `status:<value>`, `new-comment`, `any` |

## Notifications

Configure in setup: `direct` (terminal) or `slack` (DM to self).

## Requirements

- Node.js (for fetch scripts)
- GitHub personal access token (recommended; required for private repos)
- Jira API token (if watching Jira tickets)
- Slack MCP (if using Slack notifications)
