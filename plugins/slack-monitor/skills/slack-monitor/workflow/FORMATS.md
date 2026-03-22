# State File Formats

Reference for the JSON/markdown formats used by state
files in `${CLAUDE_PLUGIN_DATA}/`.

## Saved Messages (`saved_messages.md`)

Each entry is a markdown block appended via **Edit**:

```markdown
### YYYY-MM-DD HH:MM — From: {name} — {channel}

- **Message:** {original message text}
- **Reply ({style}):** {reply text}
- **Permalink:** {link}
- **Notes:** {auto-sent / sent via DM review / etc.}
```

If the file doesn't exist, create it with **Write**.

## Search Cache (`search_cache.json`)

Caches the latest reply timestamp for threads checked
during Search C follow-ups. Avoids redundant
`slack_read_thread` calls.

```json
{
  "threads": {
    "<thread_ts>-<channel_id>": {
      "latest_reply_ts": "1234567890.123456",
      "checked_at_epoch": 1773770997
    }
  }
}
```

- **Read** to load, parse JSON inline
- **Check thread:** Compare
  `threads[key].checked_at_epoch >= last_scan_epoch`.
  If true and `latest_reply_ts` unchanged, skip.
- **Update thread:** Modify in memory, **Write** back
- **Prune:** Before writing, remove entries where
  `checked_at_epoch` is > 86400 seconds old

## Cycle Checkpoint (`cycle_checkpoint.json`)

Written at cycle start; deleted on successful completion.
Presence of this file indicates an interrupted cycle.

```json
{
  "started_at": "ISO 8601 UTC",
  "last_step": "init|dm_review|self_dm|search|handle|auth_error",
  "processed_ids": ["<message_ts>-<channel_id>", ...]
}
```

- **On startup:** If `started_at` is within 30 minutes of now,
  resume. Skip messages whose `id` is in `processed_ids`.
- **On success:** Delete this file (Step 5).
- **On auth error:** `last_step` is `"auth_error"` — do not resume
  automatically; wait for user to fix the token.
- If `started_at` > 30 min ago and the cycle is not done, the
  previous cycle was likely abandoned (session restart). Start fresh
  and overwrite.

## Pending Review Queue (`pending_review.json`)

JSON array of messages awaiting human review:

```json
[
  {
    "id": "<message_ts>-<channel_id>",
    "queued_at": "ISO 8601 UTC",
    "from": "sender name",
    "from_id": "UXXXXXXXX",
    "channel_id": "CXXXXXXXX",
    "channel_name": "#channel or DM",
    "message_ts": "1234567890.123456",
    "thread_ts": "1234567890.123456 or null",
    "message_text": "full message text",
    "thread_context": "parent message or null",
    "drafts": {
      "concise":  { "text": "...", "confidence": 85 },
      "detailed": { "text": "...", "confidence": 85 },
      "casual":   { "text": "...", "confidence": 85 }
    },
    "recommended": "concise|detailed|casual",
    "source": "dm|mention|thread|group|watched",
    "dm_ts": "1234567890.123456 or null",
    "dm_channel_id": "DXXXXXXXX or null"
  }
]
```

- **Read** the file, parse JSON. If missing, treat
  as `[]`.
- **Add:** Append item (generate `id` as
  `<message_ts>-<channel_id>` if not set),
  deduplicate by `id`, **Write** back.
- **Remove:** Filter out by `id`, **Write** back.
- **Count:** `array.length`.
