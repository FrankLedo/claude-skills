#!/usr/bin/env node
/**
 * Convert ISO 8601 UTC timestamp to Unix epoch
 * and compute after_date for Slack searches.
 *
 * Usage:
 *   node convert-timestamp.js "2026-03-12T15:46:22Z"
 *
 * Output: JSON with epoch and after_date
 */

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node convert-timestamp.js "ISO-8601-UTC-TIMESTAMP"');
  process.exit(1);
}

const isoTimestamp = args[0];

// Parse ISO 8601 UTC timestamp
const date = new Date(isoTimestamp);
if (isNaN(date.getTime())) {
  console.error(`Error: Invalid timestamp "${isoTimestamp}"`);
  console.error('Expected format: 2026-03-12T15:46:22Z');
  process.exit(1);
}

// Get Unix epoch (seconds)
const epoch = Math.floor(date.getTime() / 1000);

// Compute after_date (one day before for Slack's after: modifier)
const afterDate = new Date(date);
afterDate.setUTCDate(afterDate.getUTCDate() - 1);
const afterDateStr = afterDate.toISOString().split('T')[0]; // YYYY-MM-DD

// Output JSON
console.log(
  JSON.stringify(
    {
      original: isoTimestamp,
      epoch,
      after_date: afterDateStr,
    },
    null,
    2
  )
);
