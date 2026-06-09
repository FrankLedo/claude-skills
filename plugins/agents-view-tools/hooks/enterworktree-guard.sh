#!/usr/bin/env bash
# PreToolUse guard (EnterWorktree): in an agents-view session, refuse to CREATE a
# new worktree when the session is ALREADY inside one -- that nests a worktree off
# an already-isolated (and often stale, feature-branch) copy. Switching into an
# existing worktree (tool_input.path) is always allowed.
#
# Why this exists: a background session can be *born* inside a leftover worktree
# (its launch cwd is under .claude/worktrees/). A blanket "EnterWorktree before
# edits" habit then creates a redundant nested worktree that inherits the stale
# branch. This makes the "already isolated -> skip" check deterministic instead of
# a prose exception the agent has to remember (and can forget).
#
# Decision (deterministic, ~2 git calls -- no tokens):
#   - agents view?              CLAUDE_JOB_DIR set (interactive sessions: skip).
#   - switching, not creating?  tool_input.path present -> allow.
#   - main checkout?            --git-dir == --git-common-dir -> creating is correct -> allow.
#   - already in a worktree?    --git-dir != --git-common-dir -> deny the create.
# Opt out globally with AGENTS_VIEW_INPLACE=1.
set -u

# Agents-view sessions only.
[ -n "${CLAUDE_JOB_DIR:-}" ] || exit 0
# Global opt-out (shared with worktree-guard.sh).
[ -n "${AGENTS_VIEW_INPLACE:-}" ] && exit 0

input=$(cat)
jqr() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }

# Switching into an existing worktree is permitted even when already in one.
path=$(jqr '.tool_input.path // empty')
[ -n "$path" ] && exit 0

cwd=$(jqr '.cwd // empty')
[ -z "$cwd" ] && cwd=$(pwd)

# Not a git repo -> not our concern.
gitdir=$(git -C "$cwd" rev-parse --path-format=absolute --git-dir 2>/dev/null) || exit 0
common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0

# Main checkout -> creating a worktree is the right move -> allow.
[ "$gitdir" = "$common" ] && exit 0

# Already in a linked worktree -> a create would nest. Deny with recovery steps.
wt=$(basename "$cwd")
branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)
reason="agents-view worktree guard: you're already inside worktree '$wt'${branch:+ (branch $branch)}, so this checkout is already isolated -- creating another worktree would nest one inside it. Skip EnterWorktree and edit here. If this task is UNRELATED to '$branch', call ExitWorktree to return to the repo root, then EnterWorktree to start fresh off the default base (main) -- otherwise your work inherits '$branch'. To switch to a different existing worktree, pass its path to EnterWorktree. To allow nesting here, set AGENTS_VIEW_INPLACE=1."
jq -cn --arg r "$reason" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse", permissionDecision:"deny", permissionDecisionReason:$r}}'
exit 0
