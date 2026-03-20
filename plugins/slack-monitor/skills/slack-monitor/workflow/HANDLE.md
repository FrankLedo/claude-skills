# Handle Messages (Steps 4 + 7)

Read this file when actionable messages are found after
filtering in Step 3.

## Step 4 — Handle Each Message

For each remaining message, in chronological order:

1. Display full context:
   - **From:** sender name
   - **Where:** channel name or DM
   - **When:** human-readable timestamp
   - **Message:** full text
   - **Thread context:** if it's a thread reply, show
     the parent message too

2. **Load person context:** Resolve the sender's Slack
   user ID to a filename:
   `${CLAUDE_PLUGIN_DATA}/people/<firstname_lastname>.md`.
   If the file exists, **Read** it — use their title,
   team, timezone, communication style, and recent
   interactions to tailor the reply. If it doesn't
   exist, **Read** the template at
   `${CLAUDE_PLUGIN_DATA}/people/_template.md` (if missing,
   **Read** from
   `$SKILL_SCRIPTS_DIR/templates/people/_template.md`).
   Look up the sender with `slack_search_users` to
   populate fields that can be determined from the
   Slack profile (name, slack_id, title, timezone).
   For fields that cannot be inferred (e.g. team,
   squads, products), ask the user rather than
   guessing. This keeps the template flexible — if new
   fields are added to the template, the same rule
   applies: fill what you can determine, ask for the
   rest. Also check the knowledge sections of
   `CLAUDE.md` for any additional enrichment sources
   noted in the People section.

   **DM verification:** To check whether the user has
   prior DM history with someone, use
   `slack_read_channel` with the person's Slack user
   ID — **not** name-based
   `slack_search_public_and_private`. Name-based DM
   search (`from:Name to:me`) is unreliable and often
   returns zero results even when DMs exist. Always
   verify by reading the DM channel directly.

3. Gather context before drafting — run all applicable
   searches in parallel. **Read** the full
   `${CLAUDE_PLUGIN_DATA}/CLAUDE.md` (if not already loaded
   this cycle) and use the Projects, Common Questions,
   and other knowledge sections to determine what
   context sources to search (repos, MCP tools, docs,
   etc.).

4. Draft **three replies** in different styles,
   incorporating specific details from context
   gathered in step 3. Cite sources when relevant so
   the recipient knows where the info came from.

   **Reply styles:**

   - **Concise** — 1–2 sentences, straight to the
     point
   - **Detailed** — thorough answer with context,
     citations, and reasoning
   - **Casual** — friendly and conversational tone

   For each reply, assign a **confidence score**
   (0–100):

   | Score   | Meaning                                |
   |---------|----------------------------------------|
   | 90–100  | Definitive answer from docs/code, or   |
   |         | simple acknowledgment — safe to        |
   |         | auto-send                              |
   | 60–89   | Good answer but may need nuance or     |
   |         | the user's personal judgment            |
   | 0–59    | Ambiguous question, limited context,   |
   |         | or requires a decision only the user   |
   |         | can make                               |

   Mark the best reply as **Recommended**.

5. **Auto-reply gate:** If `autoReply` is `true` and
   the recommended reply's confidence is >=
   `autoReplyConfidence` (default 90):
   - If `draftMode` is `false`: send the recommended
     reply via `slack_send_message`.
   - If `draftMode` is `true`: create a Slack draft via
     `slack_send_message_draft` instead. The reply is
     not posted — it appears as a draft the user can
     edit and send in Slack.
   - **Send a notification DM** to the user
     (`channel_id: $userId`) so they know what was
     sent or drafted. Format:

     Build the permalink as:
     `https://$workspaceDomain/archives/{channel_id}/p{message_ts without dot}`

     ```
     *[Monitor]*
     _*{if draftMode: "Draft created" else "Auto-sent reply"}* ({confidence}%)
     {channel_name} · {human-readable time}
     <permalink|View in Slack>_

     _From {from}:_
     > {message_text}

     _{if draftMode: "Drafted" else "Sent"} ({recommended style}):_
     > {reply text}
     ```

   - Log in the summary as
     "auto-drafted (confidence: N%)" or
     "auto-sent (confidence: N%)" accordingly
   - Append to `${CLAUDE_PLUGIN_DATA}/saved_messages.md`
     using the **Edit** tool
   - Skip the queue for this message

6. **Present for review** — **Read**
   `$SKILL_SCRIPTS_DIR/workflow/REVIEW.md` and follow
   the review workflow for the configured `reviewMode`.

7. Only call `slack_send_message` or
   `slack_send_message_draft` for auto-replies/drafts
   (step 5) and DM review notifications (step 6).
   `slack_send_message_draft` is used when
   `draftMode: true` for replies to others;
   notification DMs to the user are always sent
   directly via `slack_send_message`.
   Actual reply sends from user choices happen in
   Step 1.5.

## Step 7 — Learn and Improve

**Skip conditions:** Skip knowledge and skill-file
updates if no messages were found at all (0 raw results
across all searches). However, **always run per-person
updates** when messages from other people were
observed — even if those messages were filtered as
non-actionable (already replied, duplicates, etc.).

### 7a. Per-person updates

For every **unique sender** observed in the raw search
results (before filtering), check whether a person file
exists at
`${CLAUDE_PLUGIN_DATA}/people/<firstname_lastname>.md`:

- **New person encountered** — **Read** the template
  (from `${CLAUDE_PLUGIN_DATA}/people/_template.md`, or if
  missing from
  `$SKILL_SCRIPTS_DIR/templates/people/_template.md`),
  then populate with `slack_search_users` data. Fill
  fields that can be determined from the Slack profile;
  ask the user for any fields that can't be inferred.
  **Write** the new file as
  `firstname_lastname.md` (lowercase, underscored).
- **Existing person — update interactions** — **Read**
  the person file, then **Edit** to append to
  `## Recent Interactions` (keep the last 10 entries,
  oldest first). Format:

  ```
  - **YYYY-MM-DD** — [topic summary] (replied /
    skipped / observed / auto-sent)
  ```

  Use "observed" for messages that were seen but
  filtered as non-actionable.

- **Context learned** — **Edit** the `## Context`
  section with useful observations.
- **Communication style observed** — **Edit**
  `## Communication Style` with tone/detail
  preferences when new patterns are noticed.

**Efficiency:** On cycles with many non-actionable
messages from the same person, a single "observed"
interaction entry is sufficient.

### 7b. Knowledge updates (skip on empty cycles)

If 0 actionable messages, 0 self-DM commands, and 0 DM
review replies were processed, skip this sub-step.

Update the knowledge sections of
`${CLAUDE_PLUGIN_DATA}/CLAUDE.md` when:

- **New useful repo paths** — add to the
  "Useful Repo Paths" section
- **Recurring question patterns** — add to the
  "Common Questions" section

### 7c. Skill file updates (rare)

Update the skill's `SKILL.md` only when the **workflow
itself** needs to change. Only write updates when there
is something genuinely new to persist.
