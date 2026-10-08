/**
 * License validation for the Pro feature (breaking-change reports).
 *
 * Two supported key sources:
 *
 * 1. OFFLINE KEYS (default — pairs with crypto payments):
 *    Format: PRO-xxxxxxxx-yyyy
 *      xxxxxxxx = 8 random hex chars
 *      yyyy     = first 4 hex chars of HMAC-SHA256(secret, "PRO-xxxxxxxx")
 *    Validated entirely offline. The maintainer issues keys with
 *    `node cli/gen-license.mjs` after confirming a USDT payment.
 *
 * 2. POLAR KEYS (optional): if the maintainer configures a Polar org ID,
 *    keys bought through polar.sh are validated against Polar's
 *    customer-portal endpoints (public-client safe).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import { createHash, createHmac } from 'node:crypto'

/* ── Maintainer configuration ─────────────────────────────────
 * The license secret signs and verifies offline keys (PRO-xxxxxxxx-xxxx).
 * ⚠️ SAVE THIS VALUE in a password manager — you need it every time you
 * issue a key (cli/gen-license.mjs reads it from the LICENSE_SECRET env).
 * It is embedded in the published CLI bundle (that's how offline
 * validation works — documented trade-off at this scale). Never reuse it
 * as a password anywhere else, and never paste it into docs.
 * To rotate: generate a new one, paste it here, rebuild, re-publish —
 * old keys stop validating. */
export const LICENSE_SECRET = process.env.OPENAPI_ZOD_GEN_LICENSE_SECRET ?? '370e76b1bc28d10816f5f0a73ed734083b6a45beecbaee55'

/** Your Polar organization ID (optional card-payment path). */
export const POLAR_ORG_ID = process.env.OPENAPI_ZOD_GEN_ORG_ID ?? 'REPLACE_WITH_POLAR_ORG_ID'

const POLAR_ACTIVATE_URL = 'https://api.polar.sh/v1/customers/license-keys/activate'
const CACHE_FILE = join(homedir(), '.openapi-zod-gen', 'polar-license.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface LicenseResult {
  ok: boolean
  message: string
}

/* ── Offline keys ───────────────────────────────────────────── */

export function offlineKeysConfigured(secret: string = LICENSE_SECRET): boolean {
  return !secret.startsWith('SET-YOUR-SECRET')
}

/** Validate a PRO-xxxxxxxx-yyyy key against the embedded secret. */
export function validateOfflineKey(key: string, secret: string = LICENSE_SECRET): boolean {
  const match = /^PRO-([0-9a-f]{8})-([0-9a-f]{4})$/i.exec(key.trim())
  if (!match) return false
  const body = `PRO-${match[1].toLowerCase()}`
  const expected = createHmac('sha256', secret).update(body).digest('hex').slice(0, 4)
  return expected === match[2].toLowerCase()
}

/* ── Polar (optional) ───────────────────────────────────────── */

function polarConfigured(): boolean {
  return !POLAR_ORG_ID.startsWith('REPLACE_WITH')
}

/** Stable per-machine activation id — keeps re-runs from burning activation slots. */
function activationId(): string {
  return createHash('sha256').update(`${hostname()}:${process.env.USER ?? process.env.USERNAME ?? 'user'}`).digest('hex').slice(0, 32)
}

interface CacheShape {
  key: string
  activationId: string
  validatedAt: number
}

function readCache(): CacheShape | null {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function writeCache(key: string): void {
  try {
    mkdirSync(join(homedir(), '.openapi-zod-gen'), { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify({ key, activationId: activationId(), validatedAt: Date.now() }))
  } catch {
    /* cache is best-effort */
  }
}

async function checkPolarLicense(key: string): Promise<LicenseResult> {
  const cache = readCache()
  if (cache && cache.key === key && Date.now() - cache.validatedAt < CACHE_TTL_MS) {
    return { ok: true, message: 'license valid (cached)' }
  }

  try {
    const res = await fetch(POLAR_ACTIVATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        organization_id: POLAR_ORG_ID,
        activation_id: activationId(),
      }),
    })

    if (!res.ok) {
      const detail = res.status === 404 ? ' — key not found for this product' : ''
      return { ok: false, message: `Polar rejected the license (HTTP ${res.status})${detail}` }
    }

    const license = (await res.json()) as { status?: string; expires_at?: string | null }

    if (license.status !== 'granted') {
      return { ok: false, message: `license status is '${license.status ?? 'unknown'}'` }
    }
    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      return { ok: false, message: 'license has expired' }
    }

    writeCache(key)
    return { ok: true, message: 'license valid' }
  } catch (e) {
    return {
      ok: false,
      message: `could not reach Polar (${e instanceof Error ? e.message : String(e)}) — run again when online`,
    }
  }
}

/* ── Public API ────────────────────────────────────────────── */

/** True when any licensing method is configured (offline secret or Polar). */
export function licenseConfigured(): boolean {
  return offlineKeysConfigured() || polarConfigured()
}

/** Validate a license key: offline first, Polar as fallback. */
export async function checkLicense(key: string): Promise<LicenseResult> {
  if (validateOfflineKey(key)) {
    return { ok: true, message: 'Pro license valid' }
  }
  if (!polarConfigured()) {
    return { ok: false, message: 'invalid license key (expected format: PRO-xxxxxxxx-xxxx)' }
  }
  return checkPolarLicense(key)
}
