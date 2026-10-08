'use client'

/**
 * OpenAPI → Zod Generator — main page (and the entire app).
 *
 * Layout anatomy (also documented in DESIGN.md):
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │ Header   logo · tagline · GitHub · theme toggle    │  ← sticky
 *   ├────────────────────────────────────────────────────┤
 *   │ How it works  headline · 3 steps · output chips    │  ← the in-app guide
 *   ├────────────────────────────────────────────────────┤
 *   │ Toolbar  output toggles (switch chips) + kbd hint │
 *   ├──────────────────────────┬─────────────────────────┤
 *   │ Input panel               │ Output panel            │
 *   │ Monaco YAML/JSON editor   │ Tabbed generated code   │  ← centered max-w-7xl,
 *   │ + Generate (Ctrl + ↵)      │ Zod·Types·RHF·Q·MSW·F  │    stacks on mobile
 *   ├──────────────────────────┴─────────────────────────┤
 *   │ Feature cards                                      │
 *   │ Footer                                             │
 *   └────────────────────────────────────────────────────┘
 *
 * Everything runs client-side — see `src/lib/parseSpec.ts` and
 * `src/lib/generator.ts`. Design tokens live in `globals.css`.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { CodeEditor, OutputTabs } from '@/components/Editor'
import { generateFromOpenAPI, type GenerationResult } from '@/lib/generator'
import { parseSpecInput } from '@/lib/parseSpec'
import { zipSync } from 'fflate'
import {
  Send, Loader2, Zap, Shield, Database, Sun, Moon, Github,
  Layers, Repeat, FileText, Code2, Braces, Type, FormInput,
  RefreshCw, Radio, Dices, Upload, Link2, Check, FileArchive, Crown,
} from 'lucide-react'
import { clsx } from 'clsx'

/* ── Pre-loaded example: a compact Pet Store spec that exercises
   every headline feature (formats, enums, constraints, $refs). ── */
const EXAMPLE_OPENAPI = `openapi: 3.1.0
info:
  title: Pet Store API
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: listPets
      summary: List all pets
      responses:
        '200':
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
    post:
      operationId: createPet
      summary: Create a pet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePetRequest'
      responses:
        '201':
          description: Pet created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
  /pets/{petId}:
    get:
      operationId: getPet
      summary: Get a pet by ID
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: A single pet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '404':
          description: Pet not found
components:
  schemas:
    Pet:
      type: object
      required: [id, name, type, status]
      properties:
        id:
          type: string
          format: uuid
          description: Unique identifier
        name:
          type: string
          minLength: 1
          maxLength: 100
        type:
          type: string
          enum: [dog, cat, bird, fish]
        status:
          type: string
          enum: [available, pending, sold]
          default: available
        birthDate:
          type: string
          format: date
        tags:
          type: array
          items:
            type: string
          maxItems: 10
    CreatePetRequest:
      type: object
      required: [name, type]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        type:
          type: string
          enum: [dog, cat, bird, fish]
        birthDate:
          type: string
          format: date
        tags:
          type: array
          items:
            type: string
          maxItems: 10
    ErrorResponse:
      type: object
      properties:
        code:
          type: integer
          format: int32
        message:
          type: string
        details:
          type: object
          additionalProperties:
            type: string
`

/* ── In-app guide content ──────────────────────────────────── */

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Paste your spec',
    desc: 'YAML or JSON, OpenAPI 3.x — the Pet Store example is pre-loaded so you can try it instantly.',
  },
  {
    title: 'Press Generate',
    desc: 'Or hit Ctrl + ↵ anywhere. Toggle exactly the outputs you need in the toolbar below.',
  },
  {
    title: 'Copy & ship',
    desc: 'Every tab is a ready-to-paste file — copy it, share a link to the spec, or download all outputs as a ZIP.',
  },
] as const

const OUTPUT_CHIPS = [
  { icon: Braces, label: 'Zod schemas' },
  { icon: Type, label: 'TypeScript types' },
  { icon: FormInput, label: 'RHF resolvers' },
  { icon: RefreshCw, label: 'TanStack Query hooks' },
  { icon: Radio, label: 'MSW handlers' },
  { icon: Dices, label: 'Faker factories' },
] as const

/* ── Shareable URLs ────────────────────────────────────────────
   The spec travels inside the URL hash: deflate-compressed,
   base64url-encoded. Nothing ever touches a server — the link
   IS the spec. Prefixes: "z" = deflate, "n" = raw (fallback). */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const part: number[] = []
    for (let j = i; j < Math.min(i + chunk, bytes.length); j++) part.push(bytes[j])
    binary += String.fromCharCode.apply(null, part)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64: string): Uint8Array {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function encodeSpecForUrl(spec: string): Promise<string> {
  const bytes = new TextEncoder().encode(spec)
  if (typeof CompressionStream === 'undefined') {
    return 'n' + bytesToBase64Url(bytes)
  }
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  return 'z' + bytesToBase64Url(compressed)
}

async function decodeSpecFromUrl(encoded: string): Promise<string> {
  const prefix = encoded.slice(0, 1)
  const bytes = base64UrlToBytes(encoded.slice(1))
  if (prefix === 'n') return new TextDecoder().decode(bytes)
  if (prefix !== 'z') throw new Error('Unknown encoding')
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
  return await new Response(stream).text()
}

/** Count HTTP operations in the paths object — used for the stats line. */
function countOperations(paths: Record<string, any>): number {
  return Object.values(paths ?? {}).reduce((total: number, methods: any) =>
    total + Object.keys(methods ?? {}).filter(m =>
      ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length, 0)
}

export default function HomePage() {
  /* ── State ───────────────────────────────────────────────── */
  const [inputSpec, setInputSpec] = useState(EXAMPLE_OPENAPI)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [stats, setStats] = useState<{ schemas: number; operations: number; ms: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [options, setOptions] = useState({
    includeReactHookForm: true,
    includeTanStackQuery: true,
    includeMSW: false,
    includeFaker: false,
    strictMode: true,
  })

  /* ── Theme: class-based, persisted, synced with Monaco ──────
     The pre-hydration script in layout.tsx applies the stored
     theme first (no flash); here we read it back into state and
     keep <html> class + localStorage in sync on every change.  */
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

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  /* ── Generation: parse → validate → emit, all client-side ─── */
  const loadFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    const text = await file.text()
    if (text) setInputSpec(text)
  }, [])

  const runGeneration = useCallback((spec: string, opts: typeof options) => {
    if (!spec.trim()) return

    setIsGenerating(true)
    try {
      const parsed = parseSpecInput(spec)
      if (!parsed.ok) {
        setResult({ zodSchemas: '', types: '', errors: [parsed.error], warnings: [] })
        setStats(null)
      } else {
        const started = performance.now()
        const generated = generateFromOpenAPI(parsed.spec, opts)
        const ms = Math.max(1, Math.round(performance.now() - started))
        setResult(generated)
        setStats({
          schemas: Object.keys(parsed.spec.components?.schemas ?? {}).length,
          operations: countOperations(parsed.spec.paths),
          ms,
        })
      }
    } catch (e) {
      console.error('Generation failed:', e)
      setResult({
        zodSchemas: '',
        types: '',
        errors: [`Generation failed: ${e instanceof Error ? e.message : String(e)}`],
        warnings: [],
      })
      setStats(null)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleGenerate = useCallback(() => {
    runGeneration(inputSpec, options)
  }, [inputSpec, options, runGeneration])

  /* ── Shareable URLs: decode #spec=… on load and auto-generate ── */
  useEffect(() => {
    if (!window.location.hash.startsWith('#spec=')) return
    ;(async () => {
      try {
        const spec = await decodeSpecFromUrl(
          decodeURIComponent(window.location.hash.slice('#spec='.length))
        )
        if (!spec.trim()) return
        setInputSpec(spec)
        runGeneration(spec, options)
      } catch {
        /* malformed hash — fall through to the example spec */
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Copy a link that opens this exact spec ─────────────────── */
  const [copiedLink, setCopiedLink] = useState(false)

  const handleShare = useCallback(async () => {
    try {
      const encoded = await encodeSpecForUrl(inputSpec)
      const url = `${window.location.origin}${window.location.pathname}#spec=${encoded}`
      window.history.replaceState(null, '', `#spec=${encoded}`)
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (e) {
      console.error('Could not create share link:', e)
    }
  }, [inputSpec])

  /* ── Download every generated file as a single .zip ─────────── */
  const handleDownloadZip = useCallback(() => {
    if (!result) return
    const files: Record<string, Uint8Array> = {}
    const add = (name: string, content?: string) => {
      if (content && content.trim()) files[name] = new TextEncoder().encode(content)
    }
    add('schemas.ts', result.zodSchemas)
    add('types.ts', result.types)
    add('resolvers.ts', result.reactHookFormResolvers)
    add('hooks.ts', result.tanstackQueryHooks)
    add('handlers.ts', result.mswHandlers)
    add('fakers.ts', result.fakerGenerators)
    if (Object.keys(files).length === 0) return

    const zipped = zipSync(files, { level: 6 })
    const blob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openapi-zod-generated.zip'
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  /* ── Ctrl/⌘ + Enter generates from anywhere ──────────────── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleGenerate()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleGenerate])

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {/* Logo mark — the gradient bolt, mirrors icon.svg */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight tracking-tight sm:text-lg">
                  OpenAPI <span className="text-muted-foreground">→</span>{' '}
                  <span className="text-gradient">Zod</span> Generator
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Correctness-first · discriminated unions, string formats & recursive refs
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5">
              <a
                href="/docs"
                className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
                title="Full documentation"
              >
                Docs
              </a>
              <a
                href="/pro"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Unlock full breaking-change reports in the CLI"
              >
                <Crown className="h-3.5 w-3.5" />
                Get Pro
              </a>
              <a
                href="https://github.com/Vaultshope/openapi-zod-generator"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Github className="h-5 w-5" />
              </a>
              <button
                onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Show the icon of the theme you'd switch TO */}
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main (centered dashboard) ──────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        {/* How it works — the in-app guide */}
        <section
          aria-label="What this tool does and how it works"
          className="mb-5"
        >
          <div className="mx-auto mb-4 max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Turn any OpenAPI spec into{' '}
              <span className="text-gradient">production-ready code</span>
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Paste a spec, press Generate, and copy Zod schemas, TypeScript types, form
              resolvers, query hooks, API mocks and test factories. Everything runs in your
              browser — your spec never leaves your machine.
            </p>
          </div>

          {/* 3 steps: Paste → Generate → Copy */}
          <ol className="grid gap-3 sm:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm"
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* The six outputs, at a glance */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generates
            </span>
            {OUTPUT_CHIPS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* Toolbar — output toggles as switch chips */}
        <section
          aria-label="Output options"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:block">
              Outputs
            </span>
            <Toggle
              label="React Hook Form"
              checked={options.includeReactHookForm}
              onChange={v => setOptions(o => ({ ...o, includeReactHookForm: v }))}
            />
            <Toggle
              label="TanStack Query"
              checked={options.includeTanStackQuery}
              onChange={v => setOptions(o => ({ ...o, includeTanStackQuery: v }))}
            />
            <Toggle
              label="MSW Handlers"
              checked={options.includeMSW}
              onChange={v => setOptions(o => ({ ...o, includeMSW: v }))}
            />
            <Toggle
              label="Faker"
              checked={options.includeFaker}
              onChange={v => setOptions(o => ({ ...o, includeFaker: v }))}
            />
            <Toggle
              label="Strict Mode"
              checked={options.strictMode}
              onChange={v => setOptions(o => ({ ...o, strictMode: v }))}
              title="Objects reject unknown keys unless the spec explicitly allows them"
            />
          </div>
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
            Press <Kbd>Ctrl</Kbd> + <Kbd>↵</Kbd> anywhere to generate
          </p>
        </section>

        {/* Workspace — side-by-side ≥ lg, stacked on mobile */}
        <section className="flex flex-col gap-4 lg:grid lg:h-[calc(100vh-340px)] lg:grid-cols-2">
          {/* Input panel — doubles as a drop zone for .yaml/.json files */}
          <div
            className={clsx(
              'flex h-[60vh] min-h-[420px] flex-col rounded-xl transition-shadow lg:h-full lg:min-h-0',
              dragOver && 'ring-2 ring-ring'
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              loadFile(e.dataTransfer.files?.[0])
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-3 w-3" />
                </span>
                OpenAPI spec
                <span className="hidden font-normal text-muted-foreground sm:inline">
                  (YAML or JSON)
                </span>
              </h2>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  onClick={handleShare}
                  aria-label="Copy shareable link"
                  title="Copy a link that opens this exact spec (the spec travels in the URL — no server involved)"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload spec file"
                  title="Upload a .yaml / .yml / .json file"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Upload className="h-4 w-4" />
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputSpec.trim()}
                  className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-violet-400 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{isGenerating ? 'Generating…' : 'Generate'}</span>
                  <kbd className="ml-1 hidden rounded border-b-2 border-white/20 bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold sm:block">
                    Ctrl ↵
                  </kbd>
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <CodeEditor
                language="yaml"
                value={inputSpec}
                onChange={setInputSpec}
                theme={monacoTheme}
                height="100%"
                minimap
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              className="hidden"
              onChange={e => {
                loadFile(e.target.files?.[0])
                e.target.value = '' // allow re-selecting the same file
              }}
            />
          </div>

          {/* Output panel */}
          <div className="flex h-[60vh] min-h-[420px] flex-col lg:h-full lg:min-h-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Code2 className="h-3 w-3" />
                </span>
                Generated output
              </h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {result && (
                  <button
                    onClick={handleDownloadZip}
                    title="Download every generated file as a .zip"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileArchive className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download all</span>
                  </button>
                )}
                {result && stats && (
                  <span className="text-xs text-muted-foreground" title="Generation stats">
                    {stats.schemas} {stats.schemas === 1 ? 'schema' : 'schemas'} · {stats.operations}{' '}
                    {stats.operations === 1 ? 'operation' : 'operations'} · {stats.ms} ms
                  </span>
                )}
                {result && (result.errors.length > 0 || result.warnings.length > 0) && (
                  <>
                    {result.errors.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <Shield className="h-3 w-3" />
                        {result.errors.length} error{result.errors.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {result.warnings.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        <Database className="h-3 w-3" />
                        {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {result ? <OutputTabs result={result} theme={monacoTheme} /> : <EmptyState />}
          </div>
        </section>

        {/* Feature cards — the "why" in three tiles */}
        <section aria-label="Highlights" className="mt-8 grid animate-fade-in-up gap-4 md:grid-cols-3">
          <FeatureCard
            icon={Layers}
            title="Discriminated unions"
            desc="oneOf/anyOf with a discriminator becomes a real z.discriminatedUnion() — not a lossy z.union()."
          />
          <FeatureCard
            icon={Database}
            title="String formats preserved"
            desc="uuid, email, date-time, date, time, uri, ipv4/6 and regex patterns map to precise Zod refinements."
          />
          <FeatureCard
            icon={Repeat}
            title="Recursive refs"
            desc="Circular schemas resolve with z.lazy() — deep trees generate without stack overflows."
          />
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="mt-8 border-t border-border py-5">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row">
          <p>100% client-side — your API spec never leaves your browser.</p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a
              href="/docs"
              className="inline-flex items-center rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Docs
            </a>
            <span className="hidden sm:inline" aria-hidden>·</span>
            <a
              href="https://github.com/Vaultshope/openapi-zod-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Github className="h-4 w-4" />
              Vaultshope/openapi-zod-generator
            </a>
            <span className="hidden sm:inline" aria-hidden>·</span>
            <span>Built with Next.js, Zod & Monaco</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Small presentational components (documented in DESIGN.md)
   ══════════════════════════════════════════════════════════════ */

/** Pill-style toggle chip with a mini switch. role="switch" for a11y. */
function Toggle({
  label,
  checked,
  onChange,
  title,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  title?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title={title}
      className={clsx(
        'inline-flex cursor-pointer select-none items-center gap-2 rounded-full border py-1.5 pl-2 pr-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
      )}
    >
      <span
        aria-hidden
        className={clsx('relative h-4 w-7 rounded-full transition-colors duration-200', checked ? 'bg-primary' : 'bg-input')}
      >
        <span
          className={clsx(
            'absolute left-0.5 top-0.5 h-3 w-3 rounded-full shadow transition-all duration-200',
            checked ? 'translate-x-3 bg-white' : 'bg-muted-foreground/80'
          )}
        />
      </span>
      {label}
    </button>
  )
}

/** Keyboard key hint. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-[0_1px_0_hsl(var(--border))]">
      {children}
    </kbd>
  )
}

/** Output panel placeholder before the first generation. */
function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <p className="text-lg font-medium">Nothing generated yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Paste an OpenAPI spec above and hit <strong>Generate</strong> — or just run the
          pre-loaded Pet Store example.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          <Kbd>Ctrl</Kbd> + <Kbd>↵</Kbd> works too
        </p>
      </div>
    </div>
  )
}

/** Highlight tile used in the features section. */
function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  )
}
