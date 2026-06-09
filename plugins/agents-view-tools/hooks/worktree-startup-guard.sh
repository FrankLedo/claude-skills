#!/usr/bin/env bash
# SessionStart guard: when an agents-view session STARTS UP already inside a
# worktree (its launch cwd is a leftover .claude/worktrees/ copy), inject a
# heads-up. A fresh session for a new task is usually meant to start at the repo
# root / off main -- being born in a stale worktree silently puts new, unrelated
# work on whatever branch that worktree was left on.
#
# Advisory only (additionalContext) -- it never blocks. Pairs with:
#   - enterworktree-guard.sh (blocks creating a nested worktree), and
#   - worktree-guard.sh      (blocks in-place edits in the main checkout).
#
# Decision:
#   - agents view?           CLAUDE_JOB_DIR set (interactive sessions: skip).
#   - fresh start?           source == "startup" (resume/clear/compact: skip --
#                            those are continuing existing, intentional work).
#   - inside a worktree?     --git-dir != --git-common-dir -> warn.
set -u

# Agents-view sessions only.
[ -n "${CLAUDE_JOB_DIR:-}" ] || exit 0

input=$(cat)
jqr() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }

# Only on a fresh startup; resume/clear/compact are continuing existing work.
source=$(jqr '.source // empty')
[ "$source" = "startup" ] || exit 0

cwd=$(jqr '.cwd // empty')
[ -z "$cwd" ] && cwd=$(pwd)

# Only when the launch cwd is a linked worktree, not the main checkout.
gitdir=$(git -C "$cwd" rev-parse --path-format=absolute --git-dir 2>/dev/null) || exit 0
common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
[ "$gitdir" != "$common" ] || exit 0

wt=$(basename "$cwd")
branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)
msg="Heads-up: this session started inside the existing worktree '$wt'${branch:+ (branch $branch)} -- it was not created for this session. If your task is RELATED to '$branch', continue here; you're already isolated, so do NOT call EnterWorktree. If it's UNRELATED, this leftover worktree is the wrong base: call ExitWorktree to return to the repo root, then EnterWorktree to start fresh off the default base (main) before editing -- otherwise your work inherits '$branch'."
jq -cn --arg c "$msg" \
  '{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
exit 0
