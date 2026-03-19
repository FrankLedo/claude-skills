# Tickler — State File Formats

Reference for all files stored in `${CLAUDE_PLUGIN_DATA}/`.

## `config.json`

```json
{
  "notify": "direct",
  "slackUserId": "",
  "workHours": { "start": 8, "end": 18, "days": "1-5" },
  "interval": 60,
  "githubToken": "",
  "jiraBaseUrl": "",
  "jiraEmail": "",
  "jiraToken": ""
}
```

## `tickler.json`

Array of watched items. See SKILL.md for full field reference.
The `id` field is a UUID string. `snoozed_until` is ISO 8601 or null.

```json
[
  {
    "id": "uuid-v4",
    "url": "https://github.com/org/repo/pull/123",
    "type": "github-pr",
    "condition": "approved",
    "label": "optional human label",
    "added": "2026-03-18T12:00:00Z",
    "snoozed_until": null
  }
]
```

## `state.json`

Keyed by URL/ticket-id. Each value is the last fetched state for
that item. Fields vary by type (see CHECK.md for schemas).

```json
{
  "https://github.com/org/repo/pull/123": {
    "status": "open",
    "title": "Fix the thing",
    "approvals": 1,
    "changes_requested": false,
    "merged": false,
    "comment_count": 4,
    "last_activity": "2026-03-17T10:00:00Z",
    "last_checked": "2026-03-18T09:00:00Z"
  }
}
```
