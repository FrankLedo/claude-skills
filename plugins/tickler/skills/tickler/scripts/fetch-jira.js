#!/usr/bin/env node
/**
 * Fetch Jira issue state via REST API v3 (Jira Cloud).
 *
 * Usage:
 *   node fetch-jira.js --ticket PROJ-123 --base-url https://org.atlassian.net \
 *                      --email user@example.com --token <api-token>
 *
 * Prints JSON to stdout. Exits 1 on error with JSON { error: "..." }.
 */

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const ticket   = get('--ticket');
const baseUrl  = get('--base-url');
const email    = get('--email');
const token    = get('--token');

if (!ticket || !baseUrl || !email || !token) {
  console.error(JSON.stringify({ error: 'Missing required args: --ticket --base-url --email --token' }));
  process.exit(1);
}

const auth = Buffer.from(`${email}:${token}`).toString('base64');
const headers = {
  'Authorization': `Basic ${auth}`,
  'Accept': 'application/json',
};

async function main() {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${ticket}?fields=summary,status,comment,updated`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    console.error(JSON.stringify({ error: `Jira API ${res.status}: ${body}` }));
    process.exit(1);
  }
  const data = await res.json();
  const fields = data.fields;

  console.log(JSON.stringify({
    status: fields.status?.name ?? 'Unknown',
    summary: fields.summary ?? '',
    comment_count: fields.comment?.total ?? 0,
    last_activity: fields.updated ?? null,
  }));
}

main().catch(e => {
  console.error(JSON.stringify({ error: String(e) }));
  process.exit(1);
});
