#!/usr/bin/env bash
# Tests for the session-naming hooks (name-session-from-prompt.sh on
# UserPromptSubmit, name-session.sh on SessionStart). Pure bash, no framework:
# each test drives the real hook script via stdin/env and asserts on its stdout
# and side effects (the .session-title marker). Run: bash name-session.test.sh
set -u

HOOKS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../hooks" && pwd)"
PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); printf '  ok   - %s\n' "$1"; }
nope() { FAIL=$((FAIL+1)); printf '  FAIL - %s\n     %s\n' "$1" "$2"; }

# run_prompt_hook <cwd> <prompt> -> echoes the hook's stdout; uses a fresh job dir.
# Sets CLAUDE_JOB_DIR so the hook treats this as an agents-view session.
run_prompt_hook() {
  local cwd="$1" prompt="$2"
  JOBDIR=$(mktemp -d)
  printf '{"cwd":%s,"prompt":%s}' \
    "$(printf '%s' "$cwd" | jq -R .)" "$(printf '%s' "$prompt" | jq -R .)" \
    | CLAUDE_JOB_DIR="$JOBDIR" bash "$HOOKS/name-session-from-prompt.sh"
}

# A real git repo cwd for the positive control. It must live OUTSIDE any temp
# dir (mktemp -d lands under $TMPDIR, which the guard correctly skips), so create
# it beside this test file under the repo tree.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.tmp-test-repo-$$"
mkdir -p "$REPO" && ( cd "$REPO" && git init -q )
cleanup() { rm -rf "$REPO"; }
trap cleanup EXIT

echo "name-session-from-prompt.sh"

# BUG: a sandboxed `claude -p` summarizer (remember plugin) runs with cwd in the
# system temp dir and inherits CLAUDE_JOB_DIR -> the hook must NOT name it, or it
# produces phantom "tmp : You are summarizing a Claude Code" sessions.
out=$(run_prompt_hook "/private/tmp" "You are summarizing a Claude Code session for a daily memory log.")
if [ -z "$out" ]; then ok "skips /private/tmp summarizer session (no title)"
else nope "skips /private/tmp summarizer session (no title)" "emitted: $out"; fi

out=$(run_prompt_hook "/tmp" "Apply maximum non-destructive compression. Rules: keep all facts")
if [ -z "$out" ]; then ok "skips /tmp compression session (no title)"
else nope "skips /tmp compression session (no title)" "emitted: $out"; fi

# The temp-dir guard must fire BEFORE any marker write, so the inherited parent
# marker is never clobbered with the summarizer title.
JOBDIR=$(mktemp -d)
printf '{"cwd":"/private/tmp","prompt":"You are summarizing a Claude Code session"}' \
  | CLAUDE_JOB_DIR="$JOBDIR" bash "$HOOKS/name-session-from-prompt.sh" >/dev/null
if [ ! -e "$JOBDIR/.session-title" ]; then ok "does not write a marker for temp-dir session"
else nope "does not write a marker for temp-dir session" "marker contents: $(cat "$JOBDIR/.session-title")"; fi

# Positive control: a real-repo session must STILL be named from its prompt.
out=$(run_prompt_hook "$REPO" "figure out why the homepage is slow")
if printf '%s' "$out" | grep -q '"sessionTitle"'; then ok "still names a real-repo session"
else nope "still names a real-repo session" "expected a sessionTitle, got: ${out:-<empty>}"; fi

echo "name-session.sh (SessionStart)"

# SessionStart on RESUME derives the title from the transcript's first prompt.
# For a temp-dir summarizer session that would be "tmp · You are summarizing …";
# the guard must suppress it just like the UserPromptSubmit hook.
TX=$(mktemp)
printf '%s\n' '{"type":"user","message":{"content":"You are summarizing a Claude Code session for a daily memory log."}}' > "$TX"
out=$(printf '{"source":"resume","cwd":"/private/tmp","transcript_path":%s}' "$(printf '%s' "$TX" | jq -R .)" \
  | CLAUDE_JOB_DIR="$(mktemp -d)" bash "$HOOKS/name-session.sh")
if [ -z "$out" ]; then ok "SessionStart skips temp-dir resume (no title)"
else nope "SessionStart skips temp-dir resume (no title)" "emitted: $out"; fi

echo
echo "passed: $PASS  failed: $FAIL"
[ "$FAIL" -eq 0 ]
