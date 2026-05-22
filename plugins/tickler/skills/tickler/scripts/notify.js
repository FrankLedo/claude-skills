#!/usr/bin/env node
/**
 * Script-based monitor cycle for qualifying notify-only cycles.
 *
 * Usage:
 *   node notify.js --data <dir> --skill-dir <scripts-dir> --changed '<JSON>'
 *                  [--jira-base-url <url>] [--jira-email <email>] [--jira-token <token>]
 *
 * Qualifications (enforced by parent SKILL.md before calling this script):
 *   - notify === "direct"
 *   - no pending_actions with do: run | slack_dm | interactive
 *   - no pending_actions with confirm: true
 *
 * Prints notification blocks, fires tier-1 actions, then outputs MONITOR_SUMMARY.
 * Exits 0 always; item-level errors are logged to stderr.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

// --- arg parsing -----------------------------------------------------------

const argv = process.argv.slice(2);
const get  = flag => { const i = argv.indexOf(flag); return i !== -1 ? argv[i + 1] : null; };

const dataDir     = get('--data');
const skillDir    = get('--skill-dir');
const changedRaw  = get('--changed');
const jiraBaseUrl = get('--jira-base-url') || '';
const jiraEmail   = get('--jira-email')    || '';
const jiraToken   = get('--jira-token')    || '';

if (!dataDir || !skillDir || !changedRaw) {
  process.stderr.write('Missing --data, --skill-dir, or --changed\n');
  process.exit(1);
}

const stateScript   = path.join(skillDir, 'state.js');
const actionsScript = path.join(skillDir, 'actions.js');

// --- helpers ---------------------------------------------------------------

function formatCondition(cond, entry) {
  if (cond === 'merged')            return 'Merged';
  if (cond === 'closed')            return 'Closed';
  if (cond === 'approved')          return 'Approved';
  if (cond === 'changes-requested') return 'Changes requested';
  if (cond === 'ci-passed')         return 'CI passed';
  if (cond === 'ci-failed')         return 'CI failed';
  if (cond === 'new-comment')       return 'New comment';
  if (cond === 'new-subtask') {
    const n = (entry.new_subtasks || []).length;
    return `${n} new subtask${n !== 1 ? 's' : ''}`;
  }
  if (cond.startsWith('status:'))  return `Status: ${cond.slice(7)}`;
  if (cond.startsWith('labeled:')) return `Labeled: ${cond.slice(8)}`;
  return 'Changed';
}

function buildActionArgs(verb, url, args) {
  const parts = [
    `--do ${verb}`,
    `--url "${url}"`,
    `--data "${dataDir}"`,
  ];
  if (args.method)    parts.push(`--method ${args.method}`);
  if (args.admin)     parts.push('--admin true');
  if (args.body)      parts.push(`--body ${JSON.stringify(args.body)}`);
  if (args.to)        parts.push(`--to ${JSON.stringify(args.to)}`);
  if (args.cmd)       parts.push(`--cmd ${JSON.stringify(args.cmd)}`);
  if (jiraBaseUrl)    parts.push(`--jira-base-url "${jiraBaseUrl}"`);
  if (jiraEmail)      parts.push(`--jira-email "${jiraEmail}"`);
  if (jiraToken)      parts.push(`--jira-token "${jiraToken}"`);
  return parts.join(' ');
}

// --- main ------------------------------------------------------------------

let notifications_sent = 0;
let actions_fired      = 0;
const changed_urls     = [];

const changed = JSON.parse(changedRaw);

for (const entry of changed) {
  const { url, condition, title } = entry;
  changed_urls.push(url);

  const condDesc = formatCondition(condition, entry);
  process.stdout.write('── Tickler ────────────────────────────────\n');
  process.stdout.write(`  ✓ ${condDesc} — "${title}"\n`);
  process.stdout.write(`    ${url}\n`);
  process.stdout.write('────────────────────────────────────────────\n');
  notifications_sent++;

  for (const action of (entry.pending_actions || [])) {
    const { do: verb, args = {}, on: trigger } = action;
    try {
      const actionArgs = buildActionArgs(verb, url, args);
      execSync(`node "${actionsScript}" ${actionArgs}`, { encoding: 'utf8' });
      const key = `${trigger}:${verb}`;
      execSync(
        `node "${stateScript}" append-fired-action --data "${dataDir}" '${url}' '${key}'`,
        { encoding: 'utf8' }
      );
      actions_fired++;
    } catch (err) {
      process.stderr.write(`action ${verb} failed for ${url}: ${err.message}\n`);
    }
  }
}

process.stdout.write('\nMONITOR_SUMMARY\n');
process.stdout.write(`notifications_sent: ${notifications_sent}\n`);
process.stdout.write(`actions_fired: ${actions_fired}\n`);
process.stdout.write('actions_pending_confirm: 0\n');
process.stdout.write('interactive_pending: 0\n');
process.stdout.write(`changed_urls: ${changed_urls.join(',')}\n`);
