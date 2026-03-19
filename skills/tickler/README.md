# tickler

Watch GitHub PRs, GitHub issues, and Jira tickets. Get notified when
something changes or meets a condition you care about.

## Usage

### Add a watch

```text
/tickler add https://github.com/org/repo/pull/123 approved
/tickler add https://github.com/org/repo/pull/123 merged
/tickler add https://github.com/org/repo/pull/123 changes-requested
/tickler add https://github.com/org/repo/pull/123 new-comment
/tickler add https://github.com/org/repo/issues/456 closed
/tickler add https://github.com/org/repo/issues/456 new-comment
/tickler add https://github.com/org/repo/issues/456 labeled:bug
/tickler add PROJ-789 status:Done
/tickler add PROJ-789 new-comment
/tickler add https://github.com/org/repo/pull/99
```

### Check now

```text
/tickler
```

### Manage

```text
/tickler list
/tickler remove https://github.com/org/repo/pull/123
/tickler stop
/tickler setup
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
- **GitHub:** [GitHub MCP server](https://github.com/github/github-mcp-server) (preferred), or set `GITHUB_TOKEN` env var for the fetch script
- **Jira:** [Jira MCP server](https://github.com/sooperset/mcp-atlassian) (preferred), or set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_TOKEN` env vars
- **Slack notifications:** Slack MCP server
