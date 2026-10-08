/**
 * `openapi-zod-gen <spec>` — the free generation command.
 * Reuses the exact same 36-test core as the web UI.
 *
 * Returns a process exit code. In watch mode the fs watcher keeps the
 * Node event loop alive, so the process keeps running after return.
 */

import { readFileSync, writeFileSync, mkdirSync, watchFile } from 'node:fs'
import { join } from 'node:path'
import { parseSpecInput } from '../../src/lib/parseSpec'
import { generateFromOpenAPI, type GeneratorOptions } from '../../src/lib/generator'

export interface GenerateArgs {
  specPath: string
  output: string
  stdout: boolean
  watch: boolean
  options: GeneratorOptions
}

export function runGenerate(args: GenerateArgs): number {
  const generateOnce = (): boolean => {
    let raw: string
    try {
      raw = readFileSync(args.specPath, 'utf-8')
    } catch (e) {
      console.error(`✖ Could not read '${args.specPath}': ${e instanceof Error ? e.message : String(e)}`)
      return false
    }

    const parsed = parseSpecInput(raw)
    if (!parsed.ok) {
      console.error(`✖ ${parsed.error}`)
      return false
    }

    const result = generateFromOpenAPI(parsed.spec, args.options)
    for (const err of result.errors) console.error(`✖ ${err}`)

    const files: Array<[string, string]> = [
      ['schemas.ts', result.zodSchemas],
      ['types.ts', result.types],
      ['resolvers.ts', result.reactHookFormResolvers ?? ''],
      ['hooks.ts', result.tanstackQueryHooks ?? ''],
      ['handlers.ts', result.mswHandlers ?? ''],
      ['fakers.ts', result.fakerGenerators ?? ''],
    ].filter(([, content]) => content && content.trim().length > 0) as Array<[string, string]>

    if (files.length === 0) {
      console.error('✖ Nothing to generate (no schemas found in the spec)')
      return false
    }

    if (args.stdout) {
      for (const [name, content] of files) {
        console.log(`/* ═══════════ ${name} ═══════════ */\n`)
        console.log(content)
      }
    } else {
      mkdirSync(args.output, { recursive: true })
      for (const [name, content] of files) {
        writeFileSync(join(args.output, name), content)
      }
      console.log(`✔ ${files.length} file${files.length > 1 ? 's' : ''} → ${args.output}/`)
      if (result.errors.length > 0) {
        console.log(`  (${result.errors.length} schema error${result.errors.length > 1 ? 's' : ''} — see above)`)
      }
    }
    return true
  }

  if (!generateOnce()) return 1

  if (args.watch) {
    console.log(`Watching '${args.specPath}' for changes… (Ctrl+C to stop)`)
    watchFile(args.specPath, { interval: 500 }, () => {
      console.log('— change detected —')
      generateOnce()
    })
  }

  return 0
}
