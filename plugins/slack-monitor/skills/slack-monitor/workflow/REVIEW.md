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

`reviewMode` controls how the monitor cycle handles
messages that need review. Default: `remote-control`.

| Mode             | Interface                      | Blocking? |
|------------------|--------------------------------|-----------|
| `remote-control` | Queue + `/slack-monitor review`| No        |
| `direct`         | Inline at terminal each cycle  | Yes       |
| `slack`          | Self-DM in Slack *(legacy)*    | No        |

`draftMode` controls how approved replies are sent.

| `draftMode` | Send method               |
|-------------|---------------------------|
| `false`     | `slack_send_message`      |
| `true`      | `slack_send_message_draft`|

> Notification DMs **to the user** always use
> `slack_send_message` regardless of `draftMode`.

### `remote-control` mode (default, non-blocking)

During the monitor cycle, for each message that is
not auto-sent:

a. Build the pending review queue item (see FORMATS.md).
   Leave `dm_ts` and `dm_channel_id` as `null`.

b. **Read** the current `pending_review.json`, append
   the item, **Write** back. Log as "queued".

c. Do NOT send any DM or use `AskUserQuestion`.
   The monitor cycle ends without waiting.

The user processes queued items by running
`/slack-monitor review`, which presents each item
interactively via `AskUserQuestion`. This works
at the terminal or routed through `/remote-control`.

### `direct` mode (blocking)

For each message that is not auto-sent:

a. Display the message context and all three drafts.

b. Use `AskUserQuestion` with options:
   - `1 — Concise ({confidence}%)`
   - `2 — Detailed ({confidence}%)`
   - `3 — Casual ({confidence}%)`
   - `skip — Do not reply`
   - `custom — Enter your own reply`

c. Based on choice: send or draft via `draftMode`
   rule. Use `thread_ts` per the Threading Rule.
   Log as "sent (direct)" or "drafted (direct)".

d. **Blocks the scan cycle** — only use when the
   user is actively at the terminal.

e. No pending review queue is written in this mode.

### `slack` mode *(legacy — not recommended)*

Self-DM review via Slack. Unreliable because Slack
does not deliver notifications for messages you send
to yourself.

Preserved for existing users who have it configured.
See DM-REVIEW.md for the full `slack` mode flow.

### Off-hours behavior

In `remote-control` mode, off-hours scans behave
identically — items are queued, cycle ends immediately.
No mode switch needed.

In `direct` mode, **force to `remote-control`** when
`local_hour >= endHour` or `< startHour`. Restore
configured mode when working hours resume.
