'use client'

/**
 * Code display components (documented in DESIGN.md).
 *
 * - CodeEditor  — Monaco wrapper with a chrome bar: language badge,
 *                 copy-to-clipboard (with success feedback) and download.
 * - OutputTabs  — the six generated outputs as a tab strip inside one
 *                 cohesive card. Uses CodeEditor with `bordered={false}`
 *                 so the card provides the chrome.
 */

import { useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import { Copy, Check, AlertTriangle, Download } from 'lucide-react'
import { clsx } from 'clsx'

/* ── CodeEditor ─────────────────────────────────────────────── */

interface EditorProps {
  language: 'yaml' | 'json' | 'typescript' | 'javascript'
  value: string
  onChange?: (value: string) => void
  theme?: 'vs-dark' | 'vs'
  height?: string
  minimap?: boolean
  /** When false, the caller provides the card chrome (see OutputTabs). */
  bordered?: boolean
}

export function CodeEditor({
  language,
  value,
  onChange,
  theme = 'vs-dark',
  height = '400px',
  minimap = false,
  bordered = true,
}: EditorProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `output.${language === 'typescript' ? 'ts' : language}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      style={{ height }}
      className={clsx(
        'group relative flex flex-col overflow-hidden bg-card transition-shadow focus-within:ring-2 focus-within:ring-ring/30',
        bordered && 'rounded-xl border border-border shadow-sm'
      )}
    >
      {/* Chrome bar: language badge + actions */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-muted/60 py-2 pl-3 pr-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value || copied}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" aria-label="Copied" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!value}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            title="Download file"
            aria-label="Download file"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Monaco fills the remaining space — needs a definite-height
          parent (flex-1 + min-h-0) or 100% collapses to 0px */}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={onChange ? (val) => onChange(val ?? '') : undefined}
          options={{
            minimap: { enabled: minimap },
            fontSize: 13,
            lineNumbers: 'on',
            wordWrap: 'on',
            tabSize: 2,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            padding: { top: 12 },
          }}
        />
      </div>

      {!value && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-muted-foreground">
          <p className="text-center">No output generated yet</p>
        </div>
      )}
    </div>
  )
}

/* ── OutputTabs ─────────────────────────────────────────────── */

interface OutputTabsProps {
  result: {
    zodSchemas: string
    types: string
    reactHookFormResolvers?: string
    tanstackQueryHooks?: string
    mswHandlers?: string
    fakerGenerators?: string
    errors: string[]
    warnings: string[]
  }
  theme: 'vs-dark' | 'vs'
}

export function OutputTabs({ result, theme }: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<
    'zod' | 'types' | 'rhf' | 'tanstack' | 'msw' | 'faker'
  >('zod')

  /* Tabs appear only when their output was generated. Zod + Types are
     always present (they are the core product). */
  const tabs = [
    { id: 'zod', label: 'Zod Schemas', content: result.zodSchemas, lang: 'typescript' as const },
    { id: 'types', label: 'Types', content: result.types, lang: 'typescript' as const },
    { id: 'rhf', label: 'RHF Resolvers', content: result.reactHookFormResolvers || '', lang: 'typescript' as const, enabled: !!result.reactHookFormResolvers },
    { id: 'tanstack', label: 'TanStack Query', content: result.tanstackQueryHooks || '', lang: 'typescript' as const, enabled: !!result.tanstackQueryHooks },
    { id: 'msw', label: 'MSW Handlers', content: result.mswHandlers || '', lang: 'typescript' as const, enabled: !!result.mswHandlers },
    { id: 'faker', label: 'Faker', content: result.fakerGenerators || '', lang: 'typescript' as const, enabled: !!result.fakerGenerators },
  ].filter(t => t.enabled !== false)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Generated output files"
        className="flex gap-1 overflow-x-auto border-b border-border bg-muted/60 p-1.5"
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="min-h-0 flex-1">
        {tabs.map(tab =>
          tab.id === activeTab ? (
            <CodeEditor
              key={tab.id}
              language={tab.lang}
              value={tab.content}
              theme={theme}
              height="100%"
              minimap
              bordered={false}
            />
          ) : null
        )}
      </div>

      {/* Errors & warnings — the one place the spec can push back */}
      {(result.errors.length > 0 || result.warnings.length > 0) && (
        <div className="border-t border-border bg-destructive/5 p-3">
          {result.errors.map((err, i) => (
            <div key={i} className="mb-1 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{err}</span>
            </div>
          ))}
          {result.warnings.map((warn, i) => (
            <div
              key={i}
              className="mb-1 flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
