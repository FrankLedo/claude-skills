# Changelog

## [0.4.0](https://github.com/FrankLedo/claude-skills/compare/slack-monitor-v0.3.7...slack-monitor-v0.4.0) (2026-06-09)


### ⚠ BREAKING CHANGES

* **slack-monitor:** remove self-DM commands feature

### Features

* **slack-monitor:** add state.js script + dispatch monitor agent with haiku model ([#57](https://github.com/FrankLedo/claude-skills/issues/57)) ([096173c](https://github.com/FrankLedo/claude-skills/commit/096173c2f5db3de60086f517058d89e51e407652))
* **slack-monitor:** auto-detect system timezone; add stale-epoch guardrail ([6bb9f6c](https://github.com/FrankLedo/claude-skills/commit/6bb9f6cf28e97a4a7e95e6b2a76cd539939be93b))
* **slack-monitor:** auto-detect system timezone; add stale-epoch guardrail ([06772ed](https://github.com/FrankLedo/claude-skills/commit/06772ed7ebb89b63b8acb117ef82024423043a5e))
* **slack-monitor:** remove self-DM commands feature ([a51b41e](https://github.com/FrankLedo/claude-skills/commit/a51b41e58739bf89058abcdbe244d97f79b1f621))
* **slack-monitor:** replace slack DM review with remote-control queue flow ([a23cf25](https://github.com/FrankLedo/claude-skills/commit/a23cf25b37d278492ff202ce407ef422a4e534cd))


### Bug Fixes

* rename skills/ to plugins/ to match canonical Anthropic layout ([9732b77](https://github.com/FrankLedo/claude-skills/commit/9732b775e63ca8d6fa042c75c2319f5637b2d8c5))
* rename skills/ to plugins/ to match canonical Anthropic layout ([4e9aafa](https://github.com/FrankLedo/claude-skills/commit/4e9aafad346d95026c65d6cb0a225ff0f7267253))
* **slack-monitor:** add explicit timezone config field, closes [#34](https://github.com/FrankLedo/claude-skills/issues/34) ([e28b35f](https://github.com/FrankLedo/claude-skills/commit/e28b35f8fed603873e5477db4884de6b1299cc4f))
* **slack-monitor:** add hook to auto-approve plugin data directory operations ([2bd72ab](https://github.com/FrankLedo/claude-skills/commit/2bd72ab4836b66a37efe2f10324c270b353fa5d4))
* **slack-monitor:** compute epoch by UTC arithmetic, not shell date command, closes [#36](https://github.com/FrankLedo/claude-skills/issues/36) ([c344d62](https://github.com/FrankLedo/claude-skills/commit/c344d627ebd44da54db12e28f1aec06e673210bd))
* **slack-monitor:** move checkpoint clear to parent SKILL.md ([57cd411](https://github.com/FrankLedo/claude-skills/commit/57cd411360f04e103bfc86010dfa77b567430c78))
* **slack-monitor:** prompt injection defenses and scanOnly mode ([fff4357](https://github.com/FrankLedo/claude-skills/commit/fff4357c05ff1f8bedd54348bae1c689776fca94))
* **slack-monitor:** replace Bash rm checkpoint with Write {} null marker ([9083178](https://github.com/FrankLedo/claude-skills/commit/90831786d6547a2f23511c49aabbc3f5f8f267de))
* **slack-monitor:** replace stale cron on work-hours/off-hours transition, closes [#31](https://github.com/FrankLedo/claude-skills/issues/31) ([8aaf02c](https://github.com/FrankLedo/claude-skills/commit/8aaf02cac2625919ede2c10534f8a76b00c32c7c))
* **slack-monitor:** run Slack searches directly in monitor agent ([ff6bd50](https://github.com/FrankLedo/claude-skills/commit/ff6bd50452ebd6a503293e478b168aaca2011e51))
* **slack-monitor:** timestamp validation, API errors, injection guard, resumability ([14082a3](https://github.com/FrankLedo/claude-skills/commit/14082a3004a3f522cd2e35dc4f3aedd27bfe2696))
* **slack-monitor:** use convert-timestamp.js for epoch conversion ([ccef82f](https://github.com/FrankLedo/claude-skills/commit/ccef82f841131a8c2dba6e00e144b9cbe592bd86))
* trigger release for monitor agent refactor ([c678a6f](https://github.com/FrankLedo/claude-skills/commit/c678a6f59e0304e73ac37ad24651579d702a6005))

## Changelog

All notable changes to the slack-monitor plugin are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
