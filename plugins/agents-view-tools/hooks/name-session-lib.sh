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

# in_tempdir <cwd> -> success (0) if cwd is inside a system temp directory.
# Sandboxed, headless `claude -p` sub-sessions run with cwd=$TMPDIR -- e.g. the
# `remember` plugin's memory summarizer/compressor (cwd=tempfile.gettempdir()).
# Those children inherit this session's CLAUDE_JOB_DIR, so the naming hooks would
# otherwise title them "tmp : You are summarizing a Claude Code", create phantom
# resumable sessions in the picker, and (via the shared marker) clobber the real
# parent session's title. They are never user-resumable agents-view sessions, so
# the hooks bail when cwd is a temp dir. Covers $TMPDIR plus the usual macOS
# (/private/tmp, /var/folders) and Linux (/tmp) roots, with/without /private.
in_tempdir() {
  local cwd="$1" t
  [ -n "$cwd" ] || return 1
  case "$cwd" in
    /tmp|/tmp/*|/private/tmp|/private/tmp/*|/var/folders/*|/private/var/folders/*) return 0 ;;
  esac
  if [ -n "${TMPDIR:-}" ]; then
    t="${TMPDIR%/}"
    case "$cwd" in "$t"|"$t"/*) return 0 ;; esac
  fi
  return 1
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

# prompt_brief <prompt> -> the first few words of the prompt, or nothing.
# Fallback when the "name - task" convention isn't used: a session is still more
# findable titled by what it opened with than by a whimsical branch name. Takes
# the first $NAME_WORDS words on one line. Skips slash-commands and wrapper/
# system tags (a leading "/" or "<"), which aren't meaningful titles.
NAME_WORDS=${NAME_WORDS:-6}
prompt_brief() {
  local prompt="$1" out
  out=$(printf '%s' "$prompt" | tr '\n\t' '  ' \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/[[:space:]]+/ /g')
  [ -z "$out" ] && return 0
  case "$out" in
    /*|'<'*) return 0 ;;   # slash-command or system/wrapper tag -> not a title
  esac
  printf '%s' "$out" \
    | awk -v n="$NAME_WORDS" '{m=NF<n?NF:n; for(i=1;i<=m;i++) printf "%s%s",$i,(i<m?" ":"")}'
}
