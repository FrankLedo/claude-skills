#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const projectsDir = path.join(os.homedir(), '.claude', 'projects');
const TURN_CAP = 12;

function die(msg, code = 1) { console.error(msg); process.exit(code); }

// Read a JSONL file, invoking cb(obj, lineNo) per parseable line.
// Malformed lines warn to stderr and are skipped. Return false from cb to stop.
function eachLine(file, cb) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { console.error(`⚠ Cannot read ${file}: ${e.message}`); return; }
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let obj;
    try { obj = JSON.parse(lines[i]); }
    catch (e) { console.error(`⚠ ${file}:${i + 1}: ${e.message}`); continue; }
    if (cb(obj, i + 1) === false) return;
  }
}

// Extract showable text from a message.content (string or block array).
function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => b && b.type === 'text' && b.text)
      .map(b => b.text)
      .join('\n');
  }
  return '';
}

// All .jsonl transcripts, newest first: [{ full, name, mtime }]. null if no dir.
function listFiles() {
  let projectDirs;
  try { projectDirs = fs.readdirSync(projectsDir); }
  catch { return null; }
  const files = [];
  for (const d of projectDirs) {
    const dir = path.join(projectsDir, d);
    let entries;
    try { entries = fs.readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (!name.endsWith('.jsonl')) continue;
      const full = path.join(dir, name);
      try { files.push({ full, name, mtime: fs.statSync(full).mtime }); } catch { /* skip */ }
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files;
}

function idOf(name) { return name.replace(/\.jsonl$/, ''); }

// cwd + first user intent, reading only as far as needed.
function summarize(file) {
  let cwd = null, intent = '';
  eachLine(file.full, (o) => {
    if (!cwd && typeof o.cwd === 'string') cwd = o.cwd;
    if (!intent && o.type === 'user' && !o.isSidechain && o.message) {
      const t = textOf(o.message.content).trim();
      if (t) intent = t;
    }
    if (cwd && intent) return false;
  });
  return {
    sessionId: idOf(file.name),
    cwd: cwd || os.homedir(),
    mtime: file.mtime.toISOString(),
    intent: intent.replace(/\s+/g, ' ').slice(0, 80),
  };
}

// Find a transcript by id: fast path on filename, fallback to a structured
// scan of the `sessionId` field. A raw substring scan is avoided on purpose —
// it would false-match any transcript that merely *mentions* the id in a
// message (e.g. a session discussing another session's id).
function findFile(id) {
  const files = listFiles();
  if (!files) return null;
  const hit = files.find(f => f.name === `${id}.jsonl`);
  if (hit) return hit;
  for (const f of files) {
    let matched = false;
    eachLine(f.full, (o) => {
      if (o.sessionId === id) { matched = true; return false; }
    });
    if (matched) return f;
  }
  return null;
}

// Full cwd + text-only turn list for one transcript (last TURN_CAP turns).
function extract(file) {
  let cwd = null;
  const turns = [];
  eachLine(file.full, (o) => {
    if (!cwd && typeof o.cwd === 'string') cwd = o.cwd;
    if ((o.type === 'user' || o.type === 'assistant') && !o.isSidechain && o.message) {
      const text = textOf(o.message.content).trim();
      if (text) turns.push({ role: o.type, text });
    }
  });
  return {
    sessionId: idOf(file.name),
    path: file.full,
    cwd: cwd || os.homedir(),
    turns: turns.slice(-TURN_CAP),
  };
}

// --- dispatch ---
const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'list': {
    const files = listFiles();
    if (files === null) { console.log('No ~/.claude/projects directory found.'); process.exit(0); }
    const li = args.indexOf('--limit');
    const parsed = li !== -1 ? parseInt(args[li + 1], 10) : 20;
    const limit = Number.isInteger(parsed) && parsed >= 0 ? parsed : 20;
    console.log(JSON.stringify(files.slice(0, limit).map(summarize), null, 2));
    break;
  }

  case 'find': {
    const id = args[1];
    if (!id) die('find requires <session-id>');
    const file = findFile(id);
    if (!file) die(`Session not found: ${id}`);
    console.log(JSON.stringify(extract(file), null, 2));
    break;
  }

  default:
    die(`Unknown command: ${cmd || '(none)'}\nCommands: list [--limit N], find <session-id>`);
}
