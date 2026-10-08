/** Bundles the CLI into a single zero-dependency file: cli/dist/index.js */
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(readFileSync('cli/package.json', 'utf-8'))

await build({
  entryPoints: ['cli/src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  // CJS: the `yaml` parser ships as CommonJS — ESM output would break its
  // internal require() calls.
  format: 'cjs',
  outfile: 'cli/dist/index.js',
  banner: { js: '#!/usr/bin/env node' },
  minify: false,
  // Inject the real version at build time so `--version` can never go stale
  define: { __CLI_VERSION__: JSON.stringify(pkg.version) },
})

console.log(`CLI built → cli/dist/index.js (v${pkg.version})`)
