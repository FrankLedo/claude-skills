# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
