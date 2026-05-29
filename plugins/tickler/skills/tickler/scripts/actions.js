#!/usr/bin/env node
/**
 * Execute a single deterministic tickler action.
 *
 * Usage:
 *   node actions.js --do <verb> --url <item-url> [--data <CLAUDE_PLUGIN_DATA>]
 *                   [--method squash|merge|rebase]   (merge only)
 *                   [--body <text>]                  (comment only)
 *                   [--to <status>]                  (jira_transition only)
 *                   [--jira-base-url <url>] [--jira-email <e>] [--jira-token <t>]
 *                   [--cmd <shell-command>]           (shell only)
 *
 * Tier-1 verbs (deterministic, no model needed):
 *   merge              — gh pr merge
 *   close              — gh pr close / gh issue close
 *   comment            — post a comment via gh api
 *   jira_transition    — transition a Jira issue via REST API
 *   remove_from_watch  — state.js remove-item
 *   shell              — run args.cmd directly via execSync (no agent spawned)
 *
 * Tier-2 verbs (run, slack_dm, interactive) are NOT handled here — the monitor
 * agent dispatches those directly.
 *
 * Prints JSON to stdout: { "success": true } or { "error": "..." }
 * Exits 0 on success, 1 on error.
 */

'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');

const argv = process.argv.slice(2);
const get  = flag => { const i = argv.indexOf(flag); return i !== -1 ? argv[i + 1] : null; };

const verb         = get('--do');
const itemUrl      = get('--url');
const dataDir      = get('--data')           || '';
const method       = get('--method')         || 'squash';
const adminMerge   = get('--admin') === 'true';
const body         = get('--body')           || '';
const jiraTo       = get('--to')             || '';
const jiraBaseUrl  = get('--jira-base-url')  || '';
const jiraEmail    = get('--jira-email')     || '';
const jiraToken    = get('--jira-token')     || '';
const cmd          = get('--cmd')            || '';
const session      = get('--session')        || '';
const cwd          = get('--cwd')            || '';

function ok(extra)   { console.log(JSON.stringify({ success: true, ...extra })); }
function fail(msg)   { console.error(JSON.stringify({ error: msg })); process.exit(1); }

if (!verb)    fail('Missing --do');
if (verb !== 'shell' && !itemUrl) fail('Missing --url');

// --- helpers ---------------------------------------------------------------

function gh(...args) {
  return execSync(['gh', ...args].join(' '), { encoding: 'utf8' }).trim();
}

function parseGitHubUrl(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/);
  if (!m) fail(`Cannot parse GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2], type: m[3], number: m[4], isPR: m[3] === 'pull' };
}

function parseJiraTicket(url) {
  const m = url.match(/\/browse\/([A-Z]+-\d+)/i);
  if (!m) fail(`Cannot parse Jira ticket from URL: ${url}`);
  return m[1].toUpperCase();
}

// --- verbs -----------------------------------------------------------------

async function doMerge() {
  const { isPR } = parseGitHubUrl(itemUrl);
  if (!isPR) fail('merge verb is only valid for GitHub PRs');
  const flag  = method === 'merge' ? '--merge' : method === 'rebase' ? '--rebase' : '--squash';
  const extra = adminMerge ? ['--admin'] : [];
  try {
    gh('pr', 'merge', flag, '--auto', ...extra, `"${itemUrl}"`);
  } catch (err) {
    if (err.message.includes('enablePullRequestAutoMerge')) {
      // Repo has auto-merge disabled — merge immediately instead of queuing
      gh('pr', 'merge', flag, ...extra, `"${itemUrl}"`);
    } else {
      throw err;
    }
  }
  ok();
}

function doClose() {
  const { isPR } = parseGitHubUrl(itemUrl);
  if (isPR) {
    gh('pr', 'close', `"${itemUrl}"`);
  } else {
    gh('issue', 'close', `"${itemUrl}"`);
  }
  ok();
}

function doComment() {
  if (!body) fail('comment verb requires --body');
  const { isPR, owner, repo, number } = parseGitHubUrl(itemUrl);
  const endpoint = isPR
    ? `/repos/${owner}/${repo}/issues/${number}/comments`
    : `/repos/${owner}/${repo}/issues/${number}/comments`;
  gh('api', endpoint, '-f', `body="${body.replace(/"/g, '\\"')}"`);
  ok();
}

async function doJiraTransition() {
  if (!jiraTo)      fail('jira_transition requires --to');
  if (!jiraBaseUrl) fail('jira_transition requires --jira-base-url');
  if (!jiraEmail)   fail('jira_transition requires --jira-email');
  if (!jiraToken)   fail('jira_transition requires --jira-token');

  const ticket = parseJiraTicket(itemUrl);
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const base   = jiraBaseUrl.replace(/\/$/, '');

  // Fetch available transitions
  const tRes = await fetch(`${base}/rest/api/3/issue/${ticket}/transitions`, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (!tRes.ok) fail(`Jira transitions fetch failed: ${tRes.status}`);
  const { transitions } = await tRes.json();

  const target = transitions.find(t => t.name.toLowerCase() === jiraTo.toLowerCase());
  if (!target) fail(`No transition named "${jiraTo}" found for ${ticket}`);

  const pRes = await fetch(`${base}/rest/api/3/issue/${ticket}/transitions`, {
    method:  'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ transition: { id: target.id } }),
  });
  if (!pRes.ok) fail(`Jira transition failed: ${pRes.status}`);
  ok();
}

function doRemoveFromWatch() {
  if (!dataDir) fail('remove_from_watch requires --data');
  const stateScript = path.join(__dirname, 'state.js');
  execSync(`node "${stateScript}" remove-item --data "${dataDir}" "${itemUrl}"`, { encoding: 'utf8' });
  ok();
}

function doShell() {
  if (!cmd) fail('shell verb requires --cmd');
  const output = execSync(cmd, { encoding: 'utf8', shell: true }).trim();
  ok({ output });
}

function doClaudeResumeBg() {
  if (!session) fail('claude-resume-bg requires --session');
  if (!cwd)     fail('claude-resume-bg requires --cwd');
  // Pipe "/bg\n" as stdin — workaround until --bg CLI flag ships in Claude Code
  const child = spawn('claude', ['--resume', session], {
    cwd,
    detached: true,
    stdio: ['pipe', 'ignore', 'ignore'],
  });
  child.stdin.write('/bg\n');
  child.stdin.end();
  child.unref();
  ok();
}

// --- dispatch --------------------------------------------------------------

async function main() {
  switch (verb) {
    case 'merge':             await doMerge();          break;
    case 'close':                   doClose();          break;
    case 'comment':                 doComment();        break;
    case 'jira_transition':   await doJiraTransition(); break;
    case 'remove_from_watch':       doRemoveFromWatch(); break;
    case 'shell':                   doShell();             break;
    case 'claude-resume-bg':        doClaudeResumeBg();    break;
    default:
      fail(`Unknown verb: ${verb}. Tier-2 verbs (run, slack_dm, interactive) are handled by the monitor agent.`);
  }
}

main().catch(err => fail(err.message));
