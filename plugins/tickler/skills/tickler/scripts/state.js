#!/usr/bin/env node
/**
 * State API for tickler plugin — single-file design.
 *
 * All data lives in one file: tickler.json
 * Each item carries its own observed state in a `state` field.
 * This eliminates the state.json / tickler.json sync problem entirely.
 *
 * Usage:
 *   node state.js <command> --data <dir> [args...]
 *
 * Commands:
 *   list                         print all items as JSON (includes state field)
 *   get-state [<url>]            print {url: state} map, or single state for <url>
 *   set-state <url> <json>       update item.state for <url> atomically
 *   set-states <json>            update item.state for each url in {url: state} map
 *   add-item <item-json> [<baseline-state-json>]
 *                                append item; optional initial state; auto-fills id/added
 *   update-item <url> <patch-json>
 *                                merge a partial patch into an existing item;
 *                                actions merge by `on`, other fields overwrite;
 *                                preserves id/added/snoozed_until/state unless patched
 *   remove-item <url>            remove item by url
 *   append-fired-action <url> <key>
 *                                append an "on:do" key to item.state.fired_actions (idempotent)
 *   migrate                      one-time: merge legacy state.json into item.state fields
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- arg parsing -----------------------------------------------------------

const argv = process.argv.slice(2);
const cmd  = argv[0];

const dataIdx = argv.indexOf('--data');
if (dataIdx === -1 || !argv[dataIdx + 1]) {
  die('Usage: node state.js <command> --data <dir> [args...]');
}
const dataDir = argv[dataIdx + 1];

// positional args: everything except cmd, --data, and its value
const pos = argv.filter((_, i) => i !== 0 && i !== dataIdx && i !== dataIdx + 1);

// --- paths -----------------------------------------------------------------

const ticklerPath = path.join(dataDir, 'tickler.json');
const legacyStatePath = path.join(dataDir, 'state.json');

// --- helpers ---------------------------------------------------------------

function die(msg) { console.error(msg); process.exit(1); }

function readItems() {
  try {
    const raw = fs.readFileSync(ticklerPath, 'utf8').trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAtomic(data) {
  const tmp = ticklerPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, ticklerPath);
}

// --- commands --------------------------------------------------------------

switch (cmd) {

  case 'list': {
    console.log(JSON.stringify(readItems(), null, 2));
    break;
  }

  case 'get-state': {
    const items = readItems();
    const url   = pos[0];
    if (url) {
      const item = items.find(i => i.url === url);
      console.log(JSON.stringify(item ? (item.state ?? null) : null, null, 2));
    } else {
      const map = {};
      for (const item of items) map[item.url] = item.state ?? null;
      console.log(JSON.stringify(map, null, 2));
    }
    break;
  }

  case 'set-state': {
    const url     = pos[0];
    const jsonStr = pos[1];
    if (!url || !jsonStr) die('set-state requires <url> <json>');
    const newState = JSON.parse(jsonStr);
    const items    = readItems();
    const item     = items.find(i => i.url === url);
    if (!item) die(`Not found: ${url}`);
    item.state = newState;
    writeAtomic(items);
    console.log(`State updated for ${url}`);
    break;
  }

  case 'set-states': {
    const jsonStr = pos[0];
    if (!jsonStr) die('set-states requires <json> — a {url: state} map');
    const map   = JSON.parse(jsonStr);
    const items = readItems();
    for (const item of items) {
      if (item.url in map) item.state = map[item.url];
    }
    writeAtomic(items);
    console.log(`States updated for ${Object.keys(map).length} items`);
    break;
  }

  case 'add-item': {
    const itemStr     = pos[0];
    const baselineStr = pos[1]; // optional
    if (!itemStr) die('add-item requires <item-json>');

    const item = JSON.parse(itemStr);
    if (!item.url) die('add-item: item must have a url field');

    const items = readItems();
    if (items.some(i => i.url === item.url)) die(`Already watching: ${item.url}`);

    if (!item.id)   item.id    = crypto.randomUUID();
    if (!item.added) item.added = new Date().toISOString();
    if (!('snoozed_until' in item)) item.snoozed_until = null;
    item.state = baselineStr ? JSON.parse(baselineStr) : null;

    items.push(item);
    writeAtomic(items);
    console.log(JSON.stringify(item));
    break;
  }

  case 'update-item': {
    const url     = pos[0];
    const patchStr = pos[1];
    if (!url || !patchStr) die('update-item requires <url> <patch-json>');

    const patch = JSON.parse(patchStr);
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
      die('update-item: patch must be a JSON object');
    }

    const items = readItems();
    const item  = items.find(i => i.url === url);
    if (!item) die(`Not found: ${url}`);

    for (const [key, value] of Object.entries(patch)) {
      // Actions merge by `on` so a patch can add/replace one action without
      // clobbering the rest; everything else is a shallow top-level overwrite.
      if (key === 'actions' && Array.isArray(value) && Array.isArray(item.actions)) {
        const merged = item.actions.slice();
        for (const action of value) {
          const at = action && action.on != null
            ? merged.findIndex(a => a && a.on === action.on)
            : -1;
          if (at === -1) merged.push(action);
          else merged[at] = action;
        }
        item.actions = merged;
      } else {
        item[key] = value;
      }
    }

    writeAtomic(items);
    console.log(JSON.stringify(item));
    break;
  }

  case 'remove-item': {
    const url   = pos[0];
    if (!url) die('remove-item requires <url>');
    const items  = readItems();
    const kept   = items.filter(i => i.url !== url);
    if (kept.length === items.length) { console.log(`Not watching: ${url}`); break; }
    writeAtomic(kept);
    console.log(`Removed: ${url}`);
    break;
  }

  case 'append-fired-action': {
    // append-fired-action <url> <key>  e.g. "approved:merge"
    const url = pos[0];
    const key = pos[1];
    if (!url || !key) die('append-fired-action requires <url> <key>');
    const items = readItems();
    const item  = items.find(i => i.url === url);
    if (!item) { console.log(`Item already removed, skipping: ${key} for ${url}`); break; }
    if (!item.state) item.state = {};
    if (!Array.isArray(item.state.fired_actions)) item.state.fired_actions = [];
    if (!item.state.fired_actions.includes(key)) {
      item.state.fired_actions.push(key);
      writeAtomic(items);
    }
    console.log(`Recorded fired action ${key} for ${url}`);
    break;
  }

  case 'migrate': {
    // Merge legacy state.json (url-keyed) into item.state fields.
    let legacy = {};
    try {
      const raw = fs.readFileSync(legacyStatePath, 'utf8').trim();
      legacy = raw ? JSON.parse(raw) : {};
    } catch {
      console.log('No state.json found — nothing to migrate.');
      break;
    }
    const items  = readItems();
    let migrated = 0;
    for (const item of items) {
      if (item.state == null && legacy[item.url]) {
        item.state = legacy[item.url];
        migrated++;
      }
    }
    writeAtomic(items);
    // Rename legacy file so it's out of the way
    fs.renameSync(legacyStatePath, legacyStatePath + '.migrated');
    console.log(`Migrated ${migrated} state entries. state.json → state.json.migrated`);
    break;
  }

  default:
    die(
      `Unknown command: ${cmd}\n` +
      'Commands: list, get-state, set-state, set-states, add-item, update-item, remove-item, migrate'
    );
}
