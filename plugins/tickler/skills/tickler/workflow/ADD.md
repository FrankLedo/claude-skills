# Tickler — Add / Remove / List

All reads and writes go through `scripts/state.js`. Do not use Read/Write
tools on tickler.json directly.

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

1. Load current items to check for duplicates:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js list --data $CLAUDE_PLUGIN_DATA
   ```
   If the URL already exists, tell the user and offer to update the condition.

2. Fetch current state immediately (run a single check for this item using
   the methods in CHECK.md) to establish a baseline — avoids a
   false-positive on first monitor cycle.

3. Add the item and its baseline state atomically:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js add-item \
     --data $CLAUDE_PLUGIN_DATA \
     '<item-json>' \
     '<baseline-state-json>'
   ```
   The script auto-fills `id` (UUID v4), `added` (ISO 8601), and
   `snoozed_until: null`. It exits 1 if the URL already exists.

4. Confirm to user: "Watching [url] for [condition]."

## Removing an item

Parse: `remove <url-or-id>`

1. Load current items to find the target:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js list --data $CLAUDE_PLUGIN_DATA
   ```
   Match by URL (partial match ok; confirm if ambiguous).

2. Remove item and its embedded state atomically:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js remove-item \
     --data $CLAUDE_PLUGIN_DATA \
     '<url>'
   ```

3. Confirm: "No longer watching [url]."

## Listing items

1. Load all items:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js list --data $CLAUDE_PLUGIN_DATA
   ```

2. For each item, show:
   - URL / label
   - Condition
   - Current status (from `item.state.status`)
   - Last checked time (`item.state.last_checked`)
   - Snoozed until (if set)

## Gotchas

- `add-item` exits 1 if the URL is already in tickler.json — check first.
- `remove-item` exits 1 if the URL is not found — confirm URL with user.
- Do NOT generate UUIDs or timestamps manually — the script handles that.
- Do NOT use Read/Write tools on tickler.json directly.
