#!/usr/bin/env node
/**
 * Fetch current state for all non-snoozed watched items and detect changes.
 *
 * Usage:
 *   node check.js --data <dir> [--token <githubToken>]
 *                 [--jira-base-url <url>] [--jira-email <email>] [--jira-token <token>]
 *
 * Reads tickler.json from <dir>, fetches each non-snoozed item in parallel,
 * saves updated state back to tickler.json via state.js, and prints JSON to stdout:
 *   {
 *     "items_checked": N,
 *     "changed": [{ "url": "...", "condition": "..." }],
 *     "terminal_items": ["url", ...]   // merged/closed PRs + closed issues
 *   }
 *
 * Exits 0 always. Item-level errors are logged to stderr and the item is skipped.
 */

'use strict';

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

// --- arg parsing -----------------------------------------------------------

const argv = process.argv.slice(2);
const get  = flag => { const i = argv.indexOf(flag); return i !== -1 ? argv[i + 1] : null; };

const dataDir = get('--data');

// Resolve env: prefix — "env:GH_CLI" → gh auth token, "env:VAR" → process.env.VAR
function resolveToken(val) {
  if (!val) return val;
  if (val === 'env:GH_CLI') return execSync('gh auth token', { encoding: 'utf8' }).trim();
  if (val.startsWith('env:')) return process.env[val.slice(4)] || '';
  return val;
}

const githubToken = resolveToken(get('--token')         || '');
const jiraBaseUrl =              get('--jira-base-url') || '';
const jiraEmail   = resolveToken(get('--jira-email')    || '');
const jiraToken   = resolveToken(get('--jira-token')    || '');

if (!dataDir) { console.error('Missing --data'); process.exit(1); }

// --- load items ------------------------------------------------------------

const ticklerPath = path.join(dataDir, 'tickler.json');
let items = [];
try {
  const raw = fs.readFileSync(ticklerPath, 'utf8').trim();
  items = raw ? JSON.parse(raw) : [];
} catch { items = []; }

const now    = new Date();
const active = items.filter(item =>
  !item.snoozed_until || new Date(item.snoozed_until) <= now
);

// --- GitHub fetch ----------------------------------------------------------

async function fetchGitHub(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/);
  if (!match) throw new Error(`Cannot parse GitHub URL: ${url}`);
  const [, owner, repo, type, number] = match;
  const isPR = type === 'pull';

  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'fxl-tickler/1.0',
  };
  if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;

  const base     = `https://api.github.com/repos/${owner}/${repo}`;
  const endpoint = isPR ? `${base}/pulls/${number}` : `${base}/issues/${number}`;

  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  const data = await res.json();

  if (isPR) {
    const sha = data.head.sha;
    const [reviewsRes, checksRes] = await Promise.all([
      fetch(`${base}/pulls/${number}/reviews`, { headers }),
      fetch(`${base}/commits/${sha}/check-runs?per_page=100`, { headers }),
    ]);
    const reviews   = reviewsRes.ok ? await reviewsRes.json() : [];
    const checksData = checksRes.ok ? await checksRes.json() : { check_runs: [] };
    const runs       = checksData.check_runs || [];

    const latestByUser = {};
    for (const r of reviews) {
      if (r.state !== 'COMMENTED') latestByUser[r.user.login] = r.state;
    }
    const states = Object.values(latestByUser);

    // Summarize CI: latest run per check name, then aggregate
    const latestRun = {};
    for (const run of runs) latestRun[run.name] = run;
    const allRuns = Object.values(latestRun);
    let ci_status = 'none';
    if (allRuns.length > 0) {
      const FAIL = new Set(['failure', 'cancelled', 'timed_out', 'action_required']);
      if (allRuns.some(r => r.status !== 'completed')) {
        ci_status = 'pending';
      } else if (allRuns.some(r => FAIL.has(r.conclusion))) {
        ci_status = 'failure';
      } else {
        ci_status = 'success';
      }
    }

    return {
      status:            data.state,
      title:             data.title,
      approvals:         states.filter(s => s === 'APPROVED').length,
      changes_requested: states.some(s => s === 'CHANGES_REQUESTED'),
      merged:            !!data.merged_at,
      ci_status,
      comment_count:     data.comments ?? 0,
      last_activity:     data.updated_at,
      last_checked:      now.toISOString(),
    };
  } else {
    return {
      status:        data.state,
      title:         data.title,
      labels:        (data.labels || []).map(l => l.name),
      comment_count: data.comments ?? 0,
      last_activity: data.updated_at,
      last_checked:  now.toISOString(),
    };
  }
}

// --- Jira fetch ------------------------------------------------------------

async function fetchJira(itemUrl) {
  if (!jiraBaseUrl || !jiraEmail || !jiraToken) throw new Error('Jira not configured');
  const ticketMatch = itemUrl.match(/\/browse\/([A-Z]+-\d+)/i);
  const ticket      = ticketMatch ? ticketMatch[1].toUpperCase() : itemUrl;
  const auth        = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const url         = `${jiraBaseUrl.replace(/\/$/, '')}/rest/api/3/issue/${ticket}?fields=summary,status,comment,updated,subtasks`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Jira API ${res.status} for ${ticket}`);
  const data   = await res.json();
  const fields = data.fields;

  return {
    status:        fields.status?.name   ?? 'Unknown',
    summary:       fields.summary        ?? '',
    comment_count: fields.comment?.total ?? 0,
    last_activity: fields.updated        ?? null,
    subtasks:      (fields.subtasks ?? []).map(st => ({
      key:     st.key,
      summary: st.fields?.summary       ?? '',
      status:  st.fields?.status?.name  ?? 'Unknown',
    })),
    last_checked:  now.toISOString(),
  };
}

// --- condition matching ----------------------------------------------------

function conditionMet(item, newState, prevState) {
  const cond = item.condition || 'any';

  if (item.type === 'github-pr') {
    if (cond === 'approved')           return newState.approvals >= 1;
    if (cond === 'merged')             return newState.merged === true;
    if (cond === 'closed')             return newState.status === 'closed' && !newState.merged;
    if (cond === 'changes-requested')  return newState.changes_requested === true;
    if (cond === 'ci-passed')          return newState.ci_status === 'success';
    if (cond === 'ci-failed')          return newState.ci_status === 'failure';
    if (cond === 'new-comment')        return prevState != null && newState.comment_count > prevState.comment_count;
    if (cond === 'any')                return prevState != null && JSON.stringify(pick(newState)) !== JSON.stringify(pick(prevState));
  }

  if (item.type === 'github-issue') {
    if (cond === 'closed')      return newState.status === 'closed';
    if (cond === 'new-comment') return prevState != null && newState.comment_count > prevState.comment_count;
    if (cond.startsWith('labeled:')) {
      const label   = cond.slice('labeled:'.length);
      const hadIt   = prevState ? (prevState.labels || []).includes(label) : false;
      return newState.labels.includes(label) && !hadIt;
    }
    if (cond === 'any') return prevState != null && JSON.stringify(pick(newState)) !== JSON.stringify(pick(prevState));
  }

  if (item.type === 'jira') {
    if (cond.startsWith('status:')) {
      return newState.status.toLowerCase() === cond.slice('status:'.length).toLowerCase();
    }
    if (cond === 'new-comment')  return prevState != null && newState.comment_count > prevState.comment_count;
    if (cond === 'new-subtask') {
      if (prevState == null) return false;
      const prevKeys = new Set((prevState.subtasks || []).map(st => st.key));
      return (newState.subtasks || []).some(st => !prevKeys.has(st.key));
    }
    if (cond === 'any') return prevState != null && JSON.stringify(pick(newState)) !== JSON.stringify(pick(prevState));
  }

  return false;
}

// exclude last_checked from change comparison so a re-fetch doesn't look like a change
function pick(state) {
  if (!state) return state;
  const { last_checked, ...rest } = state;
  return rest;
}

// --- per-item check --------------------------------------------------------

async function checkItem(item) {
  try {
    let newState;
    if (item.type === 'github-pr' || item.type === 'github-issue') {
      newState = await fetchGitHub(item.url);
    } else if (item.type === 'jira') {
      newState = await fetchJira(item.url);
    } else {
      throw new Error(`Unknown type: ${item.type}`);
    }
    // Carry fired_actions forward so they survive the state update
    if (item.state?.fired_actions?.length) {
      newState.fired_actions = item.state.fired_actions;
    }
    return { item, newState, error: null };
  } catch (err) {
    return { item, newState: null, error: err.message };
  }
}

// --- main ------------------------------------------------------------------

async function main() {
  const results = await Promise.all(active.map(checkItem));

  const changed        = [];
  const updated_states = {};
  const terminal_items = [];

  for (const { item, newState, error } of results) {
    if (error) {
      console.error(`skip ${item.url}: ${error}`);
      continue;
    }

    updated_states[item.url] = newState;

    if (item.type === 'github-pr' && (newState.merged || newState.status === 'closed')) {
      terminal_items.push(item.url);
    } else if (item.type === 'github-issue' && newState.status === 'closed') {
      terminal_items.push(item.url);
    }

    // first check: establish baseline only, no change notification
    if (item.state == null) continue;

    if (conditionMet(item, newState, item.state)) {
      const triggeredCond = item.condition || 'any';
      const entry = { url: item.url, condition: triggeredCond };

      if (triggeredCond === 'new-subtask') {
        const prevKeys = new Set((item.state.subtasks || []).map(st => st.key));
        entry.new_subtasks = (newState.subtasks || []).filter(st => !prevKeys.has(st.key));
      }

      // Attach matching actions, filtered for idempotency
      const firedKeys = new Set(item.state?.fired_actions || []);
      const pending = (item.actions || []).filter(a =>
        a.on === triggeredCond && !firedKeys.has(`${a.on}:${a.do}`)
      );
      if (pending.length) entry.pending_actions = pending;

      changed.push(entry);
    }
  }

  // Save updated state directly — eliminates the updated_states round-trip through the agent
  if (Object.keys(updated_states).length > 0) {
    const stateScript = path.join(__dirname, 'state.js');
    execSync(
      `node "${stateScript}" set-states --data "${dataDir}" '${JSON.stringify(updated_states).replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8' }
    );
  }

  console.log(JSON.stringify({
    items_checked: results.filter(r => !r.error).length,
    changed,
    terminal_items,
  }, null, 2));
}

main().catch(err => {
  console.error(`fatal: ${err.message}`);
  process.exit(1);
});
