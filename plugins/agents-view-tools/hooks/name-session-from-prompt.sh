#!/usr/bin/env bash
# UserPromptSubmit hook: name an agents-view session from its first prompt so the
# many stream-of-consciousness sessions in agent view stay findable. If the prompt
# uses the "name - task" convention, the title is "{folder} : {name}"; otherwise
# it falls back to "{folder} : {first few words of the prompt}".
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
#   - Set on the first prompt: the "name - task" convention if present, else the
#     first few words of the prompt. The chosen title is written to the marker
#     file (marker_path). (Slash-commands / system wrappers don't yield a title,
#     so a forgotten prefix on a real first prompt still names from its words.)
#   - Re-asserted on EVERY later prompt. Claude Code's auto-titler fires
#     asynchronously and clobbers the hook-set title mid-session (issue #153), so
#     a one-shot setter loses the race. Re-emitting the stored title on each
#     prompt makes every prompt re-win it. (Trade-off: a manual /rename in an
#     agents-view session is also reverted on the next prompt -- the convention
#     name is treated as authoritative here.)
#   - The marker STORES the title, so the SessionStart hook can reuse it verbatim
#     on resume too -- one source of truth.
#
# Deterministic, zero-token. Emits nothing (title untouched) for slash-commands
# and system/wrapper prompts; otherwise names from the convention or, failing
# that, the prompt's first few words (and re-asserts a stored name on later prompts).
set -u
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
. "$DIR/name-session-lib.sh"

# Agents-view sessions only.
[ -n "${CLAUDE_JOB_DIR:-}" ] || exit 0

input=$(cat)
jqr() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }
cwd=$(jqr '.cwd // empty')
# Fall back to the process cwd if the payload omits it (matches the sibling
# worktree guards), so an empty .cwd can't let a temp-dir child slip the guard.
[ -z "$cwd" ] && cwd=$(pwd)

# Skip sandboxed/headless temp-dir sub-sessions (e.g. the `remember` plugin's
# `claude -p` summarizers run with cwd=$TMPDIR and inherit our CLAUDE_JOB_DIR).
# Done before the marker read/write so we never title a phantom temp-dir session
# nor clobber the parent's shared title marker. See in_tempdir in the lib.
in_tempdir "$cwd" && exit 0

marker=$(marker_path)
[ -n "$marker" ] || exit 0
# Already named? Re-assert the stored title on every prompt so each one re-wins
# the race against Claude Code's async auto-titler (issue #153). Cheap: one read.
# Require a readable, non-empty regular file (not a dir/unreadable) and confirm
# the content is non-empty before emitting, so a bad marker never sets a blank
# title -- instead it falls through to re-derivation from this prompt.
if [ -f "$marker" ] && [ -r "$marker" ]; then
  stored=$(cat "$marker" 2>/dev/null)
  if [ -n "$stored" ]; then
    jq -cn --arg t "$stored" \
      '{hookSpecificOutput:{hookEventName:"UserPromptSubmit", sessionTitle:$t}}'
    exit 0
  fi
fi

prompt=$(jqr '.prompt // empty')
[ -z "$prompt" ] && exit 0

# Never name from a slash-command or system/wrapper prompt -- applied here, before
# the convention check, so even "/cmd - x" or "<tag> - x" yields no title.
case "$prompt" in
  /*|'<'*) exit 0 ;;
esac

name=$(prompt_name "$prompt")
# No "name - task" convention? Fall back to the first few words of the prompt --
# a session is more findable titled by what it opened with than left to the
# auto-titler / branch name.
[ -z "$name" ] && name=$(prompt_brief "$prompt")
[ -z "$name" ] && exit 0

title="$(repo_label "$cwd") : $name"
# Persist the title (state + storage) so resume can reuse it verbatim. Group the
# redirection so a write failure (e.g. marker path unwritable) stays silent.
{ printf '%s' "$title" > "$marker"; } 2>/dev/null || true
jq -cn --arg t "$title" \
  '{hookSpecificOutput:{hookEventName:"UserPromptSubmit", sessionTitle:$t}}'
exit 0
