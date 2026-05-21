# Slack Monitor — Timezone Enforcement Design

**Date:** 2026-05-20
**Issue:** #37 (timezone sub-problem only)
**Goal:** Eliminate the UTC fallback by auto-detecting system timezone; add stale-epoch guardrail.

## Problem

Two related gaps in the current implementation:

1. **UTC fallback when `timezone` is unconfigured.** `monitor-prompt.md` Step 1b says "Fall back to UTC if `timezone` is unset." UTC is wrong for most users. An unconfigured skill silently uses UTC for `local_hour`/`local_dow` computations, causing off-hours misclassification and scan scheduling errors.

2. **No stale-epoch guardrail.** The existing clock-drift guard clamps `last_scan_epoch` when it's in the future, but there is no guard for the opposite case: a `last_scan` that is impossibly old (>24h). This causes the Slack `after:` query to sweep a huge window, returning excessive results.

## What Already Works

- `timezone` IANA config field exists in CLAUDE.md frontmatter.
- `convert-timestamp.js` correctly converts ISO timestamps to epoch using `new Date()` (timezone-safe for Z-suffix strings).
- `local_hour` and `local_dow` are already computed from the injected timezone config.
- Future-timestamp guard already present in Step 1b.

## Solution

### 1. New Script: `scripts/detect-timezone.js`

A minimal Node.js script (built-ins only). Single responsibility: output the system IANA timezone string.

```
Usage:  node detect-timezone.js
Output: America/Los_Angeles
```

Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`. Falls back to `UTC` if the result is empty (defensive only — modern Node.js always returns a value).

No flags, no arguments, no JSON wrapping — just the timezone string on stdout.

### 2. SKILL.md — Timezone Resolution Before Agent Dispatch

In the Monitor Cycle, after reading CLAUDE.md frontmatter (Step 1), SKILL.md resolves the timezone before dispatching the monitor agent:

```
If timezone config is empty or missing:
  node "$SKILL_SCRIPTS_DIR/scripts/detect-timezone.js"
  → use stdout as resolved timezone
```

The resolved value (either from config or auto-detected) is injected into the agent prompt as `timezone`. The agent always receives a non-empty timezone value.

### 3. `monitor-prompt.md` — Two Changes

**Remove UTC fallback:** The line "Fall back to UTC if `timezone` is unset" is removed from Step 1b. Timezone is always provided by SKILL.md.

**Add stale-epoch guardrail:** After the existing future-timestamp guard in Step 1b, add:

```
GUARDRAIL — stale timestamp:
If last_scan_epoch < current_time_epoch - 86400:
  last_scan_epoch = current_time_epoch - 86400
  Log: "GUARDRAIL: last_scan is stale (>24h ago), clamped to 24h window"
```

The two guards together cover both failure directions:
- **Future** (existing): `last_scan_epoch > current_time_epoch` → clamp to `interval` minutes ago
- **Stale** (new): `last_scan_epoch < current_time_epoch − 86400` → clamp to 24h ago

## Files Touched

| File | Change |
|---|---|
| `plugins/slack-monitor/skills/slack-monitor/scripts/detect-timezone.js` | **Create** |
| `plugins/slack-monitor/skills/slack-monitor/SKILL.md` | **Modify** — resolve timezone before agent dispatch |
| `plugins/slack-monitor/skills/slack-monitor/agents/monitor-prompt.md` | **Modify** — remove UTC fallback; add stale-epoch guard |

## What Does NOT Change

- `convert-timestamp.js` — unchanged
- `scripts/state.js` — unchanged
- Config schema — `timezone` field stays optional (auto-detected when missing)
- `local_hour`/`local_dow` computation in the agent — unchanged, just always has a valid timezone now
- All workflow files — unchanged

## Expected Outcome

- Skills with no `timezone` configured silently use the system timezone instead of UTC
- Last-scan timestamps older than 24h are clamped, preventing runaway Slack queries
- No code path that defaults to UTC remains in the agent
