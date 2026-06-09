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
#   - Set on the first prompt that uses the convention (so a forgotten prefix on
#     prompt 1 doesn't permanently lose the chance); the chosen title is written
#     to the marker file (marker_path).
#   - Re-asserted on EVERY later prompt. Claude Code's auto-titler fires
#     asynchronously and clobbers the hook-set title mid-session (issue #153), so
#     a one-shot setter loses the race. Re-emitting the stored title on each
#     prompt makes every prompt re-win it. (Trade-off: a manual /rename in an
#     agents-view session is also reverted on the next prompt -- the convention
#     name is treated as authoritative here.)
#   - The marker STORES the title, so the SessionStart hook can reuse it verbatim
#     on resume too -- one source of truth.
#
# Deterministic, zero-token. Emits nothing (title untouched) unless the session
# is already named, or a prompt uses the "name - task" convention.
set -u
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
. "$DIR/name-session-lib.sh"

# Agents-view sessions only.
[ -n "${CLAUDE_JOB_DIR:-}" ] || exit 0

marker=$(marker_path)
[ -n "$marker" ] || exit 0
# Already named? Re-assert the stored title on every prompt so each one re-wins
# the race against Claude Code's async auto-titler (issue #153). Cheap: one read.
if [ -s "$marker" ]; then
  jq -cn --arg t "$(cat "$marker")" \
    '{hookSpecificOutput:{hookEventName:"UserPromptSubmit", sessionTitle:$t}}'
  exit 0
fi

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
