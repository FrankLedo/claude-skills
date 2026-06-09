#!/usr/bin/env bash
# PreToolUse guard (Edit|Write|NotebookEdit): in an agents-view session, refuse
# to mutate the MAIN checkout of a git repo and tell Claude to EnterWorktree
# first, so concurrent sessions don't trample a shared working copy.
#
# How it decides (deterministic, ~3 git calls -- no tokens):
#   - agents view?           CLAUDE_JOB_DIR is set (interactive sessions: skip).
#   - target in a git repo?  git rev-parse succeeds (else skip -- ~/.claude, /tmp).
#   - main checkout vs tree? --git-dir == --git-common-dir means the MAIN
#                            checkout; a linked worktree has a different git-dir.
# Read-only tools aren't matched by this hook, so Q&A/search are never blocked.
# Self-resolving: after EnterWorktree the cwd is a worktree, so the retried edit
# has a different git-dir and passes. Opt out per-repo with a .claude/allow-inplace
# file, or globally with AGENTS_VIEW_INPLACE=1.
set -u

# Agents-view sessions only.
[ -n "${CLAUDE_JOB_DIR:-}" ] || exit 0
# Global opt-out.
[ -n "${AGENTS_VIEW_INPLACE:-}" ] && exit 0

input=$(cat)
path=$(printf '%s' "$input" \
  | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)
[ -n "$path" ] || exit 0

# Probe the nearest existing ancestor (a new file's own dir may not exist yet).
dir=$(dirname "$path")
while [ ! -d "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "." ]; do dir=$(dirname "$dir"); done
[ -d "$dir" ] || exit 0

# Not a git repo -> not our concern.
gitdir=$(git -C "$dir" rev-parse --path-format=absolute --git-dir 2>/dev/null) || exit 0
[ -n "$gitdir" ] || exit 0
common=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0

# Linked worktree -> already isolated -> allow.
[ "$gitdir" != "$common" ] && exit 0

# Per-repo opt-out.
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] && [ -e "$root/.claude/allow-inplace" ] && exit 0

reason="agents-view worktree guard: this edit targets the MAIN checkout of '$(basename "${root:-$dir}")'. Concurrent sessions can share this working copy, so isolate first: call EnterWorktree, then retry the edit (it will land in the worktree and pass). Read-only work needs no worktree. To allow in-place edits here, create ${root:-$dir}/.claude/allow-inplace or set AGENTS_VIEW_INPLACE=1."
jq -cn --arg r "$reason" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse", permissionDecision:"deny", permissionDecisionReason:$r}}'
exit 0
