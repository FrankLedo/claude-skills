# Tickler — Notify

Read only when Step 3 has changed items.

## Direct notification (notify: "direct")

Print a formatted summary to the terminal:

```text
── Tickler ────────────────────────────────
  ✓ PR #123 approved — "Fix the thing"
    https://github.com/org/repo/pull/123

  ✓ PROJ-789 status changed: In Progress → Done
    https://myorg.atlassian.net/browse/PROJ-789
────────────────────────────────────────────
```

For each item, show:
- What changed (condition met or activity detected)
- Title/summary
- URL
- Offer to snooze: "Snooze for [1h / 4h / tomorrow / remove]?"

## Slack notification (notify: "slack")

Send a DM to `slackUserId` using `slack_send_message`.

Message format (one message per changed item):

```text
*Tickler:* <condition met description>
*<title>*
<url>
```

After sending, do NOT wait for a reply — move on.

## Snooze

When the user chooses to snooze an item after a direct notification:
- `1h` → set `snoozed_until` to now + 1 hour
- `4h` → set `snoozed_until` to now + 4 hours
- `tomorrow` → set `snoozed_until` to start of next work day
- `remove` → remove the item from tickler.json entirely

**Write** updated tickler.json after any snooze or remove action.

## Gotchas

- For `notify: "slack"`, Slack MCP must be available. If
  `slack_send_message` is not available, fall back to direct and
  warn the user.
- Do not send Slack notifications outside work hours — defer to the
  next work-hours cycle.
