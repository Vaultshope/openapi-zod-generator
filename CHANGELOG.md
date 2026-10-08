# Changelog

All notable changes to the `openapi-zod-gen` CLI are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## [0.1.2] — 2026-10-09

### Fixed
- **Security:** removed the license signing secret from `cli/README.md` — npm renders
  that file on the package landing page, turning "obfuscation" into copy-paste
  forgery. The secret now lives only in `cli/src/license.ts` and the derived
  published bundle (the documented, accepted trade-off for offline validation).
- `--version` was hardcoded to `0.1.0` and reported the wrong version through
  every bump. It is now injected from `package.json` at build time.
- Help text: replaced stale "Polar license key" wording with the offline key
  format (`PRO-xxxxxxxx-xxxx`).
- Docs: replaced the outdated "free until Polar is configured" claim with the
  actual free/Pro split (preview mode vs. full report).

### Added
- `cli/LICENSE` ships in the npm tarball (MIT).

## [0.1.1] — 2026-10-08

*Tagged only — never published. Folded into 0.1.2.*

### Fixed
- Help text: stale Polar wording in the `--license` flag description and example.

## [0.1.0] — 2026-10-08

Initial release.

### Added
- **Generate** (free): six outputs — Zod schemas, TypeScript types, React Hook
  Form resolvers, TanStack Query hooks, MSW handlers, Faker factories — with
  import headers so every file compiles standalone, multi-line formatting,
  OpenAPI 3.0 + 3.1 support (including `type: ["string", "null"]` arrays),
  strict mode, `--watch`, `--stdout`, zero runtime dependencies.
- **Diff** (Pro): breaking-change detection between two specs — breaking /
  compatible / added classification, human-readable report, `--json` output,
  CI-ready exit codes (1 on breaking changes, `--no-fail` to override).
- **Licensing:** offline `PRO-xxxxxxxx-xxxx` keys (HMAC-signed, air-gapped CI
  friendly) with optional Polar card-payment path.
