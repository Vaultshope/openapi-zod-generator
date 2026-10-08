import { describe, it, expect } from 'vitest'
import { parseSpecInput } from '@/lib/parseSpec'

describe('parseSpecInput', () => {
  it('accepts valid YAML', () => {
    const r = parseSpecInput('openapi: 3.1.0\ninfo:\n  title: T\n  version: "1"\npaths: {}\n')
    expect(r.ok).toBe(true)
  })

  it('accepts valid JSON strings', () => {
    const r = parseSpecInput('{"openapi":"3.1.0","info":{"title":"T","version":"1"},"paths":{}}')
    expect(r.ok).toBe(true)
  })

  it('accepts spec objects', () => {
    const r = parseSpecInput({ openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {} })
    expect(r.ok).toBe(true)
  })

  it('reports YAML errors with line and column numbers', () => {
    const r = parseSpecInput('openapi: 3.1.0\ninfo:\n  title: [unclosed\npaths: {}\n')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/line \d+, column \d+/)
      expect(r.error).toContain('Invalid YAML')
    }
  })

  it('rejects specs missing required fields', () => {
    const r = parseSpecInput('openapi: 3.1.0\ninfo:\n  title: T\n  version: "1"\n')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('missing required fields')
  })

  it('rejects empty input', () => {
    expect(parseSpecInput('').ok).toBe(false)
    expect(parseSpecInput('   \n  ').ok).toBe(false)
  })
})
