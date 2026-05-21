#!/usr/bin/env node
/**
 * Compute the next check interval based on activity and update persistent state.
 *
 * Usage:
 *   node adaptive-interval.js --data <dir> --base <minutes> --changed <0|1>
 *                             [--min <minutes>] [--max <minutes>]
 *
 * State file: <dir>/adaptive_interval.json
 *   { "burst_remaining": N, "current_interval": N }
 *
 * Logic:
 *   - Activity detected (--changed 1):
 *       Reset burst_remaining to 2, next interval = intervalMin
 *   - No activity, burst_remaining > 0:
 *       Decrement burst_remaining, next interval = intervalMin
 *   - No activity, burst exhausted:
 *       Ramp up: next interval = min(intervalMax, round_5(current * 1.5))
 *
 * Prints the next interval in minutes to stdout (integer).
 * Exits 0 always.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const get  = flag => { const i = argv.indexOf(flag); return i !== -1 ? argv[i + 1] : null; };

const dataDir  = get('--data');
const base     = parseInt(get('--base')    || '60', 10);
const changed  = get('--changed') === '1';
const minInt   = parseInt(get('--min') || String(Math.max(15, Math.round(base / 2))), 10);
const maxInt   = parseInt(get('--max') || String(base * 2), 10);

if (!dataDir) { console.error('Missing --data'); process.exit(1); }

const statePath = path.join(dataDir, 'adaptive_interval.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { burst_remaining: 0, current_interval: base };
  }
}

function writeState(state) {
  const tmp = statePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state) + '\n', 'utf8');
  fs.renameSync(tmp, statePath);
}

// Round to nearest 5 minutes, minimum 1
function round5(n) {
  return Math.max(1, Math.round(n / 5) * 5);
}

const state = readState();
let nextInterval;

if (changed) {
  // Activity: burst mode for next 2 cycles
  state.burst_remaining  = 2;
  state.current_interval = minInt;
  nextInterval = minInt;
} else if (state.burst_remaining > 0) {
  // Still in burst window
  state.burst_remaining -= 1;
  state.current_interval = minInt;
  nextInterval = minInt;
} else {
  // Quiet: ramp up toward maxInt
  const ramped = round5(state.current_interval * 1.5);
  nextInterval = Math.min(maxInt, ramped);
  state.current_interval = nextInterval;
}

writeState(state);
console.log(String(nextInterval));
