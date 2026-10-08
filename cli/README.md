# openapi-zod-gen

![npm](https://img.shields.io/npm/v/openapi-zod-gen) ![license](https://img.shields.io/npm/l/openapi-zod-gen)

Correctness-first OpenAPI → Zod/TypeScript generator for your terminal. Free code generation; **breaking-change detection** as the Pro feature.

- 🌐 Web tool: https://openapi-zod-generator.pages.dev
- 📖 Documentation: https://openapi-zod-generator.pages.dev/docs
- 💻 Source (MIT): https://github.com/Vaultshope/openapi-zod-generator

Requires **Node 18+**. Zero runtime dependencies — works offline.

## Install & quick start

```bash
npx openapi-zod-gen ./openapi.yaml              # try it instantly, no install
npm i -g openapi-zod-gen                        # or install globally
openapi-zod-gen ./openapi.yaml -o ./src/generated --all
```

## Generate (free)

```bash
openapi-zod-gen <spec.yaml> [options]

  -o, --output <dir>   output directory        (default: ./generated)
  --all                every output file
  --msw / --faker      enable those outputs individually
  --no-strict          permissive objects (OpenAPI default)
  --stdout              print instead of writing files
  --watch               regenerate on spec change
```

Writes `schemas.ts`, `types.ts`, `resolvers.ts`, `hooks.ts` (plus `handlers.ts` / `fakers.ts` when enabled) — each with import headers so they compile standalone. Same 57-test core as the [web UI](https://openapi-zod-generator.pages.dev). OpenAPI **3.0 + 3.1** supported, including `type: ["string", "null"]` arrays, `allOf` inheritance merging, discriminated unions and recursive `$ref`s.

## Breaking-change detection (Pro)

```bash
openapi-zod-gen diff ./specs/v1.yaml ./specs/v2.yaml --license <key>
```

```
Comparing v1.yaml → v2.yaml

BREAKING (4):
  ✖ Post.title: minLength raised from 1 to 3
  ✖ Post.status: enum value 'published' was removed
  ...
4 breaking changes — this release WILL break API consumers.
```

- **Exit code 1** when breaking changes exist → drop it straight into CI
- `--json` for machine-readable output, `--no-fail` to always exit 0
- License via `--license <key>` or the `OPENAPI_ZOD_GEN_LICENSE` env variable
- Without a license, `diff` runs in **preview mode**: counts, the first finding, and
  CI exit codes (still enough to gate a build). The full report is the Pro product.

## Buying a license

**USDT (BEP-20) — crypto:** send **39 USDT** on the BNB Smart Chain to the address at
[openapi-zod-generator.pages.dev/pro](https://openapi-zod-generator.pages.dev/pro), email
your TXID, receive a `PRO-xxxxxxxx-xxxx` key within 24h. Validated **offline** — works in
air-gapped CI. (Card payments may be added later.)

Questions? Open an issue on [GitHub](https://github.com/Vaultshope/openapi-zod-generator/issues).

## License

MIT
