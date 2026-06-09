#!/usr/bin/env bash
# UserPromptSubmit hook: on the FIRST prompt of an agents-view session, if that
# prompt starts with "name - task", set the session title to "{folder} : {name}"
# so the many stream-of-consciousness sessions in agent view stay findable.
#
# Why UserPromptSubmit (not SessionStart): verified against the CC 2.1.168
# binary, the UserPromptSubmit hook output schema includes `sessionTitle`
# (alongside additionalContext/suppressOriginalPrompt). Unlike SessionStart,
# this event receives the prompt text AND the cwd, so naming from the first
# prompt needs no startup-time guesswork about the repo.
#
# Scope:
#   - Agents view only: those sessions get a CLAUDE_JOB_DIR; interactive
#     terminal sessions don't, and are left alone (you can /rename those by hand).
#   - Set once: the chosen title is written to the marker file (marker_path).
#     Once it exists we never re-title, so the name is stable for the rest of the
#     session. It's set by the first prompt that uses the convention (so a
#     forgotten prefix on prompt 1 doesn't permanently lose the chance).
#   - The marker STORES the title, so the SessionStart hook can reuse it verbatim
#     on resume instead of re-deriving it -- one source of truth.
#
# Deterministic, zero-token. Emits nothing (title untouched) unless a prompt
# uses the "name - task" convention and the session isn't named yet.
set -u
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
. "$DIR/name-session-lib.sh"

# Agents-view sessions only.
[ -n "${CLAUDE_JOB_DIR:-}" ] || exit 0

# Already named this session? Leave it.
marker=$(marker_path)
[ -n "$marker" ] || exit 0
[ -e "$marker" ] && exit 0

input=$(cat)
jqr() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }

prompt=$(jqr '.prompt // empty')
cwd=$(jqr '.cwd // empty')
[ -z "$prompt" ] && exit 0

name=$(prompt_name "$prompt")
[ -z "$name" ] && exit 0

title="$(repo_label "$cwd") : $name"
# Persist the title (state + storage) so resume can reuse it verbatim.
printf '%s' "$title" > "$marker" 2>/dev/null || true
jq -cn --arg t "$title" \
  '{hookSpecificOutput:{hookEventName:"UserPromptSubmit", sessionTitle:$t}}'
exit 0
