# Changelog

## [0.5.0](https://github.com/FrankLedo/claude-skills/compare/tickler-v0.4.9...tickler-v0.5.0) (2026-06-09)


### ⚠ BREAKING CHANGES

* **tickler:** replace CronCreate with ScheduleWakeup — eliminates perpetual Working state ([#104](https://github.com/FrankLedo/claude-skills/issues/104))
* **tickler:** merge tickler.json + state.json into single file, add state API script ([#49](https://github.com/FrankLedo/claude-skills/issues/49))

### Features

* **tickler:** adaptive check interval — burst mode after activity, back off when quiet ([#75](https://github.com/FrankLedo/claude-skills/issues/75)) ([608a357](https://github.com/FrankLedo/claude-skills/commit/608a357888465956abfa3aa505816a2e40e90309)), closes [#72](https://github.com/FrankLedo/claude-skills/issues/72)
* **tickler:** add `shell` tier-1 verb for direct shell command execution ([#90](https://github.com/FrankLedo/claude-skills/issues/90)) ([84fcd92](https://github.com/FrankLedo/claude-skills/commit/84fcd92aca1edf7db5bf76b7babf2fa7fe92cc2e)), closes [#89](https://github.com/FrankLedo/claude-skills/issues/89)
* **tickler:** add claude-resume-bg and claude-resume action verbs ([#125](https://github.com/FrankLedo/claude-skills/issues/125)) ([#126](https://github.com/FrankLedo/claude-skills/issues/126)) ([71ba606](https://github.com/FrankLedo/claude-skills/commit/71ba6068ed2952130b4338e74cff47b83d876ca9))
* **tickler:** add new-subtask condition for Jira items ([#56](https://github.com/FrankLedo/claude-skills/issues/56)) ([9c6423f](https://github.com/FrankLedo/claude-skills/commit/9c6423fd1d3e628bac401075c6c90d76af84064e))
* **tickler:** add notify.js script path — eliminate agent for qualifying cycles ([#102](https://github.com/FrankLedo/claude-skills/issues/102)) ([66af9bc](https://github.com/FrankLedo/claude-skills/commit/66af9bc84a598c0c9484061566c7afaacc3b4c3d))
* **tickler:** add notifyInput setting for push alerts when input is needed ([#99](https://github.com/FrankLedo/claude-skills/issues/99)) ([c70bfea](https://github.com/FrankLedo/claude-skills/commit/c70bfea154ec685c570103de4583a2171e3abc28))
* **tickler:** add test suite with extracted conditions module ([#120](https://github.com/FrankLedo/claude-skills/issues/120)) ([c392a20](https://github.com/FrankLedo/claude-skills/commit/c392a20d2310d643ef9cab3f3fec61b0e8f94da3))
* **tickler:** add Todoist actions via isolated Haiku sub-agent ([#114](https://github.com/FrankLedo/claude-skills/issues/114)) ([71d6238](https://github.com/FrankLedo/claude-skills/commit/71d6238ae028e7e01c18a2f05e5e7c9d6f7d0476))
* **tickler:** add update-item command to state.js ([#141](https://github.com/FrankLedo/claude-skills/issues/141)) ([c790138](https://github.com/FrankLedo/claude-skills/commit/c790138dbeb78e597a17e1200ec8122cefece971))
* **tickler:** auto-remove merged/closed PRs from watch list ([#52](https://github.com/FrankLedo/claude-skills/issues/52)) ([904b17e](https://github.com/FrankLedo/claude-skills/commit/904b17e18701db8eb644d975c1dfc88b5bebb2f6))
* **tickler:** check.js saves state directly, eliminating updated_states round-trip ([#64](https://github.com/FrankLedo/claude-skills/issues/64)) ([74f540f](https://github.com/FrankLedo/claude-skills/commit/74f540f33af195a9f5bf501f01e7f99f6c6dca53)), closes [#63](https://github.com/FrankLedo/claude-skills/issues/63)
* **tickler:** ci-passed/ci-failed conditions + README recipes ([#77](https://github.com/FrankLedo/claude-skills/issues/77)) ([53d5f25](https://github.com/FrankLedo/claude-skills/commit/53d5f2529a76c916e3fafb7eeb85f710d6e0b9b4))
* **tickler:** interactive action verb — menu + free-form conversation on trigger ([#83](https://github.com/FrankLedo/claude-skills/issues/83)) ([e61abc2](https://github.com/FrankLedo/claude-skills/commit/e61abc2abb2fd553f19943a579722b99957fc21f))
* **tickler:** merge tickler.json + state.json into single file, add state API script ([#49](https://github.com/FrankLedo/claude-skills/issues/49)) ([1eef439](https://github.com/FrankLedo/claude-skills/commit/1eef4394ddd48b312db61c3f1f00dc053081c1c2))
* **tickler:** per-item action hooks fire when watched conditions trigger ([#58](https://github.com/FrankLedo/claude-skills/issues/58)) ([095515e](https://github.com/FrankLedo/claude-skills/commit/095515e7faf33d54e0fadb6fe86a447fd61d3e50))
* **tickler:** replace CronCreate with ScheduleWakeup — eliminates perpetual Working state ([#104](https://github.com/FrankLedo/claude-skills/issues/104)) ([f766d9a](https://github.com/FrankLedo/claude-skills/commit/f766d9a5b739af3eb1e5a95257ed96307a221c64))
* **tickler:** skip agent on no-change cycles, use haiku, auto-remove closed issues ([#73](https://github.com/FrankLedo/claude-skills/issues/73)) ([ddf794d](https://github.com/FrankLedo/claude-skills/commit/ddf794d977c3dc9be19dd2c71709429001bd22ff))
* **tickler:** surface changed_urls in MONITOR_SUMMARY and add openInBrowser option ([#53](https://github.com/FrankLedo/claude-skills/issues/53)) ([9eb82da](https://github.com/FrankLedo/claude-skills/commit/9eb82da08fe03bf135f1fb0d33ec5b3834de3cc0))


### Bug Fixes

* correct release-please paths — strip package prefix from changelog-path and extra-files ([#87](https://github.com/FrankLedo/claude-skills/issues/87)) ([54bf7c4](https://github.com/FrankLedo/claude-skills/commit/54bf7c481b1ca52303c314236321b12cae298118))
* **tickler:** evaluate each action's `on` independently so condition:any items fire specific triggers ([#85](https://github.com/FrankLedo/claude-skills/issues/85)) ([92fd813](https://github.com/FrankLedo/claude-skills/commit/92fd8135b5edd228d20a9e8f9a6cbe898ee72f76))
* **tickler:** fall back to immediate merge when auto-merge is disabled ([#123](https://github.com/FrankLedo/claude-skills/issues/123)) ([b01b5b1](https://github.com/FrankLedo/claude-skills/commit/b01b5b1e22572be2db6b090e05e76b2ab5d2306c))
* **tickler:** fold adaptive-interval into check.js, pass changed[] via temp file, fix syntax error ([#108](https://github.com/FrankLedo/claude-skills/issues/108)) ([67a296d](https://github.com/FrankLedo/claude-skills/commit/67a296d1f5a3bf110a857e7d874c2892e5424b4a))
* **tickler:** make remove-item and append-fired-action idempotent; fix stop-sentinel check syntax ([#118](https://github.com/FrankLedo/claude-skills/issues/118)) ([3fb6ca0](https://github.com/FrankLedo/claude-skills/commit/3fb6ca09b7181cf73b6afa08e3b3c3111a914a60))
* **tickler:** reduce monitor agent token overhead — closes [#94](https://github.com/FrankLedo/claude-skills/issues/94), [#95](https://github.com/FrankLedo/claude-skills/issues/95), [#96](https://github.com/FrankLedo/claude-skills/issues/96) ([#97](https://github.com/FrankLedo/claude-skills/issues/97)) ([b35a0da](https://github.com/FrankLedo/claude-skills/commit/b35a0da81e07ba2b2b1bd3d8ff9fc57e2721d242))
* **tickler:** replace haiku check agent with deterministic Node.js script ([#55](https://github.com/FrankLedo/claude-skills/issues/55)) ([a93f6a7](https://github.com/FrankLedo/claude-skills/commit/a93f6a7e0c5a4a814373c30333ca037981959aff))
* **tickler:** reschedule cron when run fires significantly late ([#54](https://github.com/FrankLedo/claude-skills/issues/54)) ([e6e6db2](https://github.com/FrankLedo/claude-skills/commit/e6e6db277ab2860666530f8948243e60b98d3a00))
* **tickler:** resolve env: token prefix in check.js and fetch scripts ([#62](https://github.com/FrankLedo/claude-skills/issues/62)) ([cc9e73d](https://github.com/FrankLedo/claude-skills/commit/cc9e73de9091e4f0e04c0a1386e8a28203b4d79c))
* **tickler:** run date command for current_time instead of inferring it ([#51](https://github.com/FrankLedo/claude-skills/issues/51)) ([1a0fc1c](https://github.com/FrankLedo/claude-skills/commit/1a0fc1c8ed0600cefd15f5b49a2b8e0489e54fc2))
* **tickler:** skip check.js entirely on out-of-hours wakeups ([#132](https://github.com/FrankLedo/claude-skills/issues/132)) ([879974e](https://github.com/FrankLedo/claude-skills/commit/879974eb7a0d7d4d39ce42b308f01f81fdc5e576)), closes [#130](https://github.com/FrankLedo/claude-skills/issues/130)
* **tickler:** support args.admin on merge action to bypass branch protection ([#81](https://github.com/FrankLedo/claude-skills/issues/81)) ([f94921a](https://github.com/FrankLedo/claude-skills/commit/f94921ad49585a1b64615097e1a342993a86e1e2)), closes [#80](https://github.com/FrankLedo/claude-skills/issues/80)
* **tickler:** track cycle_count, suggest /compact every 10 cycles to manage context growth ([#112](https://github.com/FrankLedo/claude-skills/issues/112)) ([9d85eca](https://github.com/FrankLedo/claude-skills/commit/9d85ecaad7fde00868727346a8b6d1355c39dd9a))
* **tickler:** trust check.js output, inline direct notify, block raw file reads ([#67](https://github.com/FrankLedo/claude-skills/issues/67)) ([e1ec99e](https://github.com/FrankLedo/claude-skills/commit/e1ec99e819007d6dbd33e17d97dd2de92b56440d)), closes [#66](https://github.com/FrankLedo/claude-skills/issues/66)
* trigger release for monitor agent refactor ([c678a6f](https://github.com/FrankLedo/claude-skills/commit/c678a6f59e0304e73ac37ad24651579d702a6005))

## [0.4.9](https://github.com/FrankLedo/claude-skills/compare/v0.4.8...v0.4.9) (2026-06-06)


### Features

* **tickler:** add update-item command to state.js ([#141](https://github.com/FrankLedo/claude-skills/issues/141)) ([c790138](https://github.com/FrankLedo/claude-skills/commit/c790138dbeb78e597a17e1200ec8122cefece971))

## [0.4.8](https://github.com/FrankLedo/claude-skills/compare/v0.4.7...v0.4.8) (2026-05-30)


### Bug Fixes

* **tickler:** skip check.js entirely on out-of-hours wakeups ([#132](https://github.com/FrankLedo/claude-skills/issues/132)) ([879974e](https://github.com/FrankLedo/claude-skills/commit/879974eb7a0d7d4d39ce42b308f01f81fdc5e576)), closes [#130](https://github.com/FrankLedo/claude-skills/issues/130)

## [0.4.7](https://github.com/FrankLedo/claude-skills/compare/v0.4.6...v0.4.7) (2026-05-29)


### Features

* **tickler:** add claude-resume-bg and claude-resume action verbs ([#125](https://github.com/FrankLedo/claude-skills/issues/125)) ([#126](https://github.com/FrankLedo/claude-skills/issues/126)) ([71ba606](https://github.com/FrankLedo/claude-skills/commit/71ba6068ed2952130b4338e74cff47b83d876ca9))

## [0.4.6](https://github.com/FrankLedo/claude-skills/compare/v0.4.5...v0.4.6) (2026-05-28)


### Bug Fixes

* **tickler:** fall back to immediate merge when auto-merge is disabled ([#123](https://github.com/FrankLedo/claude-skills/issues/123)) ([b01b5b1](https://github.com/FrankLedo/claude-skills/commit/b01b5b1e22572be2db6b090e05e76b2ab5d2306c))

## [0.4.5](https://github.com/FrankLedo/claude-skills/compare/v0.4.4...v0.4.5) (2026-05-28)


### Features

* **tickler:** add test suite with extracted conditions module ([#120](https://github.com/FrankLedo/claude-skills/issues/120)) ([c392a20](https://github.com/FrankLedo/claude-skills/commit/c392a20d2310d643ef9cab3f3fec61b0e8f94da3))

## [0.4.4](https://github.com/FrankLedo/claude-skills/compare/v0.4.3...v0.4.4) (2026-05-28)


### Bug Fixes

* **tickler:** make remove-item and append-fired-action idempotent; fix stop-sentinel check syntax ([#118](https://github.com/FrankLedo/claude-skills/issues/118)) ([3fb6ca0](https://github.com/FrankLedo/claude-skills/commit/3fb6ca09b7181cf73b6afa08e3b3c3111a914a60))

## [0.4.3](https://github.com/FrankLedo/claude-skills/compare/v0.4.2...v0.4.3) (2026-05-27)


### Features

* **tickler:** add Todoist actions via isolated Haiku sub-agent ([#114](https://github.com/FrankLedo/claude-skills/issues/114)) ([71d6238](https://github.com/FrankLedo/claude-skills/commit/71d6238ae028e7e01c18a2f05e5e7c9d6f7d0476))

## [0.4.2](https://github.com/FrankLedo/claude-skills/compare/v0.4.1...v0.4.2) (2026-05-22)


### Bug Fixes

* **tickler:** track cycle_count, suggest /compact every 10 cycles to manage context growth ([#112](https://github.com/FrankLedo/claude-skills/issues/112)) ([9d85eca](https://github.com/FrankLedo/claude-skills/commit/9d85ecaad7fde00868727346a8b6d1355c39dd9a))

## [0.4.1](https://github.com/FrankLedo/claude-skills/compare/v0.4.0...v0.4.1) (2026-05-22)


### Bug Fixes

* **tickler:** fold adaptive-interval into check.js, pass changed[] via temp file, fix syntax error ([#108](https://github.com/FrankLedo/claude-skills/issues/108)) ([67a296d](https://github.com/FrankLedo/claude-skills/commit/67a296d1f5a3bf110a857e7d874c2892e5424b4a))

## [0.4.0](https://github.com/FrankLedo/claude-skills/compare/v0.3.12...v0.4.0) (2026-05-22)


### ⚠ BREAKING CHANGES

* **tickler:** replace CronCreate with ScheduleWakeup — eliminates perpetual Working state ([#104](https://github.com/FrankLedo/claude-skills/issues/104))

### Features

* **tickler:** replace CronCreate with ScheduleWakeup — eliminates perpetual Working state ([#104](https://github.com/FrankLedo/claude-skills/issues/104)) ([f766d9a](https://github.com/FrankLedo/claude-skills/commit/f766d9a5b739af3eb1e5a95257ed96307a221c64))

## [0.3.12](https://github.com/FrankLedo/claude-skills/compare/v0.3.11...v0.3.12) (2026-05-22)


### Features

* **tickler:** add notify.js script path — eliminate agent for qualifying cycles ([#102](https://github.com/FrankLedo/claude-skills/issues/102)) ([66af9bc](https://github.com/FrankLedo/claude-skills/commit/66af9bc84a598c0c9484061566c7afaacc3b4c3d))
* **tickler:** add notifyInput setting for push alerts when input is needed ([#99](https://github.com/FrankLedo/claude-skills/issues/99)) ([c70bfea](https://github.com/FrankLedo/claude-skills/commit/c70bfea154ec685c570103de4583a2171e3abc28))

## [0.3.11](https://github.com/FrankLedo/claude-skills/compare/v0.3.10...v0.3.11) (2026-05-22)


### Bug Fixes

* **tickler:** reduce monitor agent token overhead — closes [#94](https://github.com/FrankLedo/claude-skills/issues/94), [#95](https://github.com/FrankLedo/claude-skills/issues/95), [#96](https://github.com/FrankLedo/claude-skills/issues/96) ([#97](https://github.com/FrankLedo/claude-skills/issues/97)) ([b35a0da](https://github.com/FrankLedo/claude-skills/commit/b35a0da81e07ba2b2b1bd3d8ff9fc57e2721d242))

## [0.3.10](https://github.com/FrankLedo/claude-skills/compare/v0.3.9...v0.3.10) (2026-05-21)


### Features

* **tickler:** interactive action verb — menu + free-form conversation on trigger ([#83](https://github.com/FrankLedo/claude-skills/issues/83)) ([e61abc2](https://github.com/FrankLedo/claude-skills/commit/e61abc2abb2fd553f19943a579722b99957fc21f))

## [0.3.9](https://github.com/FrankLedo/claude-skills/compare/v0.3.8...v0.3.9) (2026-05-21)


### Features

* **tickler:** add `shell` tier-1 verb for direct shell command execution ([#90](https://github.com/FrankLedo/claude-skills/issues/90)) ([84fcd92](https://github.com/FrankLedo/claude-skills/commit/84fcd92aca1edf7db5bf76b7babf2fa7fe92cc2e)), closes [#89](https://github.com/FrankLedo/claude-skills/issues/89)


### Bug Fixes

* correct release-please paths — strip package prefix from changelog-path and extra-files ([#87](https://github.com/FrankLedo/claude-skills/issues/87)) ([54bf7c4](https://github.com/FrankLedo/claude-skills/commit/54bf7c481b1ca52303c314236321b12cae298118))

## [0.3.8](https://github.com/FrankLedo/claude-skills/compare/plugins/tickler-v0.3.7...plugins/tickler-v0.3.8) (2026-05-21)


### Bug Fixes

* **tickler:** evaluate each action's `on` independently so condition:any items fire specific triggers ([#85](https://github.com/FrankLedo/claude-skills/issues/85)) ([92fd813](https://github.com/FrankLedo/claude-skills/commit/92fd8135b5edd228d20a9e8f9a6cbe898ee72f76))
