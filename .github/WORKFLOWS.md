# Release Workflows

## How Releases Work

Releases are fully automated via **GitHub Actions + Release Please**. There are no manual version bumps or CHANGELOG edits — the toolchain handles all of it.

### The Flow

1. A PR is merged to `main` with a conventional commit title.
2. The `Release` workflow (`.github/workflows/release-please.yml`) runs Release Please.
3. Release Please opens (or updates) a per-plugin release PR with version bumps and CHANGELOG entries.
4. When that release PR is merged, Release Please creates a GitHub Release and tag.

### Conventional Commits

PR titles must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec. The `amannn/action-semantic-pull-request` check enforces this on every PR.

**Format:** `<type>(<scope>): <description>`

| Type | Version bump | Example |
|---|---|---|
| `feat` | minor | `feat(tickler): add burst mode after activity` |
| `fix` | patch | `fix(slack-monitor): clamp stale last_scan epoch` |
| `feat!` | major | `feat!(tickler)!: breaking config schema change` |
| `chore`, `docs`, `refactor` | none | `chore: update WORKFLOWS.md` |

### Plugin Scopes

Each plugin has its own release stream. The commit **scope** determines which plugin's version is bumped:

| Scope | Plugin package | CHANGELOG |
|---|---|---|
| `slack-monitor` | `plugins/slack-monitor` | `plugins/slack-monitor/CHANGELOG.md` |
| `tickler` | `plugins/tickler` | `plugins/tickler/CHANGELOG.md` |

Commits without a plugin scope (e.g., `chore: ...`) don't trigger any release.

### Config Files

| File | Purpose |
|---|---|
| `release-please-config.json` | Per-plugin package definitions, changelog paths, version file paths |
| `.release-please-manifest.json` | Current version for each plugin package |
| `.github/workflows/release-please.yml` | GitHub Actions workflow that runs Release Please on push to main |

## Adding a New Plugin

When adding a new plugin to this repo:

1. Add a new entry in `release-please-config.json` under `packages`:
   ```json
   "plugins/<plugin-name>": {
     "release-type": "simple",
     "changelog-path": "plugins/<plugin-name>/CHANGELOG.md",
     "bump-minor-pre-major": true,
     "bump-patch-for-minor-pre-major": true,
     "extra-files": [
       {
         "type": "json",
         "path": "plugins/<plugin-name>/.claude-plugin/plugin.json",
         "jsonpath": "$.version"
       }
     ]
   }
   ```

2. Add the starting version in `.release-please-manifest.json`:
   ```json
   "plugins/<plugin-name>": "0.1.0"
   ```

3. Create `plugins/<plugin-name>/CHANGELOG.md` with just the header — Release Please will populate it.

## Versioning Strategy

- Versions start at `0.1.0` for new plugins.
- Versions below `1.0.0` use `bump-minor-pre-major: true` so `feat:` bumps the minor (0.x.0 → 0.y.0) and `fix:` bumps the patch (0.x.y → 0.x.z). A breaking change (`feat!:`) bumps the major.
- Each plugin is versioned independently. A tickler release does not bump slack-monitor.

## Historical Note

Before this setup, all plugins shared a single version under the root `.` package. The root `CHANGELOG.md` contains history up to `v0.3.5`. Per-plugin CHANGELOGs begin from the version at the time of separation (`0.3.5`).
