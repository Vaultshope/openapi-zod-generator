'use client'

/**
 * Public documentation — user guide for the web tool and the CLI.
 * Content-heavy, statically prerendered; client-side only for the theme toggle.
 */

import { useEffect, useState } from 'react'
import { Zap, Github, Sun, Moon, ArrowLeft } from 'lucide-react'

const SECTIONS = [
  { id: 'quickstart', label: 'Quick start' },
  { id: 'web-tool', label: 'Web tool' },
  { id: 'cli', label: 'CLI' },
  { id: 'openapi', label: 'OpenAPI support' },
  { id: 'pro', label: 'Pro & licensing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
]

export function DocsContent() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    setTheme(
      stored === 'light' || stored === 'dark'
        ? stored
        : document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light'
    )
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              OpenAPI <span className="text-muted-foreground">→</span>{' '}
              <span className="text-gradient">Zod</span> Generator — Docs
            </h1>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <a
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" /> Generator
            </a>
            <a
              href="https://github.com/Vaultshope/openapi-zod-generator"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </a>
            <button
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {/* TOC */}
        <nav aria-label="Contents" className="mb-8 flex flex-wrap gap-2">
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* ── Quick start ─────────────────────────────────────── */}
        <section id="quickstart" className="scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">Quick start</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Paste an OpenAPI spec and press Generate. That's the whole product.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Web</p>
              <p className="mt-2 text-sm text-muted-foreground">No install, nothing leaves your browser:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs">open https://openapi-zod-generator.pages.dev</pre>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">CLI</p>
              <p className="mt-2 text-sm text-muted-foreground">Zero dependencies, works offline:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs">npx openapi-zod-gen ./openapi.yaml</pre>
            </div>
          </div>
        </section>

        {/* ── Web tool ────────────────────────────────────────── */}
        <section id="web-tool" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">The web tool</h2>

          <h3 className="mt-5 font-semibold">Getting your spec in</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• <strong className="text-foreground">Paste</strong> YAML or JSON directly</li>
            <li>• <strong className="text-foreground">Upload</strong> — the ⬆ button accepts <code>.yaml / .yml / .json</code></li>
            <li>• <strong className="text-foreground">Drag & drop</strong> a file onto the input panel</li>
            <li>• <strong className="text-foreground">Share links</strong> — 🔗 compresses your spec into the URL; opening such a link auto-generates</li>
          </ul>

          <h3 className="mt-5 font-semibold">Output options</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody className="text-muted-foreground">
                {[
                  ['React Hook Form', 'zodResolver for every schema — forms enforce the same rules as your API', 'on'],
                  ['TanStack Query', 'typed useQuery / useMutation per operation, path params handled', 'on'],
                  ['MSW Handlers', 'mock endpoints with faker-driven responses', 'off'],
                  ['Faker', 'test-data factories per schema', 'off'],
                  ['Strict Mode', 'objects emit .strict() — unknown keys rejected (off = OpenAPI default)', 'on'],
                ].map(([name, desc, def]) => (
                  <tr key={name} className="border-b border-border">
                    <td className="py-2 pr-4 font-medium text-foreground">{name}</td>
                    <td className="py-2 pr-4">{desc}</td>
                    <td className="py-2 whitespace-nowrap">default: {def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 font-semibold">Working with results</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Each tab is a ready-to-paste file with its import headers. Copy per tab,
            download per tab, or <strong className="text-foreground">Download all</strong> for a
            ZIP of every file. After each generation you get a stats line
            (<em>schemas · operations · ms</em>). Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd> + <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> anywhere to regenerate.
          </p>
        </section>

        {/* ── CLI ─────────────────────────────────────────────── */}
        <section id="cli" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">The CLI — openapi-zod-gen</h2>

          <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed">npm i -g openapi-zod-gen
openapi-zod-gen ./openapi.yaml -o ./src/generated --all</pre>

          <h3 className="mt-5 font-semibold">Generate</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody className="text-muted-foreground">
                {[
                  ['-o, --output <dir>', 'output directory (default ./generated)'],
                  ['--all', 'every output file (adds MSW handlers + Faker factories)'],
                  ['--msw / --faker', 'enable those outputs individually'],
                  ['--no-strict', 'permissive objects (OpenAPI default)'],
                  ['--stdout', 'print files instead of writing'],
                  ['--watch', 'regenerate whenever the spec changes'],
                ].map(([flag, desc]) => (
                  <tr key={flag} className="border-b border-border">
                    <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs text-foreground">{flag}</td>
                    <td className="py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 font-semibold">Breaking-change detection</h3>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed">openapi-zod-gen diff ./specs/v1.yaml ./specs/v2.yaml --license PRO-xxxxxxxx-xxxx</pre>
          <p className="mt-2 text-sm text-muted-foreground">
            Classifies every difference as <strong className="text-foreground">breaking</strong>,
            compatible, or added — removed schemas/properties/endpoints, type changes, enum
            shrinkage, newly-required fields, tightened constraints, nullable regressions.
            <strong className="text-foreground"> Exit code 1</strong> when breaking changes exist → CI-ready.
            <code className="ml-1">--json</code> for machines, <code className="ml-1">--no-fail</code> to always exit 0.
            Without a license, diff runs in preview mode (counts, first finding, exit codes).
          </p>
        </section>

        {/* ── OpenAPI support ─────────────────────────────────── */}
        <section id="openapi" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">OpenAPI compatibility</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Both <strong className="text-foreground">3.0.x</strong> and <strong className="text-foreground">3.1</strong> are supported.
            What the generator preserves:
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody className="text-muted-foreground">
                {[
                  ['oneOf / anyOf + discriminator', 'real z.discriminatedUnion() — not a lossy z.union()'],
                  ['allOf: [$ref base, inline extension]', 'merged into a single clean z.object'],
                  ['Circular $refs', 'z.lazy() — no stack overflows'],
                  ['Formats', 'uuid, email, date-time, date, time, uri, ipv4, ipv6, regex patterns'],
                  ['Constraints', 'min/max, lengths, items, multipleOf, uniqueItems, pattern'],
                  ['3.0 nullable: true', '.nullable()'],
                  ['3.1 type: ["string", "null"]', '.nullable()'],
                  ['enum / const', 'z.enum() / z.literal()'],
                  ['default / description', '.default() / .describe()'],
                  ['additionalProperties', 'false → .strict(), schema → .catchall()/typed z.record()'],
                ].map(([spec, zod]) => (
                  <tr key={spec} className="border-b border-border">
                    <td className="py-2 pr-4 text-foreground">{spec}</td>
                    <td className="py-2 font-mono text-xs">{zod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Pro & licensing ─────────────────────────────────── */}
        <section id="pro" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">Pro & licensing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free forever</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• All 6 generator outputs</li>
                <li>• Diff summaries + CI exit codes</li>
                <li>• The entire web tool</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/40 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pro — $39 one-time</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Full human-readable diff report</li>
                <li>• Machine-readable JSON output</li>
                <li>• Lifetime updates, priority support</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Pay with <strong className="text-foreground">USDT (BEP-20)</strong> — address and QR on the{' '}
            <a href="/pro" className="rounded font-medium text-foreground underline decoration-primary/50 hover:decoration-primary">Get Pro page</a>.
            Send 39 USDT on the BNB Smart Chain, email your TXID, receive a{' '}
            <code>PRO-xxxxxxxx-xxxx</code> key within 24h. Keys validate <strong className="text-foreground">entirely offline</strong> —
            no account, works in air-gapped CI:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs">openapi-zod-gen diff old.yaml new.yaml --license PRO-xxxxxxxx-xxxx
# or set once:  export OPENAPI_ZOD_GEN_LICENSE=PRO-xxxxxxxx-xxxx</pre>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <section id="faq" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
          <div className="mt-3 space-y-4 text-sm">
            {[
              ['Is my spec uploaded anywhere?', 'No. The web tool is 100% client-side and the CLI is offline. Shareable links put the compressed spec in the URL itself — there is no server.'],
              ['Is it really free?', 'The web tool and the CLI generation are free forever. Only the detailed diff report is Pro.'],
              ['Is it open source?', 'Yes — MIT. github.com/Vaultshope/openapi-zod-generator. 57 unit tests, E2E-verified against the deployed site.'],
              ['Does one license cover my whole team/machines?', 'Offline keys have no activation limit — use yours on any machine, including CI runners. Please buy one per engineer as a courtesy.'],
              ['Which browsers work?', 'Any modern browser (Chrome, Edge, Firefox, Safari). Mobile fully supported.'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">{q}</p>
                <p className="mt-1 text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Troubleshooting ─────────────────────────────────── */}
        <section id="troubleshooting" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight">Troubleshooting</h2>
          <div className="mt-3 space-y-3 text-sm">
            {[
              ['"Invalid YAML at line X, column Y"', 'Fix the spec at that exact position — the parser reports where it stopped. JSON input works too if YAML keeps fighting you.'],
              ['"missing required fields (openapi, info, paths)"', 'The file parsed but isn\u2019t an OpenAPI document — it needs the openapi version, info and paths top-level keys.'],
              ['"invalid license key (expected format: PRO-xxxxxxxx-xxxx)"', 'Check for typos and stray spaces. Set it via --license or the OPENAPI_ZOD_GEN_LICENSE environment variable.'],
              ['Sent USDT on the wrong network', 'Crypto transfers are irreversible — funds sent on non-BEP-20 networks cannot be recovered. Always confirm BEP-20 before sending.'],
              ['Found a generation bug', 'Open an issue on GitHub with your spec — real-world specs that break the generator are exactly what the project wants.'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="font-semibold">{q}</p>
                <p className="mt-1 text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <a href="/" className="rounded font-medium text-foreground hover:underline">← Back to the generator</a>
          <span className="mx-2">·</span>
          <a href="/pro" className="rounded font-medium text-foreground hover:underline">Get Pro</a>
          <span className="mx-2">·</span>
          <a href="https://github.com/Vaultshope/openapi-zod-generator" target="_blank" rel="noopener noreferrer" className="rounded font-medium text-foreground hover:underline">GitHub</a>
        </footer>
      </main>
    </div>
  )
}
