# Tickler — Add / Remove / List

## Adding an item

Parse the argument: `add <url-or-id> [condition]`

### Detect type from URL/ID

- `github.com/*/pull/*` → `github-pr`
- `github.com/*/issues/*` → `github-issue`
- Matches `[A-Z]+-\d+` or contains `atlassian.net/browse/` → `jira`
- Otherwise: ask the user to clarify

### Valid conditions by type

- `github-pr`: `approved`, `merged`, `closed`, `changes-requested`,
  `new-comment`, `any`
- `github-issue`: `closed`, `new-comment`, `labeled:<label>`, `any`
- `jira`: `status:<value>` (e.g. `status:Done`), `new-comment`, `any`
- If no condition given, default to `any`

### Steps

1. **Read** `${CLAUDE_PLUGIN_DATA}/tickler.json`
2. Check for duplicate — if URL already exists, tell the user and
   offer to update the condition
3. Fetch current state immediately (run a single check for this item)
   so state.json has a baseline — avoids false-positive on first check
4. Append new item to tickler.json with a generated UUID
5. **Write** updated tickler.json
6. **Write** updated state.json with the baseline state
7. Confirm to user: "Watching [url] for [condition]."

## Removing an item

Parse: `remove <url-or-id>`

1. **Read** `${CLAUDE_PLUGIN_DATA}/tickler.json`
2. Find item by URL match (partial match ok, confirm if ambiguous)
3. Remove it; **Write** updated tickler.json
4. Confirm: "No longer watching [url]."

## Listing items

1. **Read** `${CLAUDE_PLUGIN_DATA}/tickler.json`
2. **Read** `${CLAUDE_PLUGIN_DATA}/state.json`
3. For each item, show:
   - URL / label
   - Condition
   - Current status (from state.json)
   - Last checked time
   - Snoozed until (if set)

## Gotchas

- UUIDs: generate with `crypto.randomUUID()` via a Bash one-liner:
  `node -e "console.log(crypto.randomUUID())"` or use a timestamp-
  based fallback: `Date.now().toString(36)`.
