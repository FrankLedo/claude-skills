# agents-resume

Resumes all background agents after a reboot.

Claude writes persistent job state to `~/.claude/jobs/` as it runs background agents. After a reboot those sessions are dead, but their state survives. This skill scans that directory and relaunches every non-completed session in background mode with a single invocation.

## Installation

```text
claude plugin install agents-resume
```

## Usage

```text
/agents-resume
```

Resumes all jobs where `state` is not `"completed"`. Once running, terminate any you no longer need.

## How it works

1. Reads `~/.claude/jobs/*/state.json`
2. Skips completed jobs and unreadable entries
3. Runs `claude --resume <sessionId>` detached for each, sending `/bg` to put it in background mode
4. Prints a summary of what was resumed
