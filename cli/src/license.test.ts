import { describe, it, expect } from 'vitest'
import { createHmac, randomBytes } from 'node:crypto'
import { validateOfflineKey, offlineKeysConfigured, LICENSE_SECRET } from './license'

const TEST_SECRET = 'test-secret-for-unit-tests'

/** Issue a key with the same algorithm as cli/gen-license.mjs */
function issueKey(secret: string = TEST_SECRET): string {
  const body = `PRO-${randomBytes(4).toString('hex')}`
  const checksum = createHmac('sha256', secret).update(body).digest('hex').slice(0, 4)
  return `${body}-${checksum}`
}

describe('offline license keys', () => {
  it('accepts a correctly issued key', () => {
    const key = issueKey()
    expect(validateOfflineKey(key, TEST_SECRET)).toBe(true)
  })

  it('rejects a tampered checksum', () => {
    const key = issueKey()
    const flipped = key.slice(0, -1) + (key.endsWith('0') ? '1' : '0')
    expect(validateOfflineKey(flipped, TEST_SECRET)).toBe(false)
  })

  it('rejects keys signed with a different secret', () => {
    const key = issueKey('someone-elses-secret')
    expect(validateOfflineKey(key, TEST_SECRET)).toBe(false)
  })

  it('rejects malformed keys', () => {
    expect(validateOfflineKey('hello', TEST_SECRET)).toBe(false)
    expect(validateOfflineKey('PRO-abcdefgh-1234', TEST_SECRET)).toBe(false) // non-hex body
    expect(validateOfflineKey('', TEST_SECRET)).toBe(false)
  })

  it('trims whitespace before validating', () => {
    const key = issueKey()
    expect(validateOfflineKey(`  ${key}\n`, TEST_SECRET)).toBe(true)
  })

  it('detects configured vs placeholder secrets', () => {
    // The logic, independent of what is currently embedded:
    expect(offlineKeysConfigured('SET-YOUR-SECRET-HERE')).toBe(false)
    expect(offlineKeysConfigured('a-real-secret')).toBe(true)
  })

  it('validates keys against the currently embedded secret', () => {
    // A key issued with the embedded secret must validate via the default parameter
    const key = issueKey(LICENSE_SECRET)
    expect(validateOfflineKey(key)).toBe(true)
  })
})
