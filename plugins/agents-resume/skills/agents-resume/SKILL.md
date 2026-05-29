---
name: agents-resume
description: >
  Use when the user wants to resume background agents after a reboot or
  restart. Scans ~/.claude/jobs/ for non-completed sessions and relaunches
  them in background mode.
user-invocable: true
---

# Agents Resume

Resumes all non-completed background agents from `~/.claude/jobs/`.

## Skill Directory

The skill's base directory is available as `$SKILL_SCRIPTS_DIR`
(provided in the `Base directory for this skill:` header). Scripts
are at `$SKILL_SCRIPTS_DIR/scripts/`.

## Usage

Run the resume script and report its output:

```bash
node "$SKILL_SCRIPTS_DIR/scripts/resume.js"
```

Print the output to the user as-is.
