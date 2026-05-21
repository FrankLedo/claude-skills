#!/usr/bin/env node
'use strict';

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
process.stdout.write((tz || 'UTC') + '\n');
