# Tickler — Check Items

Read during Step 2 of the check cycle.

## Haiku subagent instructions

Spawn a haiku-model Agent. Pass it:
- The full item list (each item includes a `state` field with last observed
  state, or `null` if never checked)
- The config (githubToken, jiraBaseUrl, jiraEmail, jiraToken)
- The path to scripts: `$SKILL_SCRIPTS_DIR/scripts/`

The subagent must:
1. For each non-snoozed item, fetch current state using the
   appropriate method (see below)
2. Compare fetched state against `item.state` (null → treat as first check,
   no change detection, just establish baseline)
3. Return:
   - `changed[]` — items whose condition is met or that have new activity
   - `updated_states` — `{url: stateObject}` map for all checked items

## GitHub PR — fetch

**Use the first available method in order:**

**Method 1 — GitHub MCP** (preferred, no Bash permission needed):
If `github_get_pull_request` or equivalent GitHub MCP tool appears in your
tool list, use it. Extract: `state`, `title`, `mergedAt` (non-null = merged),
latest review states per reviewer (APPROVED / CHANGES_REQUESTED), total
comment count, `updatedAt`.

**Method 2 — `gh` CLI** (no extra permission needed, already allowed):
```bash
gh api repos/{owner}/{repo}/pulls/{number} \
  --jq '{state:.state,title:.title,merged_at:.merged_at,comments:.comments,updated_at:.updated_at}'
gh api repos/{owner}/{repo}/pulls/{number}/reviews \
  --jq '[.[] | {user:.user.login,state:.state}]'
```
Parse owner/repo/number from the URL pattern `github.com/{owner}/{repo}/pull/{number}`.

**Method 3 — Node.js script** (fallback only, may prompt for Bash permission):
```bash
node $SKILL_SCRIPTS_DIR/scripts/fetch-github.js \
  --url "<pr-url>" \
  --token "<githubToken or empty>"
```

Normalise output to this shape regardless of method used:
```json
{
  "status": "open|closed|merged",
  "title": "...",
  "approvals": 2,
  "changes_requested": false,
  "merged": false,
  "comment_count": 5,
  "last_activity": "ISO8601",
  "last_checked": "ISO8601"
}
```

**Condition matching for github-pr:**
- `approved`: `approvals >= 1`
- `merged`: `merged === true`
- `closed`: `status === "closed"` and `merged === false`
- `changes-requested`: `changes_requested === true`
- `new-comment`: `comment_count > item.state.comment_count`
- `any`: any field differs from `item.state`

## GitHub Issue — fetch

**Use the first available method in order:**

**Method 1 — GitHub MCP** (preferred):
If `github_get_issue` or equivalent appears in your tool list, use it.
Extract: `state`, `title`, `labels[].name`, total comment count, `updatedAt`.

**Method 2 — `gh` CLI**:
```bash
gh api repos/{owner}/{repo}/issues/{number} \
  --jq '{state:.state,title:.title,labels:[.labels[].name],comments:.comments,updated_at:.updated_at}'
```

**Method 3 — Node.js script** (fallback):
```bash
node $SKILL_SCRIPTS_DIR/scripts/fetch-github.js \
  --url "<issue-url>" \
  --token "<githubToken or empty>"
```

Normalise output:
```json
{
  "status": "open|closed",
  "title": "...",
  "labels": ["bug", "p1"],
  "comment_count": 3,
  "last_activity": "ISO8601",
  "last_checked": "ISO8601"
}
```

**Condition matching for github-issue:**
- `closed`: `status === "closed"`
- `new-comment`: `comment_count > item.state.comment_count`
- `labeled:<label>`: label appears in `labels[]` and was not there before
- `any`: any field differs from `item.state`

## Jira — fetch

**Use the first available method in order:**

**Method 1 — Jira MCP** (preferred, no Bash permission needed):
If a Jira MCP tool (e.g. `get_issue`, `jira_get_issue`) appears in your
tool list, use it. Extract: status name, summary, total comment count,
last updated timestamp.

**Method 2 — Node.js script**:
```bash
node $SKILL_SCRIPTS_DIR/scripts/fetch-jira.js \
  --ticket "<PROJ-123>" \
  --base-url "<jiraBaseUrl>" \
  --email "<jiraEmail>" \
  --token "<jiraToken>"
```

Normalise output:
```json
{
  "status": "In Progress",
  "summary": "...",
  "comment_count": 4,
  "last_activity": "ISO8601",
  "last_checked": "ISO8601"
}
```

**Condition matching for jira:**
- `status:<value>`: `status === value` (case-insensitive)
- `new-comment`: `comment_count > item.state.comment_count`
- `any`: any field differs from `item.state`

## Gotchas

- Always set `last_checked` to the current ISO 8601 UTC timestamp in the
  returned state object.
- If `item.state` is `null` (new item), establish baseline state but do NOT
  count it as changed — the user added it to watch, not to be notified of
  its current status.
- On network error or non-200 response, log the error but do NOT include
  the item in `changed[]` and do NOT update its state. Skip it this cycle.
- GitHub merged PRs: the REST API returns `state: "closed"` for both
  closed-without-merge and merged. Check `pull_request.merged`
  (or `merged_at`) separately.
- Jira status comparison must be case-insensitive (`"done"` == `"Done"`).
- If `jiraBaseUrl` is empty and a jira item exists, skip it and warn.
