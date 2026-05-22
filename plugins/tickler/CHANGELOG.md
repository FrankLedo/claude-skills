# Changelog

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
