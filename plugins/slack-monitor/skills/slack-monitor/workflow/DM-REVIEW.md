# DM Review Reply Processing (Step 1.5) — Legacy

> **This step only runs when `reviewMode` is `slack`.**
> The default mode is now `remote-control`, which uses
> `/slack-monitor review` instead. This file is kept for
> users who have `reviewMode: slack` configured.
>
> Note: Slack does not notify you of messages you send to
> yourself, so pending review items may go unnoticed.
> Consider switching to `reviewMode: remote-control`.

**Skip this step entirely if `reviewMode` is `remote-control`
or `direct`.**

Before searching for new messages, check whether the
user has replied to any pending DM review threads.

**Optimization:** Run the queue read and the self-DM
channel read (Step 1.7a) in a single parallel batch.
Reuse the self-DM channel results in Step 1.7.

1. **Read** `${CLAUDE_PLUGIN_DATA}/pending_review.json` and
   parse the JSON array. If the file doesn't exist or
   is empty, skip to Step 2.

2. For each item where `dm_ts` is set, call
   `slack_read_thread` with `channel_id: $userId` and
   `message_ts: <dm_ts>`. Run these reads in parallel.

3. Look for replies in the thread (messages with `ts`
   greater than `dm_ts`). Ignore the parent message.
   If no replies, skip this item.

4. Parse the **most recent** reply text:

   | Reply     | Action                          |
   |-----------|---------------------------------|
   | `1`       | Send the **concise** draft       |
   | `2`       | Send the **detailed** draft      |
   | `3`       | Send the **casual** draft        |
   | `skip`    | Remove from queue, do not reply  |

5. **Execute the action:**

   - **Send draft:** Call `slack_send_message` with
     `channel_id` from the queue item. Always include
     `thread_ts` to reply in-thread. For DM
     conversations where `thread_ts` is null, send as
     a top-level message.

     Remove the item from the pending queue: parse the
     current array, filter out by `id`, **Write** the
     updated array back to
     `${CLAUDE_PLUGIN_DATA}/pending_review.json`.

     Append to `${CLAUDE_PLUGIN_DATA}/saved_messages.md`
     using the **Edit** tool with the sent reply text
     and "Notes: sent via DM review".

   - **Skip:** Remove from queue without sending. Log
     as "skipped via DM review".

   - **Unrecognized reply:** Ignore — the user may
     have followed the permalink and replied directly.
     Leave the item in the queue.

6. After processing, send a brief confirmation reply
   in the DM thread using the `*[Monitor]*` prefix +
   italic format.

7. Track how many items were processed for the Step 8
   summary.
