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
  `ci-passed`, `ci-failed`, `new-comment`, `any`
- `github-issue`: `closed`, `new-comment`, `labeled:<label>`, `any`
- `jira`: `status:<value>` (e.g. `status:Done`), `new-comment`, `any`
- If no condition given, default to `any`

### Steps

1. Load current items to check for duplicates:
   ```bash
   node $SKILL_SCRIPTS_DIR/scripts/state.js list --data $CLAUDE_PLUGIN_DATA
   ```
   If the URL already exists, tell the user and offer to update the condition.

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
