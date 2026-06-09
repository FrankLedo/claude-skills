#!/usr/bin/env bash
# Shared helpers for the session-naming hooks (name-session.sh on SessionStart,
# name-session-from-prompt.sh on UserPromptSubmit). Deterministic, no LLM/token
# cost. Sourced, not executed.

# repo_label <cwd> -> short project label for the session title.
# Worktree-aware: resolves to the MAIN repo dir even from inside a worktree
# (a worktree's --show-toplevel is the worktree dir; --git-common-dir points at
# the main repo's .git, whose parent is the main checkout). Edit ABBREV to add
# custom short names; unmapped repos fall back to their dir name with a common
# TLD suffix (.com/.net/...) stripped.
repo_label() {
  local cwd="$1" common repo
  [ -z "$cwd" ] && cwd=$(pwd)
  common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
  if [ -n "$common" ]; then repo=$(basename "$(dirname "$common")"); else repo=$(basename "$cwd"); fi
  # Generic: just the project folder name, with a common TLD suffix
  # (.com/.net/...) trimmed for brevity. No per-repo special-casing.
  repo=$(printf '%s' "$repo" | sed -E 's/\.(com|net|org|io|dev|app|co)$//')
  printf '%s' "$repo"
}

# marker_path -> path to this session's title marker file, or nothing.
# The marker doubles as state (its existence = "already named") and storage (its
# contents = the chosen title), so resume can reuse the name verbatim instead of
# re-deriving it. It lives in the session's job dir. Prefer CLAUDE_JOB_DIR; if
# absent (e.g. an interactive resume of a session that began in agents view),
# derive the same dir from the session id -- job dirs are ~/.claude/jobs/<first
# segment of CLAUDE_CODE_SESSION_ID>. Returns nothing when neither is available.
marker_path() {
  local dir="${CLAUDE_JOB_DIR:-}"
  if [ -z "$dir" ] && [ -n "${CLAUDE_CODE_SESSION_ID:-}" ]; then
    dir="$HOME/.claude/jobs/${CLAUDE_CODE_SESSION_ID%%-*}"
  fi
  [ -n "$dir" ] || return 0
  printf '%s/.session-title' "$dir"
}

# prompt_name <prompt> -> the chosen session name, or nothing.
# Convention: a prompt of the form "name - task" (a literal space-hyphen-space
# " - " within the first $NAME_MAXLEN chars) means "name" is the session name.
# Requiring the spaces means hyphenated words (re-run, auto-deploy, well-known)
# never trigger it. Echoes nothing when the convention isn't used.
NAME_MAXLEN=${NAME_MAXLEN:-40}
prompt_name() {
  local prompt="$1" name
  case "$prompt" in
    *" - "*) ;;          # has a spaced dash somewhere
    *) return 0 ;;       # no convention -> nothing
  esac
  name=${prompt%%" - "*} # text before the FIRST " - " (%% = longest suffix match)
  # one line, trim ends, collapse internal whitespace runs
  name=$(printf '%s' "$name" | tr '\n\t' '  ' \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/[[:space:]]+/ /g')
  [ -z "$name" ] && return 0
  # delimiter too far in -> a stray " - " mid-prompt, not an intentional name
  [ "${#name}" -gt "$NAME_MAXLEN" ] && return 0
  printf '%s' "$name"
}
