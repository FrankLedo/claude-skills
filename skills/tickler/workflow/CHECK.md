# Tickler — Check Items

Read during Step 2 of the check cycle.

## Haiku subagent instructions

Spawn a haiku-model Agent. Pass it:
- The full tickler.json item list
- The current state.json
- The config (githubToken, jiraBaseUrl, jiraEmail, jiraToken)
- The path to scripts: `$SKILL_SCRIPTS_DIR/scripts/`

The subagent must:
1. For each non-snoozed item, fetch current state using the
   appropriate script (see below)
2. Compare fetched state against state.json entry
3. Return: `changed[]` (items whose condition is met or that have
   new activity) and `updated_state` (new state for all items)

## GitHub PR — fetch

```bash
node $SKILL_SCRIPTS_DIR/scripts/fetch-github.js \
  --url "<pr-url>" \
  --token "<githubToken or empty>"
```

Output JSON:

```json
{
  "status": "open|closed|merged",
  "title": "...",
  "approvals": 2,
  "changes_requested": false,
  "merged": false,
  "comment_count": 5,
  "last_activity": "ISO8601"
}
```

**Condition matching for github-pr:**

- `approved`: `approvals >= 1`
- `merged`: `merged === true`
- `closed`: `status === "closed"` and `merged === false`
- `changes-requested`: `changes_requested === true`
- `new-comment`: `comment_count > state.comment_count`
- `any`: any field differs from stored state

## GitHub Issue — fetch

Same script, same flags. Output JSON:

```json
{
  "status": "open|closed",
  "title": "...",
  "labels": ["bug", "p1"],
  "comment_count": 3,
  "last_activity": "ISO8601"
}
```

**Condition matching for github-issue:**

- `closed`: `status === "closed"`
- `new-comment`: `comment_count > state.comment_count`
- `labeled:<label>`: label appears in `labels[]` and was not there before
- `any`: any field differs

## Jira — fetch

```bash
node $SKILL_SCRIPTS_DIR/scripts/fetch-jira.js \
  --ticket "<PROJ-123>" \
  --base-url "<jiraBaseUrl>" \
  --email "<jiraEmail>" \
  --token "<jiraToken>"
```

Output JSON:

```json
{
  "status": "In Progress",
  "summary": "...",
  "comment_count": 4,
  "last_activity": "ISO8601"
}
```

**Condition matching for jira:**

- `status:<value>`: `status === value` (case-insensitive)
- `new-comment`: `comment_count > state.comment_count`
- `any`: any field differs

## Gotchas

- On network error or non-200 response, log the error but do NOT
  remove the item from the watch list. Skip it this cycle.
- GitHub merged PRs: the REST API returns `state: "closed"` for both
  closed-without-merge and merged. Check `pull_request.merged`
  (or `merged_at`) separately.
- Jira status comparison must be case-insensitive (`"done"` == `"Done"`).
- If `jiraBaseUrl` is empty and a jira item exists, skip it and warn.
