# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3](https://github.com/FrankLedo/claude-skills/compare/v0.3.2...v0.3.3) (2026-05-21)


### Bug Fixes

* **tickler:** trust check.js output, inline direct notify, block raw file reads ([#67](https://github.com/FrankLedo/claude-skills/issues/67)) ([e1ec99e](https://github.com/FrankLedo/claude-skills/commit/e1ec99e819007d6dbd33e17d97dd2de92b56440d)), closes [#66](https://github.com/FrankLedo/claude-skills/issues/66)

## [0.3.2](https://github.com/FrankLedo/claude-skills/compare/v0.3.1...v0.3.2) (2026-05-21)


### Features

* **tickler:** check.js saves state directly, eliminating updated_states round-trip ([#64](https://github.com/FrankLedo/claude-skills/issues/64)) ([74f540f](https://github.com/FrankLedo/claude-skills/commit/74f540f33af195a9f5bf501f01e7f99f6c6dca53)), closes [#63](https://github.com/FrankLedo/claude-skills/issues/63)

## [0.3.1](https://github.com/FrankLedo/claude-skills/compare/v0.3.0...v0.3.1) (2026-05-21)


### Features

* **slack-monitor:** auto-detect system timezone; add stale-epoch guardrail ([6bb9f6c](https://github.com/FrankLedo/claude-skills/commit/6bb9f6cf28e97a4a7e95e6b2a76cd539939be93b))
* **slack-monitor:** auto-detect system timezone; add stale-epoch guardrail ([06772ed](https://github.com/FrankLedo/claude-skills/commit/06772ed7ebb89b63b8acb117ef82024423043a5e))


### Bug Fixes

* **tickler:** resolve env: token prefix in check.js and fetch scripts ([#62](https://github.com/FrankLedo/claude-skills/issues/62)) ([cc9e73d](https://github.com/FrankLedo/claude-skills/commit/cc9e73de9091e4f0e04c0a1386e8a28203b4d79c))

## [0.3.0](https://github.com/FrankLedo/claude-skills/compare/v0.2.0...v0.3.0) (2026-05-20)


### ⚠ BREAKING CHANGES

* **tickler:** merge tickler.json + state.json into single file, add state API script ([#49](https://github.com/FrankLedo/claude-skills/issues/49))

### Features

* **slack-monitor:** add state.js script + dispatch monitor agent with haiku model ([#57](https://github.com/FrankLedo/claude-skills/issues/57)) ([096173c](https://github.com/FrankLedo/claude-skills/commit/096173c2f5db3de60086f517058d89e51e407652))
* **tickler:** add new-subtask condition for Jira items ([#56](https://github.com/FrankLedo/claude-skills/issues/56)) ([9c6423f](https://github.com/FrankLedo/claude-skills/commit/9c6423fd1d3e628bac401075c6c90d76af84064e))
* **tickler:** auto-remove merged/closed PRs from watch list ([#52](https://github.com/FrankLedo/claude-skills/issues/52)) ([904b17e](https://github.com/FrankLedo/claude-skills/commit/904b17e18701db8eb644d975c1dfc88b5bebb2f6))
* **tickler:** merge tickler.json + state.json into single file, add state API script ([#49](https://github.com/FrankLedo/claude-skills/issues/49)) ([1eef439](https://github.com/FrankLedo/claude-skills/commit/1eef4394ddd48b312db61c3f1f00dc053081c1c2))
* **tickler:** per-item action hooks fire when watched conditions trigger ([#58](https://github.com/FrankLedo/claude-skills/issues/58)) ([095515e](https://github.com/FrankLedo/claude-skills/commit/095515e7faf33d54e0fadb6fe86a447fd61d3e50))
* **tickler:** surface changed_urls in MONITOR_SUMMARY and add openInBrowser option ([#53](https://github.com/FrankLedo/claude-skills/issues/53)) ([9eb82da](https://github.com/FrankLedo/claude-skills/commit/9eb82da08fe03bf135f1fb0d33ec5b3834de3cc0))


### Bug Fixes

* **tickler:** replace haiku check agent with deterministic Node.js script ([#55](https://github.com/FrankLedo/claude-skills/issues/55)) ([a93f6a7](https://github.com/FrankLedo/claude-skills/commit/a93f6a7e0c5a4a814373c30333ca037981959aff))
* **tickler:** reschedule cron when run fires significantly late ([#54](https://github.com/FrankLedo/claude-skills/issues/54)) ([e6e6db2](https://github.com/FrankLedo/claude-skills/commit/e6e6db277ab2860666530f8948243e60b98d3a00))
* **tickler:** run date command for current_time instead of inferring it ([#51](https://github.com/FrankLedo/claude-skills/issues/51)) ([1a0fc1c](https://github.com/FrankLedo/claude-skills/commit/1a0fc1c8ed0600cefd15f5b49a2b8e0489e54fc2))

## [0.2.0](https://github.com/FrankLedo/claude-skills/compare/v0.1.18...v0.2.0) (2026-03-26)


### ⚠ BREAKING CHANGES

* **slack-monitor:** remove self-DM commands feature

### Features

* **slack-monitor:** remove self-DM commands feature ([a51b41e](https://github.com/FrankLedo/claude-skills/commit/a51b41e58739bf89058abcdbe244d97f79b1f621))


### Bug Fixes

* **slack-monitor:** compute epoch by UTC arithmetic, not shell date command, closes [#36](https://github.com/FrankLedo/claude-skills/issues/36) ([c344d62](https://github.com/FrankLedo/claude-skills/commit/c344d627ebd44da54db12e28f1aec06e673210bd))
* **slack-monitor:** replace stale cron on work-hours/off-hours transition, closes [#31](https://github.com/FrankLedo/claude-skills/issues/31) ([8aaf02c](https://github.com/FrankLedo/claude-skills/commit/8aaf02cac2625919ede2c10534f8a76b00c32c7c))
* **slack-monitor:** use convert-timestamp.js for epoch conversion ([ccef82f](https://github.com/FrankLedo/claude-skills/commit/ccef82f841131a8c2dba6e00e144b9cbe592bd86))

## [0.1.18](https://github.com/FrankLedo/claude-skills/compare/v0.1.17...v0.1.18) (2026-03-23)


### Bug Fixes

* **slack-monitor:** add explicit timezone config field, closes [#34](https://github.com/FrankLedo/claude-skills/issues/34) ([e28b35f](https://github.com/FrankLedo/claude-skills/commit/e28b35f8fed603873e5477db4884de6b1299cc4f))
* **slack-monitor:** add hook to auto-approve plugin data directory operations ([2bd72ab](https://github.com/FrankLedo/claude-skills/commit/2bd72ab4836b66a37efe2f10324c270b353fa5d4))
* **slack-monitor:** move checkpoint clear to parent SKILL.md ([57cd411](https://github.com/FrankLedo/claude-skills/commit/57cd411360f04e103bfc86010dfa77b567430c78))
* **slack-monitor:** replace Bash rm checkpoint with Write {} null marker ([9083178](https://github.com/FrankLedo/claude-skills/commit/90831786d6547a2f23511c49aabbc3f5f8f267de))

## [0.1.17](https://github.com/FrankLedo/claude-skills/compare/v0.1.16...v0.1.17) (2026-03-22)


### Features

* **slack-monitor:** replace slack DM review with remote-control queue flow ([a23cf25](https://github.com/FrankLedo/claude-skills/commit/a23cf25b37d278492ff202ce407ef422a4e534cd))


### Bug Fixes

* **slack-monitor:** prompt injection defenses and scanOnly mode ([fff4357](https://github.com/FrankLedo/claude-skills/commit/fff4357c05ff1f8bedd54348bae1c689776fca94))
* **slack-monitor:** timestamp validation, API errors, injection guard, resumability ([14082a3](https://github.com/FrankLedo/claude-skills/commit/14082a3004a3f522cd2e35dc4f3aedd27bfe2696))

## [0.1.16](https://github.com/FrankLedo/claude-skills/compare/v0.1.15...v0.1.16) (2026-03-20)


### Bug Fixes

* **slack-monitor:** run Slack searches directly in monitor agent ([ff6bd50](https://github.com/FrankLedo/claude-skills/commit/ff6bd50452ebd6a503293e478b168aaca2011e51))

## [0.1.15](https://github.com/FrankLedo/claude-skills/compare/v0.1.14...v0.1.15) (2026-03-20)


### Bug Fixes

* trigger release for monitor agent refactor ([c678a6f](https://github.com/FrankLedo/claude-skills/commit/c678a6f59e0304e73ac37ad24651579d702a6005))

## [0.1.14](https://github.com/FrankLedo/claude-skills/compare/v0.1.13...v0.1.14) (2026-03-19)


### Features

* add release automation and slack-monitor skill ([90f4d8c](https://github.com/FrankLedo/claude-skills/commit/90f4d8cad3fefb0be438113e81592ab013342a2b))
* add release automation and slack-monitor skill ([214d00e](https://github.com/FrankLedo/claude-skills/commit/214d00e991e3c32c213cb4147ca49b4411397bad))
* **slack-monitor:** add draftMode flag for Slack draft replies ([c9537d9](https://github.com/FrankLedo/claude-skills/commit/c9537d9c841930fa668a5eee3e7ac7ec187e37d5))
* **tickler:** add tickler skill ([#17](https://github.com/FrankLedo/claude-skills/issues/17)) ([d2d9f1f](https://github.com/FrankLedo/claude-skills/commit/d2d9f1f56eadbd448422472faf28c3e29165d01f))


### Bug Fixes

* add markdownlint config and fix code fence language tags ([f4b3863](https://github.com/FrankLedo/claude-skills/commit/f4b38636c97f789e194f7d682e243d2ac37e3a25))
* add markdownlint config and fix code fence language tags ([6e15e44](https://github.com/FrankLedo/claude-skills/commit/6e15e44da1d251269b748f705c63c519d38faf7d))
* add marketplace.json and correct install instructions ([c7f1b15](https://github.com/FrankLedo/claude-skills/commit/c7f1b15cfdec7179ded5ba1abf409fd0c648bc5b))
* add plugin.json to slack-monitor for per-skill marketplace install ([f00cf84](https://github.com/FrankLedo/claude-skills/commit/f00cf848154ad77f5006f5a9c94ee9f374283395))
* add required name and owner fields to marketplace.json ([a0132fc](https://github.com/FrankLedo/claude-skills/commit/a0132fc8a0d0615de760deb56623bea0d7a78dc9))
* add required name and owner fields to marketplace.json ([36e138a](https://github.com/FrankLedo/claude-skills/commit/36e138a0660101f72c47aaee7f77c95ea00f1139))
* add skill plugin.json files to release-please version tracking ([40c6199](https://github.com/FrankLedo/claude-skills/commit/40c61992413625c689b0b9d9a67ea50a78fa4305))
* add slack-monitor plugin.json to release-please extra-files ([01ba580](https://github.com/FrankLedo/claude-skills/commit/01ba5806e655868b85a76365c6267148b1305539))
* correct skill invocation — /slack-monitor not /fxl:slack-monitor ([865be0d](https://github.com/FrankLedo/claude-skills/commit/865be0d1f2979ac8799b4187bf233555ea8298d0))
* correct skills table link to skills/slack-monitor ([4605a41](https://github.com/FrankLedo/claude-skills/commit/4605a4118f3eb6b1a36f3ea2683fec073f9c2774))
* list skills as individual installable plugins in marketplace ([3c0c3ef](https://github.com/FrankLedo/claude-skills/commit/3c0c3efa6afe843d4b6ce6c7c4220ce947edc8d6))
* remove duplicate tickler entry with old source format ([ef556cc](https://github.com/FrankLedo/claude-skills/commit/ef556cc6034822053c3516148158422bfc4e8268))
* remove trailing comma from marketplace.json ([b35633b](https://github.com/FrankLedo/claude-skills/commit/b35633bb09429d89ec59091401bdcb6875bdcbff))
* rename skills/ to plugins/ to match canonical Anthropic layout ([9732b77](https://github.com/FrankLedo/claude-skills/commit/9732b775e63ca8d6fa042c75c2319f5637b2d8c5))
* rename skills/ to plugins/ to match canonical Anthropic layout ([4e9aafa](https://github.com/FrankLedo/claude-skills/commit/4e9aafad346d95026c65d6cb0a225ff0f7267253))
* simplify marketplace to single fxl plugin entry ([3786689](https://github.com/FrankLedo/claude-skills/commit/3786689968f759f1792702d800ae4dd45b6d2fca))
* **slack-monitor:** complete ${CLAUDE_PLUGIN_DATA} migration — README, templates, SKILL.md ([c82435d](https://github.com/FrankLedo/claude-skills/commit/c82435d1ad9ec7de122c8e319e399c3ccc46c8c5))
* **slack-monitor:** migrate state dir to ${CLAUDE_PLUGIN_DATA} ([1f03c51](https://github.com/FrankLedo/claude-skills/commit/1f03c5150ea7982cdbb3acff99eeca912ae2ee25))
* **slack-monitor:** migrate state dir to ${CLAUDE_PLUGIN_DATA} ([9ab57ab](https://github.com/FrankLedo/claude-skills/commit/9ab57abcad8cdd6821b7118324064790ee8a1865))
* **slack-monitor:** move SETUP.md to workflow/, add security guardrails ([25a79dc](https://github.com/FrankLedo/claude-skills/commit/25a79dc669fb65a3863d4e540028aef50787d8db))
* **slack-monitor:** rename plugins/ back to skills/ for correct plugin discovery ([f06b35e](https://github.com/FrankLedo/claude-skills/commit/f06b35e2f7eaff1445b3a69d689dd35862d3fb7c))
* **slack-monitor:** update remaining ~/.slack-monitor refs missed in initial migration ([f15c01f](https://github.com/FrankLedo/claude-skills/commit/f15c01f93ecd16e4931bff020b20152eec8b7a98))
* **slack-monitor:** use last_scan date (not day before) for after: filter ([#18](https://github.com/FrankLedo/claude-skills/issues/18)) ([385c4f2](https://github.com/FrankLedo/claude-skills/commit/385c4f2256a85bcc70fb117c4a7f7742af47b52a)), closes [#15](https://github.com/FrankLedo/claude-skills/issues/15)
* switch install instructions to claude CLI commands ([ccd4236](https://github.com/FrankLedo/claude-skills/commit/ccd4236604eef1e010c3584b0c7b19b9f339958f))
* **tickler:** add install instructions and strengthen identity guard ([#20](https://github.com/FrankLedo/claude-skills/issues/20)) ([2fde2e1](https://github.com/FrankLedo/claude-skills/commit/2fde2e140ef89003985a65f92a8ae1bee25f93f4))
* use display name in author field across plugin manifests ([2dfe5a2](https://github.com/FrankLedo/claude-skills/commit/2dfe5a2139c2db9b3dc716d2c1f52dc598a3f32a))
* use git-subdir source type for plugin marketplace entries ([a5c2d2f](https://github.com/FrankLedo/claude-skills/commit/a5c2d2fdf1fef6f420085c7419ac5c4a7f3b515d))
* use relative path sources in marketplace.json ([fa403d4](https://github.com/FrankLedo/claude-skills/commit/fa403d4dd600a9fc2bb4dee8cdd58f6975bdb4c5))

## [0.1.13](https://github.com/FrankLedo/claude-skills/compare/v0.1.12...v0.1.13) (2026-03-19)


### Bug Fixes

* use relative path sources in marketplace.json ([fa403d4](https://github.com/FrankLedo/claude-skills/commit/fa403d4dd600a9fc2bb4dee8cdd58f6975bdb4c5))

## [0.1.12](https://github.com/FrankLedo/claude-skills/compare/v0.1.11...v0.1.12) (2026-03-19)


### Bug Fixes

* simplify marketplace to single fxl plugin entry ([3786689](https://github.com/FrankLedo/claude-skills/commit/3786689968f759f1792702d800ae4dd45b6d2fca))

## [0.1.11](https://github.com/FrankLedo/claude-skills/compare/v0.1.10...v0.1.11) (2026-03-19)


### Bug Fixes

* remove trailing comma from marketplace.json ([b35633b](https://github.com/FrankLedo/claude-skills/commit/b35633bb09429d89ec59091401bdcb6875bdcbff))

## [0.1.10](https://github.com/FrankLedo/claude-skills/compare/v0.1.9...v0.1.10) (2026-03-19)


### Bug Fixes

* remove duplicate tickler entry with old source format ([ef556cc](https://github.com/FrankLedo/claude-skills/commit/ef556cc6034822053c3516148158422bfc4e8268))
* use git-subdir source type for plugin marketplace entries ([a5c2d2f](https://github.com/FrankLedo/claude-skills/commit/a5c2d2fdf1fef6f420085c7419ac5c4a7f3b515d))

## [0.1.9](https://github.com/FrankLedo/claude-skills/compare/v0.1.8...v0.1.9) (2026-03-19)


### Bug Fixes

* **tickler:** add install instructions and strengthen identity guard ([#20](https://github.com/FrankLedo/claude-skills/issues/20)) ([2fde2e1](https://github.com/FrankLedo/claude-skills/commit/2fde2e140ef89003985a65f92a8ae1bee25f93f4))

## [0.1.8](https://github.com/FrankLedo/claude-skills/compare/v0.1.7...v0.1.8) (2026-03-19)


### Bug Fixes

* **slack-monitor:** use last_scan date (not day before) for after: filter ([#18](https://github.com/FrankLedo/claude-skills/issues/18)) ([385c4f2](https://github.com/FrankLedo/claude-skills/commit/385c4f2256a85bcc70fb117c4a7f7742af47b52a)), closes [#15](https://github.com/FrankLedo/claude-skills/issues/15)

## [0.1.7](https://github.com/FrankLedo/claude-skills/compare/v0.1.6...v0.1.7) (2026-03-19)


### Features

* **tickler:** add tickler skill ([#17](https://github.com/FrankLedo/claude-skills/issues/17)) ([d2d9f1f](https://github.com/FrankLedo/claude-skills/commit/d2d9f1f56eadbd448422472faf28c3e29165d01f))


### Bug Fixes

* **slack-monitor:** complete ${CLAUDE_PLUGIN_DATA} migration — README, templates, SKILL.md ([c82435d](https://github.com/FrankLedo/claude-skills/commit/c82435d1ad9ec7de122c8e319e399c3ccc46c8c5))
* **slack-monitor:** migrate state dir to ${CLAUDE_PLUGIN_DATA} ([1f03c51](https://github.com/FrankLedo/claude-skills/commit/1f03c5150ea7982cdbb3acff99eeca912ae2ee25))
* **slack-monitor:** migrate state dir to ${CLAUDE_PLUGIN_DATA} ([9ab57ab](https://github.com/FrankLedo/claude-skills/commit/9ab57abcad8cdd6821b7118324064790ee8a1865))
* **slack-monitor:** update remaining ~/.slack-monitor refs missed in initial migration ([f15c01f](https://github.com/FrankLedo/claude-skills/commit/f15c01f93ecd16e4931bff020b20152eec8b7a98))

## [0.1.6](https://github.com/FrankLedo/claude-skills/compare/v0.1.5...v0.1.6) (2026-03-18)


### Features

* **slack-monitor:** add draftMode flag for Slack draft replies ([c9537d9](https://github.com/FrankLedo/claude-skills/commit/c9537d9c841930fa668a5eee3e7ac7ec187e37d5))


### Bug Fixes

* **slack-monitor:** move SETUP.md to workflow/, add security guardrails ([25a79dc](https://github.com/FrankLedo/claude-skills/commit/25a79dc669fb65a3863d4e540028aef50787d8db))

## [0.1.5](https://github.com/FrankLedo/claude-skills/compare/v0.1.4...v0.1.5) (2026-03-18)


### Bug Fixes

* correct skills table link to skills/slack-monitor ([4605a41](https://github.com/FrankLedo/claude-skills/commit/4605a4118f3eb6b1a36f3ea2683fec073f9c2774))

## [0.1.4](https://github.com/FrankLedo/claude-skills/compare/v0.1.3...v0.1.4) (2026-03-17)


### Bug Fixes

* correct skill invocation — /slack-monitor not /fxl:slack-monitor ([865be0d](https://github.com/FrankLedo/claude-skills/commit/865be0d1f2979ac8799b4187bf233555ea8298d0))
* switch install instructions to claude CLI commands ([ccd4236](https://github.com/FrankLedo/claude-skills/commit/ccd4236604eef1e010c3584b0c7b19b9f339958f))

## [0.1.3](https://github.com/FrankLedo/claude-skills/compare/v0.1.2...v0.1.3) (2026-03-17)


### Bug Fixes

* **slack-monitor:** rename plugins/ back to skills/ for correct plugin discovery ([f06b35e](https://github.com/FrankLedo/claude-skills/commit/f06b35e2f7eaff1445b3a69d689dd35862d3fb7c))

## [0.1.2](https://github.com/FrankLedo/claude-skills/compare/v0.1.1...v0.1.2) (2026-03-17)


### Bug Fixes

* rename skills/ to plugins/ to match canonical Anthropic layout ([9732b77](https://github.com/FrankLedo/claude-skills/commit/9732b775e63ca8d6fa042c75c2319f5637b2d8c5))
* rename skills/ to plugins/ to match canonical Anthropic layout ([4e9aafa](https://github.com/FrankLedo/claude-skills/commit/4e9aafad346d95026c65d6cb0a225ff0f7267253))

## [0.1.1](https://github.com/FrankLedo/claude-skills/compare/v0.1.0...v0.1.1) (2026-03-17)


### Features

* add release automation and slack-monitor skill ([90f4d8c](https://github.com/FrankLedo/claude-skills/commit/90f4d8cad3fefb0be438113e81592ab013342a2b))
* add release automation and slack-monitor skill ([214d00e](https://github.com/FrankLedo/claude-skills/commit/214d00e991e3c32c213cb4147ca49b4411397bad))


### Bug Fixes

* add markdownlint config and fix code fence language tags ([f4b3863](https://github.com/FrankLedo/claude-skills/commit/f4b38636c97f789e194f7d682e243d2ac37e3a25))
* add markdownlint config and fix code fence language tags ([6e15e44](https://github.com/FrankLedo/claude-skills/commit/6e15e44da1d251269b748f705c63c519d38faf7d))
* add marketplace.json and correct install instructions ([c7f1b15](https://github.com/FrankLedo/claude-skills/commit/c7f1b15cfdec7179ded5ba1abf409fd0c648bc5b))
* add plugin.json to slack-monitor for per-skill marketplace install ([f00cf84](https://github.com/FrankLedo/claude-skills/commit/f00cf848154ad77f5006f5a9c94ee9f374283395))
* add required name and owner fields to marketplace.json ([a0132fc](https://github.com/FrankLedo/claude-skills/commit/a0132fc8a0d0615de760deb56623bea0d7a78dc9))
* add required name and owner fields to marketplace.json ([36e138a](https://github.com/FrankLedo/claude-skills/commit/36e138a0660101f72c47aaee7f77c95ea00f1139))
* add skill plugin.json files to release-please version tracking ([40c6199](https://github.com/FrankLedo/claude-skills/commit/40c61992413625c689b0b9d9a67ea50a78fa4305))
* add slack-monitor plugin.json to release-please extra-files ([01ba580](https://github.com/FrankLedo/claude-skills/commit/01ba5806e655868b85a76365c6267148b1305539))
* list skills as individual installable plugins in marketplace ([3c0c3ef](https://github.com/FrankLedo/claude-skills/commit/3c0c3efa6afe843d4b6ce6c7c4220ce947edc8d6))
* use display name in author field across plugin manifests ([2dfe5a2](https://github.com/FrankLedo/claude-skills/commit/2dfe5a2139c2db9b3dc716d2c1f52dc598a3f32a))

## [Unreleased]

### Added

- `tickler` skill: watch GitHub PRs, issues, and Jira tickets for
  state changes; self-scheduling background monitor with direct or
  Slack notifications

## [0.1.0] - 2026-03-13

### Added
- Initial plugin scaffold with `fxl` namespace
- `skills/` directory structure
