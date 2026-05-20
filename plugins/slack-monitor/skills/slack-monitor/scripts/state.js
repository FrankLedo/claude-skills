#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const cmd  = argv[0];

const dataIdx = argv.indexOf('--data');
if (dataIdx === -1 || !argv[dataIdx + 1]) {
  die('Usage: node state.js <command> --data <dir> [args...]');
}
const dataDir = argv[dataIdx + 1];

// positional args: everything except cmd, --data, and its value
const pos = argv.filter((_, i) => i !== 0 && i !== dataIdx && i !== dataIdx + 1);

const fileIdx = argv.indexOf('--file');
const filePath = fileIdx !== -1 ? argv[fileIdx + 1] : null;

function die(msg) { console.error(msg); process.exit(1); }

function readJSON(p, fallback) {
  try {
    const raw = fs.readFileSync(p, 'utf8').trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeAtomic(p, data) {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, p);
}

const pendingPath    = path.join(dataDir, 'pending_review.json');
const cachePath      = path.join(dataDir, 'search_cache.json');
const checkpointPath = path.join(dataDir, 'cycle_checkpoint.json');

switch (cmd) {

  // ── pending_review.json ──────────────────────────────────────────────────

  case 'pending-list': {
    console.log(JSON.stringify(readJSON(pendingPath, []), null, 2));
    break;
  }

  case 'pending-count': {
    console.log(readJSON(pendingPath, []).length);
    break;
  }

  case 'pending-add': {
    const jsonStr = filePath
      ? fs.readFileSync(filePath, 'utf8')
      : pos.filter((_, i) => {
          return true;
        })[0];
    if (!jsonStr) die('pending-add requires <json> or --file <path>');
    const item = JSON.parse(jsonStr);
    if (!item.id) die('pending-add: item must have an id field');
    const items = readJSON(pendingPath, []);
    if (!items.some(i => i.id === item.id)) {
      items.push(item);
      writeAtomic(pendingPath, items);
      console.log(`Added: ${item.id}`);
    } else {
      console.log(`Duplicate skipped: ${item.id}`);
    }
    break;
  }

  case 'pending-remove': {
    const id = pos[0];
    if (!id) die('pending-remove requires <id>');
    const items = readJSON(pendingPath, []);
    const kept  = items.filter(i => i.id !== id);
    writeAtomic(pendingPath, kept);
    console.log(`Removed: ${id}`);
    break;
  }

  // ── search_cache.json ────────────────────────────────────────────────────

  case 'cache-get': {
    const key   = pos[0];
    if (!key) die('cache-get requires <key>');
    const cache = readJSON(cachePath, { threads: {} });
    console.log(JSON.stringify(cache.threads[key] ?? null, null, 2));
    break;
  }

  case 'cache-set': {
    const key    = pos[0];
    const valStr = filePath ? fs.readFileSync(filePath, 'utf8') : pos[1];
    if (!key || !valStr) die('cache-set requires <key> <json> (or --file <path>)');
    const cache = readJSON(cachePath, { threads: {} });
    cache.threads[key] = JSON.parse(valStr);
    writeAtomic(cachePath, cache);
    console.log(`Cache updated: ${key}`);
    break;
  }

  case 'cache-prune': {
    const cache  = readJSON(cachePath, { threads: {} });
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    let removed  = 0;
    for (const key of Object.keys(cache.threads)) {
      if ((cache.threads[key].checked_at_epoch ?? 0) < cutoff) {
        delete cache.threads[key];
        removed++;
      }
    }
    writeAtomic(cachePath, cache);
    console.log(`Pruned ${removed} cache entries`);
    break;
  }

  // ── cycle_checkpoint.json ────────────────────────────────────────────────

  case 'checkpoint-read': {
    console.log(JSON.stringify(readJSON(checkpointPath, {}), null, 2));
    break;
  }

  case 'checkpoint-write': {
    const jsonStr = filePath ? fs.readFileSync(filePath, 'utf8') : pos[0];
    if (!jsonStr) die('checkpoint-write requires <json> or --file <path>');
    writeAtomic(checkpointPath, JSON.parse(jsonStr));
    console.log('Checkpoint written');
    break;
  }

  case 'checkpoint-clear': {
    writeAtomic(checkpointPath, {});
    console.log('Checkpoint cleared');
    break;
  }

  default:
    die(
      `Unknown command: ${cmd}\n` +
      'Commands: pending-list, pending-count, pending-add, pending-remove, ' +
      'cache-get, cache-set, cache-prune, ' +
      'checkpoint-read, checkpoint-write, checkpoint-clear'
    );
}
