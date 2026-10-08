# ⚡ OpenAPI → Zod Generator

> **Correctness-first** OpenAPI → Zod/TypeScript code generator. 100% client-side — your API spec never leaves your browser.

**Live:** https://openapi-zod-generator.pages.dev

![Tests](https://img.shields.io/badge/tests-57%20passing-brightgreen)
![npm](https://img.shields.io/npm/v/openapi-zod-gen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Hosting](https://img.shields.io/badge/hosting-Cloudflare%20Pages-orange)

Paste an OpenAPI spec (YAML or JSON), press **Generate** (or `Ctrl + ↵`), and get production-ready code in six formats — with the edge cases other generators get wrong, done right.

## What you get

| Output | Tab | What it's for |
|--------|-----|---------------|
| **Zod schemas** | `Zod Schemas` | Runtime validation that actually matches your spec — formats, enums, constraints preserved |
| **TypeScript types** | `Types` | `z.infer` types, always in sync with the schemas |
| **React Hook Form resolvers** | `RHF Resolvers` | Forms that enforce the same rules as your API |
| **TanStack Query hooks** | `TanStack Query` | Typed `useQuery`/`useMutation` per operation |
| **MSW handlers** | `MSW Handlers` | Mock endpoints with realistic faker-driven responses |
| **Faker generators** | `Faker` | Test-data factories for every component schema |

## Why this generator

| Feature | Other generators | **This one** |
|---------|-----------------|--------------|
| Discriminated unions | ⚠️ Lossy `z.union()` | ✅ Real `z.discriminatedUnion()` |
| String formats | ⚠️ Some dropped | ✅ `uuid`, `email`, `date-time`, `date`, `time`, `uri`, `ipv4/6`, `.regex()` |
| Recursive refs | ❌ Often stack-overflows | ✅ `z.lazy()` |
| `multipleOf` / `uniqueItems` | ❌ Ignored | ✅ `.multipleOf()` / `.unique()` |
| Output determinism | ⚠️ Varies per run | ✅ Same input → identical output, every time |
| Privacy | ❌ Spec sent to a server | ✅ 100% client-side |

## Using it

**Hosted (recommended):** open https://openapi-zod-generator.pages.dev — an in-app guide at the top explains the three steps (paste → generate → copy) and shows everything the tool can output.

The layout is centered and fully responsive: on phones the workspace stacks into comfortable full-height editors, on desktop it's a side-by-side split dashboard.

**Keyboard shortcut:** `Ctrl + ↵` (or `⌘ + ↵` on Mac) generates from anywhere on the page.

**File input:** click the ⬆ upload button or drag a `.yaml` / `.yml` / `.json` file straight onto the input panel.

**Shareable links:** click 🔗 to copy a URL that opens your exact spec — the spec is deflate-compressed into the URL hash, so nothing touches a server and recipients see results instantly (the page auto-generates on load).

**Download everything:** the **Download all** button packs every generated file into a single `openapi-zod-generated.zip` (schemas.ts, types.ts, resolvers.ts, hooks.ts, handlers.ts, fakers.ts).

**Helpful errors:** invalid YAML is reported with line and column numbers, e.g. `Invalid YAML at line 3, column 11: …`.

**Strict Mode** (on by default): objects emit `.strict()` so unknown keys are rejected at runtime. Turn it off for OpenAPI-default permissive objects.

**Paste-and-compile output:** every file starts with the imports it needs (`zod`, `./schemas`, `@hookform/resolvers`, `@tanstack/react-query`, `msw`, `@faker-js/faker`), schemas are pretty-printed across multiple lines, and a stats line reports `schemas · operations · ms` after each generation.

**Theme:** dark by default; toggle in the header (persisted per browser).

### Example

**Input:**
```yaml
Pet:
  type: object
  required: [id, name, type, status]
  properties:
    id: { type: string, format: uuid }
    name: { type: string, minLength: 1, maxLength: 100 }
    type: { type: string, enum: [dog, cat, bird, fish] }
    status: { type: string, enum: [available, pending, sold], default: available }
```

**Output (Zod Schemas tab):**
```typescript
export const Pet = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(["dog", "cat", "bird", "fish"]),
  status: z.enum(["available", "pending", "sold"]).default("available"),
})

export type Pet = z.infer<typeof Pet>
```

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run test     # 57 tests (generator + parser + diff + license keys)
npm run build    # static export → out/
node cli/build.mjs  # build the zero-dependency CLI → cli/dist/index.js
```

The build output in `out/` is a pure static site — host it anywhere (Cloudflare Pages, Netlify, GitHub Pages, a USB stick).

## CLI

The same generator ships as a terminal tool — free generation, plus **breaking-change detection** as the Pro feature:

```bash
npx openapi-zod-gen ./openapi.yaml -o ./src/generated --all
npx openapi-zod-gen diff ./specs/v1.yaml ./specs/v2.yaml   # exit 1 on breaking changes → CI-ready
```

**Pro license — $39 one-time** (lifetime updates, no subscriptions): full diff reports unlocked with an offline-validated license key. Pay with **USDT (BEP-20)** at the [checkout page](https://openapi-zod-generator.pages.dev/pro) — key delivered within 24h. Card payments available on request.

See [`cli/README.md`](./cli/README.md) for all options, CI usage and licensing details.

## Architecture

```
src/
├── app/
│   ├── globals.css        # Design tokens (light + dark themes)
│   ├── icon.svg           # Favicon — gradient bolt
│   ├── layout.tsx         # Fonts, SEO/OG metadata, theme init script
│   ├── page.tsx           # The entire generator UI
│   └── pro/               # "Get Pro" checkout page (USDT BEP-20 + license flow)
├── components/
│   └── Editor.tsx         # Monaco wrapper + output tab strip
├── lib/
│   ├── generator.ts       # Core: OpenAPI → Zod/RHF/TanStack/MSW/Faker
│   ├── generator.test.ts  # 30 tests (formats, unions, refs, hooks, allOf…)
│   ├── parseSpec.ts       # Client-side YAML/JSON parsing + line-numbered errors
│   └── parseSpec.test.ts  # 6 parser tests
└── test/
    └── setup.ts
cli/                       # openapi-zod-gen — npm CLI (generate + diff)
launch/                    # Launch materials (post drafts, og-image source)
out/                       # Committed static build (Cloudflare serves this)
```

**Design system:** every color token, component, state and interaction is documented in [DESIGN.md](./DESIGN.md). **Full user guide:** [the docs page](https://openapi-zod-generator.pages.dev/docs). **Changelog:** [CHANGELOG.md](./CHANGELOG.md).

## Tech stack

- **Next.js 14** (App Router, static export — no server)
- **TypeScript** strict
- **Tailwind CSS** with HSL design tokens (dark/light)
- **Monaco Editor** for input + output
- **Vitest** for the 19-test suite
- **`yaml`** for spec parsing

## Status

**Stable and shipped.** The web tool and CLI generation are free forever; the Pro license ($39 one-time) unlocks breaking-change reports. Release history: [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
