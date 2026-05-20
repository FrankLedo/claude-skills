# Tickler — State File Format

Reference for the single state file stored in `${CLAUDE_PLUGIN_DATA}/`.

## `CLAUDE.md`

YAML frontmatter holds config. The markdown body holds custom type
definitions and notes accumulated over time.

```yaml
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
```

Custom types are defined in the `## Custom Types` section of the body.
See the template at `$SKILL_SCRIPTS_DIR/templates/CLAUDE.md` for the
full format and examples.

## `tickler.json`

Single file containing both the watch list and each item's last observed
state. All reads and writes go through `scripts/state.js` — do not use
Read/Write tools on this file directly.

```json
[
  {
    "id": "uuid-v4",
    "url": "https://github.com/org/repo/pull/123",
    "type": "github-pr",
    "condition": "approved",
    "label": "optional human label",
    "added": "2026-03-18T12:00:00Z",
    "snoozed_until": null,
    "state": {
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
]
```

`state` is `null` for newly added items that have not yet been checked.
`state` fields vary by item type (see CHECK.md for per-type schemas).
