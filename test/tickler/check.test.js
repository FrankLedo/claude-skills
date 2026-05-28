'use strict';
// Run: node --test test/tickler/check.test.js  (Node 18+)

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { conditionMet } = require('../../plugins/tickler/skills/tickler/scripts/conditions.js');

// --- state factories ---------------------------------------------------------

const PR = (o = {}) => ({
  status: 'open', merged: false, approvals: 0,
  changes_requested: false, ci_status: 'none',
  comment_count: 0, last_activity: '2024-01-01T00:00:00Z',
  ...o,
});

const ISSUE = (o = {}) => ({
  status: 'open', labels: [], comment_count: 0,
  last_activity: '2024-01-01T00:00:00Z',
  ...o,
});

const JIRA = (o = {}) => ({
  status: 'In Progress', summary: 'test', comment_count: 0,
  subtasks: [], last_activity: '2024-01-01T00:00:00Z',
  ...o,
});

const prItem    = cond => ({ type: 'github-pr',    condition: cond, url: 'https://github.com/foo/bar/pull/1',    state: PR() });
const issueItem = cond => ({ type: 'github-issue', condition: cond, url: 'https://github.com/foo/bar/issues/1', state: ISSUE() });
const jiraItem  = cond => ({ type: 'jira',         condition: cond, url: 'https://jira.example.com/browse/FOO-1', state: JIRA() });

// --- github-pr ---------------------------------------------------------------

test('pr merged: true when merged=true', () => {
  assert.ok(conditionMet(prItem('merged'), PR({ merged: true }), PR()));
});

test('pr merged: false when not merged', () => {
  assert.ok(!conditionMet(prItem('merged'), PR(), PR()));
});

test('pr approved: true when approvals >= 1', () => {
  assert.ok(conditionMet(prItem('approved'), PR({ approvals: 1 }), PR()));
});

test('pr approved: false when 0 approvals', () => {
  assert.ok(!conditionMet(prItem('approved'), PR(), PR()));
});

test('pr closed: true when status=closed and not merged', () => {
  assert.ok(conditionMet(prItem('closed'), PR({ status: 'closed', merged: false }), PR()));
});

test('pr closed: false when merged (merged != closed)', () => {
  assert.ok(!conditionMet(prItem('closed'), PR({ status: 'closed', merged: true }), PR()));
});

test('pr changes-requested: true when changes_requested=true', () => {
  assert.ok(conditionMet(prItem('changes-requested'), PR({ changes_requested: true }), PR()));
});

test('pr ci-passed: true when ci_status=success', () => {
  assert.ok(conditionMet(prItem('ci-passed'), PR({ ci_status: 'success' }), PR()));
});

test('pr ci-passed: false when ci_status=pending', () => {
  assert.ok(!conditionMet(prItem('ci-passed'), PR({ ci_status: 'pending' }), PR()));
});

test('pr ci-failed: true when ci_status=failure', () => {
  assert.ok(conditionMet(prItem('ci-failed'), PR({ ci_status: 'failure' }), PR()));
});

test('pr new-comment: true when comment_count increases', () => {
  assert.ok(conditionMet(prItem('new-comment'), PR({ comment_count: 2 }), PR({ comment_count: 1 })));
});

test('pr new-comment: false when count unchanged', () => {
  assert.ok(!conditionMet(prItem('new-comment'), PR({ comment_count: 1 }), PR({ comment_count: 1 })));
});

test('pr any: true when any field changes', () => {
  assert.ok(conditionMet(prItem('any'), PR({ comment_count: 1 }), PR({ comment_count: 0 })));
});

test('pr any: false when state is identical', () => {
  assert.ok(!conditionMet(prItem('any'), PR(), PR()));
});

test('pr any: false on first check — no prevState means baseline only', () => {
  const item = { ...prItem('any'), state: null };
  assert.ok(!conditionMet(item, PR(), null));
});

// --- github-issue ------------------------------------------------------------

test('issue closed: true when status=closed', () => {
  assert.ok(conditionMet(issueItem('closed'), ISSUE({ status: 'closed' }), ISSUE()));
});

test('issue closed: false when still open', () => {
  assert.ok(!conditionMet(issueItem('closed'), ISSUE(), ISSUE()));
});

test('issue new-comment: true when comment_count increases', () => {
  assert.ok(conditionMet(issueItem('new-comment'), ISSUE({ comment_count: 2 }), ISSUE({ comment_count: 1 })));
});

test('issue new-comment: false when unchanged', () => {
  assert.ok(!conditionMet(issueItem('new-comment'), ISSUE({ comment_count: 1 }), ISSUE({ comment_count: 1 })));
});

test('issue labeled: true when label newly added', () => {
  assert.ok(conditionMet(issueItem('labeled:bug'), ISSUE({ labels: ['bug'] }), ISSUE({ labels: [] })));
});

test('issue labeled: false when label was already present', () => {
  assert.ok(!conditionMet(issueItem('labeled:bug'), ISSUE({ labels: ['bug'] }), ISSUE({ labels: ['bug'] })));
});

test('issue labeled: false when label not present at all', () => {
  assert.ok(!conditionMet(issueItem('labeled:bug'), ISSUE({ labels: [] }), ISSUE({ labels: [] })));
});

test('issue any: true when state changes', () => {
  assert.ok(conditionMet(issueItem('any'), ISSUE({ comment_count: 1 }), ISSUE({ comment_count: 0 })));
});

test('issue any: false when state unchanged', () => {
  assert.ok(!conditionMet(issueItem('any'), ISSUE(), ISSUE()));
});

// --- jira --------------------------------------------------------------------

test('jira status: true when status matches (case-insensitive)', () => {
  assert.ok(conditionMet(jiraItem('status:done'), JIRA({ status: 'Done' }), JIRA()));
});

test('jira status: false when status does not match', () => {
  assert.ok(!conditionMet(jiraItem('status:done'), JIRA({ status: 'In Progress' }), JIRA()));
});

test('jira new-subtask: true when a new subtask key appears', () => {
  assert.ok(conditionMet(
    jiraItem('new-subtask'),
    JIRA({ subtasks: [{ key: 'FOO-2', summary: 'sub', status: 'Open' }] }),
    JIRA({ subtasks: [] }),
  ));
});

test('jira new-subtask: false when no new subtask since last check', () => {
  assert.ok(!conditionMet(
    jiraItem('new-subtask'),
    JIRA({ subtasks: [{ key: 'FOO-2', summary: 'sub', status: 'Open' }] }),
    JIRA({ subtasks: [{ key: 'FOO-2', summary: 'sub', status: 'Open' }] }),
  ));
});

test('jira new-subtask: false on first check (no prevState)', () => {
  const item = { ...jiraItem('new-subtask'), state: null };
  assert.ok(!conditionMet(item, JIRA({ subtasks: [{ key: 'FOO-2', summary: 'sub', status: 'Open' }] }), null));
});

test('jira any: true when status changes', () => {
  assert.ok(conditionMet(jiraItem('any'), JIRA({ status: 'Done' }), JIRA({ status: 'In Progress' })));
});

// --- action on: filtering (regression for #84) -------------------------------
// check.js evaluates each action's `on` independently by creating a synthetic
// item with condition set to the action's trigger. These tests verify that
// specific-trigger actions fire correctly under a condition:any item.

test('action on:merged fires when PR merged, even with item condition:any', () => {
  const synthetic = { ...prItem('merged') };
  assert.ok(conditionMet(synthetic, PR({ merged: true }), PR()));
});

test('action on:approved fires when PR approved, even with item condition:any', () => {
  const synthetic = { ...prItem('approved') };
  assert.ok(conditionMet(synthetic, PR({ approvals: 1 }), PR()));
});

test('action on:merged does NOT fire when PR merely gets a comment', () => {
  const synthetic = { ...prItem('merged') };
  assert.ok(!conditionMet(synthetic, PR({ comment_count: 1 }), PR({ comment_count: 0 })));
});
