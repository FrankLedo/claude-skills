#!/usr/bin/env node
const { readdirSync, readFileSync, statSync } = require('fs');
const { join } = require('path');
const { spawn } = require('child_process');

const jobsDir = join(process.env.HOME, '.claude', 'jobs');

let entries;
try {
  entries = readdirSync(jobsDir);
} catch {
  console.log('No jobs directory found.');
  process.exit(0);
}

const jobs = entries
  .filter(name => name !== 'pins.json')
  .map(name => {
    const stateFile = join(jobsDir, name, 'state.json');
    try {
      statSync(stateFile);
    } catch {
      return null;
    }
    try {
      const d = JSON.parse(readFileSync(stateFile, 'utf8'));
      return {
        state: d.state || '?',
        cwd: d.cwd || process.env.HOME,
        sid: d.resumeSessionId || d.sessionId || '',
        intent: (d.intent || name).slice(0, 60),
      };
    } catch {
      return null;
    }
  })
  .filter(j => j !== null && j.state !== 'completed' && j.sid);

if (jobs.length === 0) {
  console.log('No sessions to resume.');
  process.exit(0);
}

console.log(`Resuming ${jobs.length} session(s):`);
for (const job of jobs) {
  console.log(`  - [${job.state}] ${job.intent}`);
}

for (const [i, job] of jobs.entries()) {
  setTimeout(() => {
    const child = spawn('claude', ['--resume', job.sid], {
      cwd: job.cwd,
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore'],
    });
    child.stdin.write('/bg\n');
    child.stdin.end();
    child.unref();
  }, i * 500);
}
