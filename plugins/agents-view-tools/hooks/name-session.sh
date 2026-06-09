#!/usr/bin/env bash
# SessionStart hook: name the session so it's findable in agent view, and
# re-assert that name on resume against Claude Code's auto-titler (which is known
# to clobber custom names).
#
# SessionStart fires before any prompt exists, so at fresh "startup" there is no
# prompt to name from. Order of preference:
#   - Stored title: if a previous prompt named this session via the convention,
#     the UserPromptSubmit hook (name-session-from-prompt.sh) wrote the chosen
#     title to the marker file. Reuse it verbatim -- single source of truth, no
#     re-derivation. This is what makes the name survive resume.
#   - Transcript (resume, no stored title): name from the first user prompt
#     (Issue #N / PR #N + a few words).
#   - Git branch/worktree (startup): the issue-per-branch workflow already
#     encodes a number + slug.
# Outputs nothing (exit 0) when it can't derive a useful name, leaving the title
# untouched. Live naming of a fresh session from its first prompt is handled by
# the companion UserPromptSubmit hook, name-session-from-prompt.sh.

set -u
input=$(cat)

jqr() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }

# Shared with name-session-from-prompt.sh: repo_label + marker_path.
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
. "$DIR/name-session-lib.sh"

# Reuse a title set earlier via the "name - task" convention, verbatim.
mp=$(marker_path)
if [ -n "$mp" ] && [ -s "$mp" ]; then
  jq -cn --arg t "$(cat "$mp")" \
    '{hookSpecificOutput:{hookEventName:"SessionStart", sessionTitle:$t}}'
  exit 0
fi

source=$(jqr '.source // empty')
transcript=$(jqr '.transcript_path // empty')
cwd=$(jqr '.cwd // empty')
[ -z "$cwd" ] && cwd=$(pwd)

# Repo name: resolve to the MAIN working tree even inside a worktree (a worktree's
# --show-toplevel is the worktree dir, e.g. "issue-135"; --git-common-dir points
# at the main repo's .git). Strip a trailing TLD-ish suffix for brevity.
common=$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
if [ -n "$common" ]; then repo=$(basename "$(dirname "$common")"); else repo=$(basename "$cwd"); fi
repo=$(printf '%s' "$repo" | sed -E 's/\.(com|net|org|io|dev|app|co)$//')
[ -z "$repo" ] && exit 0

emit() {
  # collapse repeated/trailing separators, then output the SessionStart title.
  local t
  t=$(printf '%s' "$1" | sed -E 's/[[:space:]]*·[[:space:]]*·[[:space:]]*/ · /g; s/[[:space:]·]+$//; s/^[[:space:]·]+//')
  [ -z "$t" ] && exit 0
  jq -cn --arg t "$t" \
    '{hookSpecificOutput:{hookEventName:"SessionStart", sessionTitle:$t}}'
  exit 0
}

# first ~6 words of a string
brief() { printf '%s' "$1" | tr '\n\t' '  ' | tr -s ' ' \
  | awk '{n=NF<6?NF:6; for(i=1;i<=n;i++) printf "%s%s",$i,(i<n?" ":"")}'; }

# --- Prefer the first prompt from the transcript (resume case) -------------
prompt=""
if [ -n "$transcript" ] && [ -s "$transcript" ]; then
  prompt=$(jq -rs '
    [ .[]
      | select(.type=="user")
      | select((.isMeta // false) == false)
      | .message.content
      | if type=="array" then (map(select(.type=="text")|.text)|join(" ")) else . end
    ]
    | map(select(type=="string"))
    | map(select((gsub("^[[:space:]]+";"")|length) > 0))
    | map(select(startswith("<") | not))      # skip system-reminder/command wrappers
    | .[0] // ""' "$transcript" 2>/dev/null)
fi

if [ -n "$prompt" ]; then
  label=""
  shopt -s nocasematch
  if [[ "$prompt" =~ (pull[[:space:]]+request|pr)[[:space:]]*#?[[:space:]]*([0-9]+) ]]; then
    label="PR #${BASH_REMATCH[2]}"
  elif [[ "$prompt" =~ issue[[:space:]]*#?[[:space:]]*([0-9]+) ]]; then
    label="#${BASH_REMATCH[1]}"
  elif [[ "$prompt" =~ \#([0-9]+) ]]; then
    label="#${BASH_REMATCH[1]}"
  fi
  shopt -u nocasematch
  # description = prompt minus a leading "issue/pr #N" prefix, first few words
  desc=$(printf '%s' "$prompt" | sed -E 's/^[[:space:]]*((issue|pr|pull[[:space:]]+request)[[:space:]]*#?[[:space:]]*[0-9]+[[:space:]:._-]*)//I')
  desc=$(brief "$desc")
  if [ -n "$label" ]; then emit "$repo · $label · $desc"; else emit "$repo · $desc"; fi
fi

# --- Fallback: derive from the git branch / worktree (startup case) ---------
branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -n "$branch" ] && [ "$branch" != "HEAD" ] && [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
  if [[ "$branch" =~ issue[-/_]?([0-9]+) ]] || [[ "$branch" =~ [-/_]([0-9]+)([-/_]|$) ]]; then
    num="${BASH_REMATCH[1]}"
    # slug = branch tail after the number, dashes -> spaces
    slug=$(printf '%s' "$branch" | sed -E "s#.*[-/_]${num}[-/_]?##; s#^(fix|feat|chore|docs|refactor|test)/##" | tr '/_-' '   ' | tr -s ' ')
    emit "$repo · #${num} · $(brief "$slug")"
  fi
  slug=$(printf '%s' "$branch" | sed -E 's#^(fix|feat|chore|docs|refactor|test)/##' | tr '/_-' '   ' | tr -s ' ')
  emit "$repo · $(brief "$slug")"
fi

# Nothing useful to add (e.g. fresh startup on main) -> leave title alone.
exit 0
