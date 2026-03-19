#!/usr/bin/env node
/**
 * Fetch GitHub PR or issue state via REST API.
 *
 * Usage:
 *   node fetch-github.js --url <url> [--token <token>]
 *
 * Prints JSON to stdout. Exits 1 on error with JSON { error: "..." }.
 *
 * Detects PR vs issue from URL:
 *   github.com/{owner}/{repo}/pull/{number}  → PR
 *   github.com/{owner}/{repo}/issues/{number} → Issue
 */

const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const tokenIdx = args.indexOf('--token');
const url = urlIdx !== -1 ? args[urlIdx + 1] : null;
const token = tokenIdx !== -1 ? args[tokenIdx + 1] : null;

if (!url) {
  console.error(JSON.stringify({ error: 'Missing --url' }));
  process.exit(1);
}

// Parse owner/repo/number/type from URL
// https://github.com/owner/repo/pull/123
// https://github.com/owner/repo/issues/123
const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/);
if (!match) {
  console.error(JSON.stringify({ error: `Cannot parse GitHub URL: ${url}` }));
  process.exit(1);
}
const [, owner, repo, type, number] = match;
const isPR = type === 'pull';

const headers = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'fxl-tickler/1.0',
};
if (token) headers['Authorization'] = `Bearer ${token}`;

const endpoint = isPR
  ? `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`
  : `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;

async function main() {
  // Fetch main resource
  const res = await fetch(endpoint, { headers });
  if (!res.ok) {
    const body = await res.text();
    console.error(JSON.stringify({ error: `GitHub API ${res.status}: ${body}` }));
    process.exit(1);
  }
  const data = await res.json();

  // comment_count is included in the issues/pulls response
  const commentCount = data.comments ?? 0;

  if (isPR) {
    // Also fetch reviews for approval state
    const reviewsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
      { headers }
    );
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

    // Count latest review state per reviewer (last review wins)
    const latestByUser = {};
    for (const r of reviews) {
      if (r.state !== 'COMMENTED') latestByUser[r.user.login] = r.state;
    }
    const states = Object.values(latestByUser);
    const approvals = states.filter(s => s === 'APPROVED').length;
    const changesRequested = states.some(s => s === 'CHANGES_REQUESTED');

    console.log(JSON.stringify({
      status: data.state,           // "open" | "closed"
      title: data.title,
      approvals,
      changes_requested: changesRequested,
      merged: !!data.merged_at,
      comment_count: commentCount,
      last_activity: data.updated_at,
    }));
  } else {
    console.log(JSON.stringify({
      status: data.state,           // "open" | "closed"
      title: data.title,
      labels: data.labels.map(l => l.name),
      comment_count: commentCount,
      last_activity: data.updated_at,
    }));
  }
}

main().catch(e => {
  console.error(JSON.stringify({ error: String(e) }));
  process.exit(1);
});
