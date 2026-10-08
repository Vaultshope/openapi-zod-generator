/**
 * openapi-zod-gen — CLI entry point.
 *
 * Free:
 *   openapi-zod-gen <spec.yaml> [-o dir] [--all] [--watch] [--stdout]
 *     --all           enable every output (RHF, TanStack, MSW, Faker)
 *     --rhf --tanstack --msw --faker     enable individual outputs
 *     --no-strict     permissive objects (OpenAPI default)
 *     -o, --output    output directory (default: ./generated)
 *     --stdout        print to stdout instead of writing files
 *     --watch         regenerate when the spec changes
 *
 * Pro (offline license key — format PRO-xxxxxxxx-xxxx):
 *   openapi-zod-gen diff <old.yaml> <new.yaml> --license <key> [--json]
 *     Breaking-change report for your API. Exit code 1 when breaking
 *     changes exist (CI-friendly). Without a license: preview mode
 *     (summary + first finding). License via --license or the
 *     OPENAPI_ZOD_GEN_LICENSE env variable.
 */

import { readFileSync } from 'node:fs'
import { parseSpecInput } from '../../src/lib/parseSpec'
import { runGenerate } from './generate'
import { diffSpecs, formatReport, summarize } from './diff'
import { checkLicense, licenseConfigured } from './license'

/** Injected at build time from cli/package.json (see cli/build.mjs). */
declare const __CLI_VERSION__: string

const HELP = `openapi-zod-gen — correctness-first OpenAPI → Zod/TypeScript generator

USAGE
  openapi-zod-gen <spec.yaml> [options]        generate code from a spec
  openapi-zod-gen diff <old.yaml> <new.yaml>   breaking-change report (Pro)

OPTIONS
  -o, --output <dir>   output directory (default: ./generated)
  --all                generate every output file
  --rhf                React Hook Form resolvers
  --tanstack           TanStack Query hooks
  --msw                MSW handlers
  --faker              Faker factories
  --no-strict          permissive objects (OpenAPI default)
  --stdout             print to stdout instead of writing files
  --watch              regenerate on spec change
  --license <key>      Pro license key: PRO-xxxxxxxx-xxxx (or OPENAPI_ZOD_GEN_LICENSE env)
  --json               machine-readable diff output
  --no-fail            diff: always exit 0 (default: exit 1 on breaking)
  -h, --help           show this help
  -v, --version        show version

EXAMPLES
  openapi-zod-gen ./openapi.yaml
  openapi-zod-gen ./openapi.yaml -o ./src/generated --all
  openapi-zod-gen diff ./specs/v1.yaml ./specs/v2.yaml --license PRO-XXXXXXXX-XXXX

Docs: https://openapi-zod-generator.pages.dev
Source: https://github.com/Vaultshope/openapi-zod-generator`

interface ParsedArgs {
  positional: string[]
  flags: Set<string>
  values: Map<string, string>
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { positional: [], flags: new Set(), values: new Map() }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '-o' || arg === '--output' || arg === '--license') {
      parsed.values.set(arg, argv[++i] ?? '')
    } else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq > 0) parsed.values.set(arg.slice(0, eq), arg.slice(eq + 1))
      else parsed.flags.add(arg)
    } else {
      parsed.positional.push(arg)
    }
  }
  return parsed
}

function loadSpec(path: string): any {
  const raw = readFileSync(path, 'utf-8')
  // The shared parser handles YAML and JSON, with positioned YAML errors.
  const parsed = parseSpecInput(raw)
  if (!parsed.ok) {
    console.error(`✖ ${path}: ${parsed.error}`)
    process.exit(1)
  }
  return parsed.spec
}

/* ── diff (Pro) ───────────────────────────────────────────── */

async function runDiff(argv: string[]): Promise<number> {
  const args = parseArgs(argv)
  const [oldPath, newPath] = args.positional
  if (!oldPath || !newPath) {
    console.error('✖ diff needs two spec files: openapi-zod-gen diff <old.yaml> <new.yaml>')
    return 1
  }

  const licenseKey = args.values.get('--license') ?? process.env.OPENAPI_ZOD_GEN_LICENSE
  const asJson = args.flags.has('--json')
  const noFail = args.flags.has('--no-fail')

  const oldSpec = loadSpec(oldPath)
  const newSpec = loadSpec(newPath)

  const findings = diffSpecs(oldSpec, newSpec)
  const counts = summarize(findings)

  let licensed = false
  if (licenseKey) {
    const result = await checkLicense(licenseKey)
    licensed = result.ok
    if (!licensed) console.error(`⚠ ${result.message}`)
  }

  // Until the maintainer configures Polar (POLAR_ORG_ID), the full report
  // is free — a generous launch mode. Once configured, it needs a license.
  const unconfiguredFreebie = !licenseConfigured()

  if (asJson) {
    console.log(
      JSON.stringify(
        { ...counts, licensed: licensed || unconfiguredFreebie, findings: licensed || unconfiguredFreebie ? findings : undefined },
        null,
        2
      )
    )
  } else if (licensed || unconfiguredFreebie) {
    console.log(formatReport(findings, oldPath, newPath))
    if (unconfiguredFreebie) {
      console.log('\nℹ Pro licensing is not configured yet — the full report is free for now.')
    }
  } else {
    // Preview mode — the full report is the Pro product.
    console.log(`\nComparing ${oldPath} → ${newPath}\n`)
    console.log(`Found ${counts.breaking} breaking · ${counts.compatible} non-breaking · ${counts.added} added changes.\n`)
    const firstBreaking = findings.find(f => f.kind === 'breaking')
    if (firstBreaking) {
      console.log(`Example: ${firstBreaking.path}: ${firstBreaking.message}\n`)
    }
    if (licenseKey) {
      console.log('⚠ Your license could not be validated — see above.')
    } else {
      console.log('🔒 Unlock the full report with a Pro license:')
      console.log('   openapi-zod-gen diff old.yaml new.yaml --license PRO-xxxx-xxxx')
      console.log('   Get one at https://openapi-zod-generator.pages.dev/pro — $39 one-time, USDT or card.')
    }
  }

  if (noFail) return 0
  return counts.breaking > 0 ? 1 : 0
}

/* ── main ─────────────────────────────────────────────────── */

async function main(): Promise<number> {
  const argv = process.argv.slice(2)

  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP)
    return 0
  }
  if (argv[0] === '-v' || argv[0] === '--version') {
    console.log(__CLI_VERSION__)
    return 0
  }
  if (argv[0] === 'diff') {
    return runDiff(argv.slice(1))
  }

  // generate command
  const args = parseArgs(argv)
  const specPath = args.positional[0]
  if (!specPath) {
    console.error("✖ Missing spec file. Usage: openapi-zod-gen <spec.yaml> [-o dir]")
    return 1
  }

  return runGenerate({
    specPath,
    output: args.values.get('-o') ?? args.values.get('--output') ?? './generated',
    stdout: args.flags.has('--stdout'),
    watch: args.flags.has('--watch'),
    options: {
      // Defaults mirror the web UI; --all adds MSW + Faker
      includeReactHookForm: true,
      includeTanStackQuery: true,
      includeMSW: args.flags.has('--msw') || args.flags.has('--all'),
      includeFaker: args.flags.has('--faker') || args.flags.has('--all'),
      strictMode: !args.flags.has('--no-strict'),
    },
  })
}

main().then(code => {
  process.exitCode = code
})
