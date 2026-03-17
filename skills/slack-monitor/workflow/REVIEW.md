# Review Mode + Message Formatting + Threading

Read this file when messages need to be sent (auto-reply
notifications, review DMs, or replies on behalf of the
user).

## Message Formatting

Messages sent **to the user** (DM notifications, review
DMs, confirmations, self-DM replies) must be visually
distinct from the user's own messages. Use a **bold
prefix** plus **italic body**:

- Prefix every skill-originated DM with `*[Monitor]*`
  on its own line
- Wrap the body text in `_..._` (italic)

This does NOT apply to replies sent **on behalf of the
user** to other channels — those should look natural
and unstyled.

## Threading Rule

**All replies sent on behalf of the user MUST be
threaded to the original message** using
`thread_ts: <message_ts>`. This applies to:

- Auto-replies
- DM review replies
- Any message sent to a channel or DM on the user's
  behalf

The only exception is **new top-level DM messages**
where the original message itself is top-level in a DM
conversation (no thread context) — in that case, reply
as a top-level message in the same DM channel.

When building queue items, always set `thread_ts` to
the `message_ts` of the original message. For messages
that are already thread replies, use the thread's
parent `thread_ts` instead.

## Review Modes

`reviewMode` controls how the user reviews and approves
draft replies. Default: `slack`.

| Mode     | Interface        | Blocking? |
|----------|------------------|-----------|
| `slack`  | Slack DMs        | No        |
| `direct` | Claude Code CLI  | Yes       |

### `slack` mode (non-blocking)

a. Build a pending review queue item (leave `dm_ts`
   and `dm_channel_id` as `null` for now).

b. Send a Slack DM to the user with the message
   context and all three drafted replies. Use
   `slack_send_message` with
   `channel_id: $userId`. Format:

   Build the permalink as:
   `https://$workspaceDomain/archives/{channel_id}/p{message_ts without dot}`

   ```
   *[Monitor]*
   _*Message from {from}*
   {channel_name} · {human-readable time}
   <permalink|View in Slack>_

   > {message_text}

   {if thread_context:}
   _Thread context:_
   > {thread_context}

   ---
   _*1. Concise* ({confidence}%)
   {if recommended: " — Recommended"}_
   > {concise draft text}

   _*2. Detailed* ({confidence}%)
   {if recommended: " — Recommended"}_
   > {detailed draft text}

   _*3. Casual* ({confidence}%)
   {if recommended: " — Recommended"}_
   > {casual draft text}

   _Reply: `1` `2` `3` `skip`_
   ```

c. Capture the `ts` from the `slack_send_message`
   response. Update the queue item: set `dm_ts` to
   the returned `ts` and `dm_channel_id` to `userId`.
   Add to the pending queue: **Read** the current
   `pending_review.json`, parse the array, append the
   new item, **Write** the updated array back.

d. Log in the summary as "queued + DM sent". Do NOT
   use `AskUserQuestion`.

### `direct` mode (blocking)

a. Display the message context and all three drafts
   in the conversation.

b. Use `AskUserQuestion` with options:
   - `1 — Concise ({confidence}%)`
   - `2 — Detailed ({confidence}%)`
   - `3 — Casual ({confidence}%)`
   - `skip — Do not reply`

c. Based on the user's choice:
   - **1/2/3:** Send the chosen draft via
     `slack_send_message` with `thread_ts` per the
     Threading Rule. Log as "sent (direct review)".
   - **skip:** Log as "skipped (direct review)".
   - **Custom text:** Send that text as the reply.

d. This **blocks the scan cycle** — acceptable in
   direct mode because the user is at the terminal.

e. No pending review queue is used in direct mode.

### Off-hours auto-switch

When transitioning to off-hours (`local_hour >= endHour`
or `< startHour`), **force review mode to `slack`**
regardless of the configured `reviewMode`. Off-hours
scans should be non-blocking. When the next scan
detects working hours again, restore the configured
mode.
