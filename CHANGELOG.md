# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [0.1.0] - 2026-03-13

### Added
- Initial plugin scaffold with `fxl` namespace
- `skills/` directory structure
