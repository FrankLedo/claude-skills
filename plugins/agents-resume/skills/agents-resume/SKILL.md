---
name: agents-resume
description: >
  Use when the user wants to resume background agents after a reboot or
  restart. Scans ~/.claude/jobs/ and relaunches sessions in background mode.
  Optionally filter by state (e.g. blocked, done, running).
user-invocable: true
argument-hint: "[state ...]"
---

# Agents Resume

Resumes background agents from `~/.claude/jobs/`.

## Skill Directory

The skill's base directory is available as `$SKILL_SCRIPTS_DIR`
(provided in the `Base directory for this skill:` header). Scripts
are at `$SKILL_SCRIPTS_DIR/scripts/`.

## Usage

Pass any arguments the user provided as positional args to the script:

- No args → resume all jobs
- One or more state names → resume only jobs matching those states (e.g. `blocked`, `done`, `running`)

```bash
node "$SKILL_SCRIPTS_DIR/scripts/resume.js" [state ...]
```

Print the output to the user as-is.
