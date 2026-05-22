# Tickler — Known Limitations & Upstream Issues

These are current limitations in tickler that stem from missing primitives in
Claude Code itself, not bugs in the plugin. Each has a filed upstream issue.
The workaround column explains how tickler handles it today.

---

## Scheduling

### Session context grows unboundedly across wakeup cycles

**Upstream:** [anthropics/claude-code#50920](https://github.com/anthropics/claude-code/issues/50920)

`ScheduleWakeup` re-fires into the same session. As the session accumulates
turns across many cycles, every subsequent cycle pays input tokens for the full
conversation history — even though prior turns are irrelevant to the check.
autoCompact does not fire on the scheduled-wakeup path, so there is no
automatic relief.

**Workaround:** `check.js` tracks a `cycle_count` in `adaptive_interval.json`.
SKILL.md includes a `/compact` reminder in the step 7 report every 10 cycles,
prompting the user to trim history manually. This is advisory only — it doesn't
prevent context growth between reminders.

**If fixed:** autoCompact firing on wakeup cycles (or a `fresh_context` option
on `ScheduleWakeup`) would cap per-cycle cost regardless of session age.

---

### Out-of-hours sleep requires hourly wakeups

**Upstream:** [anthropics/claude-code#61522](https://github.com/anthropics/claude-code/issues/61522)

`ScheduleWakeup` is capped at 3600 seconds (1 hour). When tickler finishes
a work-hours cycle and needs to sleep until the next morning, it can't
schedule a single "wake me at 8am" wakeup — it must wake every hour, check
the time, and reschedule if still outside work hours.

**Workaround:** Step 6 in `SKILL.md` uses `delaySeconds: 3600` unconditionally
outside work hours. Typically fires 1–8 times overnight before landing in
the work window.

**If fixed:** A single `ScheduleWakeup(delaySeconds: 50400)` (14h) would cover
the overnight gap. Zero wasted cycles.

---

## Agents View

### No "Scheduled" state — session disappears between cycles

**Upstream:** [anthropics/claude-code#61523](https://github.com/anthropics/claude-code/issues/61523)
(related: [#47518](https://github.com/anthropics/claude-code/issues/47518))

After `ScheduleWakeup` fires and the session ends its turn, agents view has
no way to show the session as intentionally dormant. It either vanishes from
the active list or shows as **Done**, giving no indication that a check is
coming at a known future time.

**Workaround:** Switched from `CronCreate` (which kept the session perpetually
**Working**) to `ScheduleWakeup` (session goes idle between cycles). Better,
but the session is invisible between cycles rather than showing a useful state.

**If fixed:** The session card would show **Scheduled · next check 8:03 AM**,
making it clear the monitor is alive and when it fires next.

---

## Input & Notifications

### Push notifications can't deep-link to the tickler session

**Upstream:** [anthropics/claude-code#60618](https://github.com/anthropics/claude-code/issues/60618)

When tickler fires a `PushNotification` to alert you that input is needed,
tapping it opens Claude Code but not the specific session. You have to find
the tickler session in agents view manually.

**Workaround:** `notifyInput: push` fires the notification; the user navigates
to the session themselves. In agents view this is one tap; in CLI mode it
requires switching terminal windows.

**If fixed:** Tapping the notification would jump directly to the tickler
session where `AskUserQuestion` is waiting.

### Input questions can't be routed to a different session

**Upstream:** [anthropics/claude-code#44771](https://github.com/anthropics/claude-code/issues/44771)
(related: [#48965](https://github.com/anthropics/claude-code/issues/48965))

When tickler needs confirmation (a `confirm: true` action) or interactive
input, the `AskUserQuestion` always appears inside the tickler session (Session
B), not in whatever session the user is actually working in (Session A). This
means you have to context-switch to answer a question that might benefit from
Session A's full working context.

**Workaround:** Action agents are dispatched with a context note recorded at
add-time. The tickler session handles all input itself; context from Session A
is not available unless explicitly written into the item's watch config.

**If fixed:** Tickler could route `AskUserQuestion` to Session A (or any
nominated session), letting you approve a merge without leaving your working
context.

---

## Event-Driven Monitoring

### Polling instead of webhooks — changes detected up to `interval` minutes late

**Upstream:** [anthropics/claude-code#55981](https://github.com/anthropics/claude-code/issues/55981)

Tickler polls GitHub/Jira on a timer (default 60 minutes, adaptive). There is
no way for an external event (PR approved, issue closed) to trigger a check
immediately. A PR that gets approved one minute after a cycle runs won't be
detected for up to 60 minutes.

**Workaround:** Adaptive interval (`intervalMin`) shortens the polling window
to as low as 15 minutes after recent activity. Still polling, not push.

**If fixed:** A GitHub webhook → Claude Code ingestion path would let tickler
react within seconds of a state change, with no polling overhead at all.

---

## Context & Session Handoff

### No session ID at add-time — can't record which session started the watch

**Upstream:** [anthropics/claude-code#59216](https://github.com/anthropics/claude-code/issues/59216)

When you add an item to tickler from Session A, there's no programmatic way
to record Session A's ID. If Session A is still open when a change fires,
tickler has no way to reference or message it.

**Workaround:** Tickler stores a free-text context note at add-time (if
provided). Action agents receive this note rather than Session A's live context.

**If fixed:** Tickler could store `session_id` alongside each watched item and
use it to route notifications or action requests back to the originating session
if it's still active.
