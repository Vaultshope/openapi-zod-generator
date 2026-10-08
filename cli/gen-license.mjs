/**
 * Maintainer tool: issue an offline Pro license key (PRO-xxxxxxxx-xxxx).
 *
 * Usage (use the SAME secret that is embedded in cli/src/license.ts):
 *   $env:LICENSE_SECRET = "<your-secret>"; node cli/gen-license.mjs
 *
 * Run this AFTER confirming the USDT (BEP-20) payment on BscScan,
 * then send the printed key to the buyer.
 */
import { createHmac, randomBytes } from 'node:crypto'

const secret = process.env.LICENSE_SECRET
if (!secret || secret === 'SET-YOUR-SECRET-HERE') {
  console.error('✖ Set LICENSE_SECRET first — the same value that is embedded in cli/src/license.ts')
  console.error('  Example (PowerShell):  $env:LICENSE_SECRET = "your-secret"; node cli/gen-license.mjs')
  process.exit(1)
}

const body = `PRO-${randomBytes(4).toString('hex')}`
const checksum = createHmac('sha256', secret).update(body).digest('hex').slice(0, 4)

console.log('\nNew Pro license key:')
console.log(`  ${body}-${checksum}\n`)
console.log('Keep a private record of this key and who you issued it to.\n')
