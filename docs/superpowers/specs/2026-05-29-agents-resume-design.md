# agents-resume Plugin Design

## Overview

A Claude Code plugin that resumes all background agents after a reboot. Claude writes persistent job state to `~/.claude/jobs/*/state.json`; this plugin reads those files and relaunches any non-completed session with a single skill invocation.

## Problem

`~/.claude/jobs/` persists across reboots but Claude Code has no built-in auto-resume. After a reboot, background agents are dead and must be relaunched manually by session ID. This plugin automates that.

## Plugin Structure

```
plugins/agents-resume/
  .claude-plugin/plugin.json     — name: agents-resume, version: 0.1.0
  README.md
  CHANGELOG.md
  skills/agents-resume/
    SKILL.md                     — thin wrapper: run script, print output
    scripts/
      resume.js                  — core logic (Node.js built-ins only)
```

Skill is invoked as `/agents-resume`.

## Script Behavior (`resume.js`)

**Input:** `~/.claude/jobs/` directory

**Algorithm:**
1. Read all entries in `~/.claude/jobs/`
2. Skip `pins.json` (not a job directory)
3. For each subdirectory, read `state.json`
4. Skip jobs where `state === "completed"`
5. For each resumable job:
   - Spawn `claude --resume <resumeSessionId> [...respawnFlags]` detached, in the job's `cwd`
   - Write `/bg\n` to stdin, then close stdin
   - Unref the child (fire-and-forget)
   - Stagger by 500ms per job to avoid thundering herd
6. Print summary to stdout

**Output:**
- `Resuming N session(s):\n  - <intent> [<state>]` per job
- `No sessions to resume.` if none found

**Error handling:** If `state.json` is missing or unparseable, skip that entry silently.

## Skill Wrapper (`SKILL.md`)

Single instruction: run `node <plugin_dir>/scripts/resume.js` via Bash and print stdout. No state files, no workflow directory, no on-demand loading.

## State Schema (from `~/.claude/jobs/*/state.json`)

Fields used by the script:

| Field | Type | Purpose |
|---|---|---|
| `state` | string | Filter: skip if `"completed"` |
| `resumeSessionId` | string | Passed to `claude --resume` |
| `respawnFlags` | string[] | Additional CLI flags (e.g. `["--agent", "claude"]`) |
| `cwd` | string | Working directory for the spawned process |
| `intent` | string | Human-readable label for summary output |

## Distribution

Registered in `release-please-config.json` and `.claude-plugin/marketplace.json` following the same pattern as `tickler` and `slack-monitor`.
