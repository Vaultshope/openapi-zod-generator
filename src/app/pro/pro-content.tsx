'use client'

/**
 * The "Get Pro" page — crypto-first checkout for the CLI's Pro license.
 *
 * Flow (fully static, no server):
 *   buyer sends USDT (BEP-20) → emails the TXID → maintainer verifies on
 *   BscScan → maintainer issues an offline license key (cli/gen-license.mjs)
 *   → buyer unlocks full diff reports with --license.
 */

import { useEffect, useState } from 'react'
import {
  Zap, Github, Sun, Moon, Copy, Check, ShieldCheck, AlertTriangle,
  Infinity as InfinityIcon, Lock, ArrowLeft, Mail, Clock,
} from 'lucide-react'
import { clsx } from 'clsx'

/* ── Maintainer config — ⚠️ verify the wallet address character by character
   before shipping; crypto transfers are irreversible. ───────────────────── */
const USDT_BEP20_ADDRESS = '0x56da8226d5a0e833e91ca4b3614be0b4e5b34b6b'
const CONTACT_EMAIL = 'thinkedover@gmail.com' // change if you use another inbox
const PRICE_USDT = 39

export function ProContent() {
  /* Theme: inherit the stored preference (same logic as the main page) */
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

  const [copied, setCopied] = useState(false)
  const copyAddress = async () => {
    await navigator.clipboard.writeText(USDT_BEP20_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header (compact version of the main site's) ─────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              OpenAPI <span className="text-muted-foreground">→</span>{' '}
              <span className="text-gradient">Zod</span> Generator
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
        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Lock className="h-3 w-3" /> Pro license
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Breaking-change reports, <span className="text-gradient">unlocked</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The CLI's <code className="rounded bg-muted px-1.5 py-0.5 text-xs">diff</code> command
            detects what an API release breaks. Summaries and CI exit codes are free forever —
            Pro unlocks the full report.
          </p>
        </div>

        {/* ── Price + includes ──────────────────────────────── */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free forever</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                'All 6 generator outputs (Zod, types, RHF, hooks, MSW, Faker)',
                'diff summaries: breaking / non-breaking / added counts',
                'CI-ready exit codes (fail the build on breaking changes)',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-primary/40 bg-card p-5 shadow-md shadow-indigo-500/10">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pro</p>
              <p className="text-3xl font-bold">
                ${PRICE_USDT}
                <span className="text-sm font-medium text-muted-foreground"> one-time</span>
              </p>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                'Full human-readable breaking-change report',
                'Machine-readable JSON output',
                'Lifetime updates — no subscriptions',
                'Priority email support',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Crypto checkout ───────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Pay with USDT</h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">BEP-20</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-[auto,1fr] sm:items-center">
            {/* QR */}
            <div className="mx-auto rounded-xl border border-border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wallet-qr.png" alt="USDT BEP-20 wallet address QR code" width={160} height={160} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Wallet address (BNB Smart Chain)
              </p>
              <button
                onClick={copyAddress}
                className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:border-primary/40"
                title="Copy wallet address"
              >
                <code className="min-w-0 flex-1 break-all font-mono text-xs sm:text-sm">{USDT_BEP20_ADDRESS}</code>
                {copied ? (
                  <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
              </button>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-relaxed">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <p>
                  <strong>BEP-20 only.</strong> Send USDT on the BNB Smart Chain (BSC). Funds sent
                  on other networks (ERC-20, TRC-20…) <strong>cannot be recovered</strong>. Send
                  exactly <strong>{PRICE_USDT} USDT</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: 'Send the payment',
                desc: `Transfer ${PRICE_USDT} USDT (BEP-20) to the address above from your wallet or exchange.`,
              },
              {
                title: 'Grab your TXID',
                desc: 'Find the transaction hash on bscscan.com (or in your wallet’s history).',
              },
              {
                title: 'Email it over',
                desc: `Send the TXID to ${CONTACT_EMAIL} — mention “Pro license”.`,
              },
              {
                title: 'Get your key',
                desc: 'Within 24h you receive a PRO-xxxx key — run diff with --license to unlock reports.',
              },
            ].map((step, i) => (
              <li key={step.title} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Key delivered within 24 hours
            </span>
            <span className="inline-flex items-center gap-1.5">
              <InfinityIcon className="h-3.5 w-3.5" /> One-time payment · lifetime updates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Questions? {CONTACT_EMAIL}
            </span>
          </div>
        </div>

        {/* ── How the key works ─────────────────────────────── */}
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Using your key</p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-card p-3 font-mono text-xs text-foreground">
{`openapi-zod-gen diff ./old.yaml ./new.yaml --license PRO-xxxxxxxx-xxxx
# or set it once:  export OPENAPI_ZOD_GEN_LICENSE=PRO-xxxxxxxx-xxxx`}
          </pre>
          <p className="mt-3">
            The license is validated offline — no account, no phone-home, works in air-gapped CI.
            Prefer paying by card? Reach out and we'll sort something out.
            Full docs at <a href="/docs" className="rounded font-medium text-foreground underline decoration-primary/50 hover:decoration-primary">openapi-zod-generator.pages.dev/docs</a>.
          </p>
        </div>
      </main>

      <footer className="border-t border-border py-5">
        <div className="mx-auto w-full max-w-4xl px-4 text-center text-sm text-muted-foreground">
          100% client-side tool — <a href="/" className="rounded text-foreground hover:underline">back to the generator</a>
        </div>
      </footer>
    </div>
  )
}
