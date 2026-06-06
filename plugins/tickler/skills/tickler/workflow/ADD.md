# Tickler — Add / Update / Remove / List

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
  `ci-passed`, `ci-failed`, `new-comment`, `any`
- `github-issue`: `closed`, `new-comment`, `labeled:<label>`, `any`
- `jira`: `status:<value>` (e.g. `status:Done`), `new-comment`, `any`
- If no condition given, default to `any`

### Steps

1. Load current items to check for duplicates:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js list --data $CLAUDE_PLUGIN_DATA
   ```
   If the URL already exists, tell the user and offer to update it in place
   (see **Updating an item** below) rather than removing and re-adding.

2. Fetch baseline state immediately to avoid a false-positive on the first
   monitor cycle. Use the appropriate fetch script directly (the item is not
   yet in tickler.json so check.js would skip it):

   **GitHub PR or issue:**
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/fetch-github.js \
     --url <item-url> [--token <githubToken>]
   ```

   **Jira:**
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/fetch-jira.js \
     --url <item-url> \
     --jira-base-url <jiraBaseUrl> --jira-email <jiraEmail> --jira-token <jiraToken>
   ```

   The script prints a JSON state object. Use it as the `baseline-state-json`
   in step 4.

3. Ask: "Would you like to add any actions?" Offer examples relevant to the
   item type:

   **GitHub PR:**
   - `When approved → merge (squash)` — `{ "on": "approved", "do": "merge", "confirm": true }`
   - `When merged → transition Jira ticket` — `{ "on": "merged", "do": "jira_transition", "args": { "to": "Done" } }`
   - `When merged → remove from watch list` — `{ "on": "merged", "do": "remove_from_watch" }`
   - `When merged → run a command` — `{ "on": "merged", "do": "run", "args": { "cmd": "/my-skill" } }`
   - `When CI fails → interactive menu` — `{ "on": "ci-failed", "do": "interactive", "args": { "prompt": "CI failed — how do you want to respond?", "options": [{ "label": "Post a comment", "do": "comment", "args": { "body": "CI failed — investigating" } }, { "label": "Close PR", "do": "close" }] } }`

   **GitHub Issue:**
   - `When closed → remove from watch list` — `{ "on": "closed", "do": "remove_from_watch" }`
   - `When closed → post a comment` — `{ "on": "closed", "do": "comment", "args": { "body": "Done!" } }`

   **Jira:**
   - `When status changes → remove from watch list` — `{ "on": "status:<value>", "do": "remove_from_watch" }`

   Valid verbs:

   | Verb | Notes | confirm default |
   |---|---|---|
   | `merge` | `args.method`: `squash` (default), `merge`, `rebase`; `args.admin: true` to bypass branch protection | `true` |
   | `close` | Closes issue or PR | `true` |
   | `comment` | Posts `args.body` as a comment | `false` |
   | `jira_transition` | Transitions to `args.to` status | `false` |
   | `remove_from_watch` | Drops from tickler.json | `false` |
   | `run` | Dispatches `args.cmd` as an Agent prompt (multi-step / slash commands) | `false` |
   | `shell` | Runs `args.cmd` directly via execSync — no agent spawned (use for single shell commands like `gh pr ready`) | `false` |
   | `slack_dm` | DMs `args.body` to the configured slackUserId | `false` |
   | `interactive` | Presents a menu + free-form conversation loop to the user (direct mode only); `args.prompt` required, `args.options[]` optional | N/A |
   | `todoist_close` | Marks a Todoist task complete; `args.task` = task name or numeric ID | `false` |
   | `todoist_create` | Creates a new Todoist task; `args.title` required, `args.due` (natural language or ISO date) and `args.project` optional | `false` |
   | `todoist_comment` | Adds a comment to a Todoist task; `args.task` = task name or numeric ID, `args.body` required | `false` |

   For Todoist verb details and MCP tool mapping, **Read**
   `$SKILL_SCRIPTS_DIR/agents/todoist-prompt.md`.

   If the user declines or says "no actions", skip to step 4 with an empty actions array.

4. Add the item and its baseline state atomically:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js add-item \
     --data $CLAUDE_PLUGIN_DATA \
     '<item-json>' \
     '<baseline-state-json>'
   ```
   `item-json` must include `actions` (empty array `[]` if none). The script
   auto-fills `id` (UUID v4), `added` (ISO 8601), and `snoozed_until: null`.
   It exits 1 if the URL already exists.

5. Confirm to user: "Watching [url] for [condition]." If actions were added,
   list them: "Actions: when [on] → [do]."

## Updating an item

Parse: `update <url-or-id>` plus whatever the user wants to change (condition,
label, or actions). Use this to change a watched item in place — it preserves
the item's `id`, `added`, `snoozed_until`, and observed `state`, so the next
monitor cycle does not see a false change. Removing and re-adding would reset
all of those, so prefer `update` for any edit to an existing item.

1. Load current items to find the target and see its current actions:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js list --data $CLAUDE_PLUGIN_DATA
   ```
   Match by URL (partial match ok; confirm if ambiguous).

2. Build a **partial** patch JSON containing only the fields to change:
   - Top-level fields (`condition`, `label`) overwrite shallowly.
   - `actions` merge by the `on` key: an action whose `on` matches an existing
     one **replaces** it; a new `on` is **appended**. Actions you don't mention
     are kept. Because the merge only adds or replaces, it cannot delete an
     action — to drop one, `remove <url>` then `add` the item fresh.
   - Do **not** include `url` (the lookup key cannot be changed — remove and
     re-add for that), `id`, `added`, `snoozed_until`, or `state` unless you
     deliberately intend to overwrite them.

3. Apply the patch atomically:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js update-item \
     --data $CLAUDE_PLUGIN_DATA \
     '<url>' \
     '<partial-json>'
   ```
   The script exits 1 if the URL is not found, if the patch is not a JSON
   object, if it tries to change `url`, or if it contains a forbidden key
   (`__proto__`, `constructor`, `prototype`). It prints the updated item.

4. Confirm to user what changed, e.g. "Updated [url]: condition → merged."

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
- `update-item` exits 1 if the URL is not found — confirm URL with user. It
  cannot change `url`; remove + re-add for that.
- Prefer `update-item` over remove + re-add when editing an existing item — it
  keeps `id`, `added`, `snoozed_until`, and `state` intact.
- `remove-item` exits 1 if the URL is not found — confirm URL with user.
- Do NOT generate UUIDs or timestamps manually — the script handles that.
- Do NOT use Read/Write tools on tickler.json directly.
