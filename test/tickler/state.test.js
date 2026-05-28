'use strict';
// Run: node --test test/tickler/state.test.js  (Node 18+)

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const STATE_JS = path.resolve(__dirname, '../../plugins/tickler/skills/tickler/scripts/state.js');

function run(...args) {
  const result = spawnSync(process.execPath, [STATE_JS, ...args], { encoding: 'utf8' });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status ?? 1 };
}

const PR_URL    = 'https://github.com/foo/bar/pull/1';
const ISSUE_URL = 'https://github.com/foo/bar/issues/2';
const GONE_URL  = 'https://github.com/foo/bar/pull/999'; // never added

const PR_ITEM    = JSON.stringify({ url: PR_URL,    type: 'github-pr',    condition: 'merged' });
const ISSUE_ITEM = JSON.stringify({ url: ISSUE_URL, type: 'github-issue', condition: 'closed' });

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tickler-state-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- add-item ----------------------------------------------------------------

test('add-item: adds a new item and returns it as JSON', () => {
  const r = run('add-item', '--data', tmpDir, PR_ITEM);
  assert.equal(r.exitCode, 0, r.stderr);
  const added = JSON.parse(r.stdout);
  assert.equal(added.url, PR_URL);
  assert.ok(added.id, 'should assign a UUID');
  assert.ok(added.added, 'should set added timestamp');
});

test('add-item: rejects duplicate URL', () => {
  const r = run('add-item', '--data', tmpDir, PR_ITEM);
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /Already watching/);
});

test('add-item: second distinct item', () => {
  const r = run('add-item', '--data', tmpDir, ISSUE_ITEM);
  assert.equal(r.exitCode, 0, r.stderr);
});

// --- list --------------------------------------------------------------------

test('list: returns both added items', () => {
  const r = run('list', '--data', tmpDir);
  assert.equal(r.exitCode, 0, r.stderr);
  const items = JSON.parse(r.stdout);
  assert.equal(items.length, 2);
  const urls = items.map(i => i.url);
  assert.ok(urls.includes(PR_URL));
  assert.ok(urls.includes(ISSUE_URL));
});

// --- set-state / get-state ---------------------------------------------------

test('set-state: updates state for an existing item', () => {
  const state = JSON.stringify({ merged: true, status: 'closed' });
  const r = run('set-state', '--data', tmpDir, PR_URL, state);
  assert.equal(r.exitCode, 0, r.stderr);
});

test('get-state: returns the state we just set', () => {
  const r = run('get-state', '--data', tmpDir, PR_URL);
  assert.equal(r.exitCode, 0, r.stderr);
  const state = JSON.parse(r.stdout);
  assert.equal(state.merged, true);
  assert.equal(state.status, 'closed');
});

// --- append-fired-action -----------------------------------------------------

test('append-fired-action: records a fired action key', () => {
  const r = run('append-fired-action', '--data', tmpDir, PR_URL, 'merged:remove_from_watch');
  assert.equal(r.exitCode, 0, r.stderr);
});

test('append-fired-action: same key twice does not duplicate (idempotent)', () => {
  run('append-fired-action', '--data', tmpDir, PR_URL, 'merged:remove_from_watch');
  const items = JSON.parse(run('list', '--data', tmpDir).stdout);
  const item  = items.find(i => i.url === PR_URL);
  const count = item.state.fired_actions.filter(k => k === 'merged:remove_from_watch').length;
  assert.equal(count, 1, 'key should appear exactly once');
});

test('append-fired-action: exits 0 when item not found (fixes #117)', () => {
  const r = run('append-fired-action', '--data', tmpDir, GONE_URL, 'merged:remove_from_watch');
  assert.equal(r.exitCode, 0, 'must exit 0 — item was removed by the action that just fired');
  assert.match(r.stdout, /already removed/i);
});

// --- remove-item -------------------------------------------------------------

test('remove-item: removes an existing item', () => {
  const r = run('remove-item', '--data', tmpDir, ISSUE_URL);
  assert.equal(r.exitCode, 0, r.stderr);
  assert.match(r.stdout, /Removed/);
  const items = JSON.parse(run('list', '--data', tmpDir).stdout);
  assert.ok(!items.some(i => i.url === ISSUE_URL), 'item should be gone');
});

test('remove-item: exits 0 when item not found (fixes #117)', () => {
  const r = run('remove-item', '--data', tmpDir, GONE_URL);
  assert.equal(r.exitCode, 0, 'must be idempotent — double-remove must not error');
  assert.match(r.stdout, /Not watching/);
});
