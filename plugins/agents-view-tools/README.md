# agents-view-tools

Quality-of-life for sessions you launch from **agents view** (background sessions).
Those pile up fast and the harness relaxes worktree isolation for them, so this
plugin does two small, deterministic things — no model calls, no tokens:

1. **Names sessions so you can find them again.**
2. **Keeps edits out of a shared main checkout** by steering them into a worktree.

Both only act on agents-view sessions (detected via the `CLAUDE_JOB_DIR` the
harness sets for background jobs). Interactive terminal sessions are left alone.

## 1. Session naming — `name - task`

Start your **first prompt** with a short name, a spaced dash, then the task:

```
deal endpoint - figure out why dealing is slow
```

The session title becomes:

```
<folder> : deal endpoint
```

- `<folder>` is the repo/working-directory name (worktree-aware; a trailing
  `.com`/`.net`/… is trimmed).
- The **spaced** dash (` - `) is required, so hyphenated words like `re-run` or
  `auto-deploy` never trigger it.
- The name must appear within the first ~40 characters (a stray ` - ` deeper in a
  prompt is ignored).
- It fires on the **first prompt that uses the convention** — forget it on line 1
  and you can still name the session on a later prompt; once named, it's locked.
- The chosen title is stored in the session's job dir and **re-asserted on
  resume**, so Claude Code's auto-titler doesn't clobber it.

Sessions that never use the convention fall back to a git-branch-derived name at
startup (handy for issue-per-branch workflows) and are otherwise left to the
default titler.

## 2. Worktree guard

Background sessions are often launched "in place" (e.g. with an `@folder` prefix),
which skips Claude Code's usual worktree isolation. When several sessions share
one checkout, that's how branch refs and `git reset` get yanked out from under
each other. This guard re-asserts isolation:

- On `Edit` / `Write` / `NotebookEdit`, if the target is in the **main checkout**
  of a git repo, the edit is **denied** with a message telling Claude to
  `EnterWorktree` first.
- It's **self-resolving**: after `EnterWorktree`, edits land in the worktree
  (a different `git-dir`) and pass automatically.
- **Read-only work is never affected** — `Read`, `Grep`, `Glob`, and Bash aren't
  matched, so Q&A and search need no worktree.

### Opting out (when you really want in-place edits)

- Per repo: create `<repo>/.claude/allow-inplace`
- Globally for a session: set `AGENTS_VIEW_INPLACE=1`

The opt-out is intentionally **not** keyed on `worktree.bgIsolation`, so the guard
still applies when work-in-place was forced — which is the whole point.

## How it works

| Hook | Script | Job |
|------|--------|-----|
| `UserPromptSubmit` | `name-session-from-prompt.sh` | name the session, store the title |
| `SessionStart` | `name-session.sh` | reuse the stored title on resume; branch-name fallback |
| `PreToolUse` (`Edit\|Write\|NotebookEdit`) | `worktree-guard.sh` | deny main-checkout edits, point at `EnterWorktree` |

Shared helpers (`repo_label`, `prompt_name`, `marker_path`) live in
`name-session-lib.sh`. Everything is plain `bash` + `jq` and works on the bash 3.2
that ships with macOS.

## Install

```text
claude plugin marketplace add FrankLedo/claude-skills
claude plugin install agents-view-tools
```

If you previously wired these hooks by hand in `~/.claude/settings.json`, remove
them after installing so they don't fire twice.
