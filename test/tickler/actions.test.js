'use strict';
// Run: node --test test/tickler/actions.test.js  (Node 18+)

const { test }      = require('node:test');
const assert        = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs            = require('fs');
const os            = require('os');
const path          = require('path');

const ACTIONS_JS = path.resolve(__dirname, '../../plugins/tickler/skills/tickler/scripts/actions.js');
const NOTIFY_JS  = path.resolve(__dirname, '../../plugins/tickler/skills/tickler/scripts/notify.js');
const STATE_JS   = path.resolve(__dirname, '../../plugins/tickler/skills/tickler/scripts/state.js');

function run(...args) {
  const result = spawnSync(process.execPath, [ACTIONS_JS, ...args], { encoding: 'utf8' });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status ?? 1 };
}

// --- claude-resume-bg arg validation ----------------------------------------

test('claude-resume-bg: fails without --session', () => {
  const r = run('--do', 'claude-resume-bg', '--url', 'https://github.com/foo/bar/pull/1',
                '--cwd', '/tmp');
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /requires --session/);
});

test('claude-resume-bg: fails without --cwd', () => {
  const r = run('--do', 'claude-resume-bg', '--url', 'https://github.com/foo/bar/pull/1',
                '--session', 'abc-123');
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /requires --cwd/);
});

test('claude-resume-bg: fails without --url', () => {
  const r = run('--do', 'claude-resume-bg', '--session', 'abc-123', '--cwd', '/tmp');
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /Missing --url/);
});

// --- claude-resume in notify.js ---------------------------------------------

test('claude-resume: notify.js renders resume command block', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tickler-notify-test-'));
  try {
    const changed = [{
      url:       'https://github.com/foo/bar/pull/1',
      condition: 'approved',
      title:     'My PR',
      pending_actions: [{
        on:   'approved',
        do:   'claude-resume',
        args: { session: 'test-session-id', cwd: '/my/project' },
      }],
    }];
    fs.writeFileSync(path.join(tmpDir, 'changed_pending.json'), JSON.stringify(changed));

    const result = spawnSync(process.execPath, [
      NOTIFY_JS,
      '--data', tmpDir,
      '--skill-dir', path.dirname(ACTIONS_JS),
    ], { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /claude --resume test-session-id/);
    assert.match(result.stdout, /\/my\/project/);
    assert.match(result.stdout, /\/tickler remove/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('claude-resume: notify.js does NOT record as fired (repeats next cycle)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tickler-notify-test-'));
  try {
    // Add an item to tickler.json so append-fired-action would have something to write to
    spawnSync(process.execPath, [
      STATE_JS, 'add-item', '--data', tmpDir,
      JSON.stringify({ url: 'https://github.com/foo/bar/pull/1', type: 'github-pr', condition: 'approved' }),
    ], { encoding: 'utf8' });

    const changed = [{
      url:       'https://github.com/foo/bar/pull/1',
      condition: 'approved',
      title:     'My PR',
      pending_actions: [{
        on:   'approved',
        do:   'claude-resume',
        args: { session: 'test-session-id', cwd: '/my/project' },
      }],
    }];
    fs.writeFileSync(path.join(tmpDir, 'changed_pending.json'), JSON.stringify(changed));

    spawnSync(process.execPath, [
      NOTIFY_JS,
      '--data', tmpDir,
      '--skill-dir', path.dirname(ACTIONS_JS),
    ], { encoding: 'utf8' });

    // fired_actions should be empty — claude-resume must not be recorded
    const items = JSON.parse(spawnSync(process.execPath, [STATE_JS, 'list', '--data', tmpDir], { encoding: 'utf8' }).stdout);
    const item  = items.find(i => i.url === 'https://github.com/foo/bar/pull/1');
    const fired = item?.state?.fired_actions || [];
    assert.equal(fired.length, 0, 'claude-resume must not be recorded in fired_actions');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
