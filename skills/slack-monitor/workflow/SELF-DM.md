# Self-DM Command Processing (Step 1.7)

Read this file when `selfDmChannel` is configured.

## 1.7a. New top-level commands

1. Reuse the self-DM channel results from the parallel
   read in Step 1.5. If not already read, call
   `slack_read_channel` with
   `channel_id: $selfDmChannel`, `limit: 10`.

2. Filter to messages where:
   - `message_ts` (as float) > `last_scan_epoch`
   - Message is from `userId` (not from a bot or
     this skill's own replies)
   - Message is **not** a thread reply (`thread_ts` is
     absent or equals `message_ts`)

   Skip messages that are replies in existing threads —
   those are handled by 1.7b (continued threads),
   Step 1.5 (DM review replies), or are the skill's
   own responses.

3. For each matching message (oldest first):

   a. Read the message text as an instruction or
      question.

   b. Gather context as needed (same approach as
      Step 4.3 — search repos, docs, etc. based on
      what the message asks about).

   c. Execute the instruction or compose a response.

   d. Reply **in-thread** on the original message using
      `slack_send_message` with
      `channel_id: $selfDmChannel` and
      `thread_ts: <message_ts>`.

   e. Do NOT use `AskUserQuestion` — respond directly
      in the DM thread so the scan is non-blocking.

## 1.7b. Continued thread conversations

After processing new top-level commands, check for
threads where the user has replied to a previous skill
response (multi-turn conversation).

1. From the channel messages read in 1.7a, identify
   top-level messages that have `reply_count > 0` and
   where `latest_reply` (as float) > `last_scan_epoch`.

   Exclude threads already handled by Step 1.5.

2. For each candidate thread, call `slack_read_thread`
   with `channel_id: $selfDmChannel` and
   `message_ts: <thread parent ts>`.

3. Check the **last message** in the thread:
   - If it's from `userId` and its `ts` >
     `last_scan_epoch`: the user has continued the
     conversation — process it.
   - If it's from a bot or the skill: already
     responded — skip.

4. For each thread that needs a response:

   a. Read the **full thread** for conversation context.

   b. Treat the user's latest reply as a follow-up
      question or instruction.

   c. Gather additional context as needed.

   d. Reply **in the same thread** using
      `slack_send_message` with
      `channel_id: $selfDmChannel` and
      `thread_ts: <thread parent ts>`.

   e. Do NOT use `AskUserQuestion`.

## 1.7c. Summary tracking

Track how many self-DM commands were processed (both
new commands from 1.7a and continued threads from 1.7b)
for the Step 8 summary.
