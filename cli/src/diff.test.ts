import { describe, it, expect } from 'vitest'
import { diffSpecs, formatReport, summarize } from './diff'

const v1 = {
  openapi: '3.1.0',
  info: { title: 'T', version: '1' },
  paths: {
    '/pets': {
      get: { operationId: 'listPets', responses: { '200': { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } } } } } } },
      post: { operationId: 'createPet', responses: {} },
    },
    '/users': { get: { operationId: 'listUsers', responses: {} } },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1 },
          status: { type: 'string', enum: ['available', 'pending', 'sold'] },
          age: { type: 'integer', minimum: 0, maximum: 20 },
          nickname: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' }, minItems: 0 },
        },
      },
      Owner: { type: 'object', properties: { email: { type: 'string', format: 'email' } } },
    },
  },
}

/** Helper: clone v1 and apply a mutation. */
function mutate(fn: (spec: any) => void): any {
  const copy = JSON.parse(JSON.stringify(v1))
  fn(copy)
  return copy
}

describe('diffSpecs — breaking changes', () => {
  it('detects removed schemas', () => {
    const v2 = mutate(s => { delete s.components.schemas.Owner })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.message.includes("'Owner' was removed"))).toBe(true)
  })

  it('detects removed properties', () => {
    const v2 = mutate(s => { delete s.components.schemas.Pet.properties.nickname })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.path === 'Pet.nickname')).toBe(true)
  })

  it('detects type changes', () => {
    const v2 = mutate(s => { s.components.schemas.Pet.properties.age.type = 'string' })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.path === 'Pet.age' && f.message.includes('type changed'))).toBe(true)
  })

  it('detects enum values removed', () => {
    const v2 = mutate(s => {
      s.components.schemas.Pet.properties.status.enum = ['available', 'pending']
    })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.message.includes("'sold' was removed"))).toBe(true)
  })

  it('detects newly required properties', () => {
    const v2 = mutate(s => { s.components.schemas.Pet.required.push('nickname') })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.message.includes("'nickname' is now required"))).toBe(true)
  })

  it('detects tightened constraints (minimum raised)', () => {
    const v2 = mutate(s => { s.components.schemas.Pet.properties.age.minimum = 1 })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.path === 'Pet.age' && f.message.includes('minimum raised'))).toBe(true)
  })

  it('detects nullable → non-nullable', () => {
    const v2 = mutate(s => { s.components.schemas.Pet.properties.nickname.nullable = false })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.path === 'Pet.nickname' && f.message.includes('no longer nullable'))).toBe(true)
  })

  it('detects removed endpoints and operations', () => {
    const v2 = mutate(s => {
      delete s.paths['/users']
      delete s.paths['/pets'].post
    })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'breaking' && f.message.includes("'/users' was removed"))).toBe(true)
    expect(findings.some(f => f.kind === 'breaking' && f.path === 'POST /pets')).toBe(true)
  })
})

describe('diffSpecs — non-breaking & additive changes', () => {
  it('classifies added schemas, properties and endpoints as additive', () => {
    const v2 = mutate(s => {
      s.components.schemas.Extra = { type: 'string' }
      s.components.schemas.Pet.properties.vaccinated = { type: 'boolean' }
      s.paths['/health'] = { get: { operationId: 'health', responses: {} } }
    })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'added' && f.path === 'Extra')).toBe(true)
    expect(findings.some(f => f.kind === 'added' && f.path === 'Pet.vaccinated')).toBe(true)
    expect(findings.some(f => f.kind === 'added' && f.message.includes("'/health' was added"))).toBe(true)
  })

  it('classifies loosened constraints and de-required properties as compatible', () => {
    const v2 = mutate(s => {
      s.components.schemas.Pet.properties.age.maximum = 30
      s.components.schemas.Pet.required = ['id']
      s.components.schemas.Pet.properties.status.enum = ['available', 'pending', 'sold', 'adopted']
    })
    const findings = diffSpecs(v1, v2)
    expect(findings.some(f => f.kind === 'compatible' && f.message.includes('maximum raised'))).toBe(true)
    expect(findings.some(f => f.kind === 'compatible' && f.message.includes("'name' is no longer required"))).toBe(true)
    expect(findings.some(f => f.kind === 'compatible' && f.message.includes("'adopted' was added"))).toBe(true)
  })

  it('returns zero findings for identical specs', () => {
    const findings = diffSpecs(v1, JSON.parse(JSON.stringify(v1)))
    expect(findings).toHaveLength(0)
  })
})

describe('report formatting', () => {
  it('summarizes counts correctly', () => {
    const v2 = mutate(s => {
      delete s.paths['/users']
      s.components.schemas.Extra = { type: 'string' }
      s.components.schemas.Pet.properties.age.maximum = 30
    })
    const { breaking, added, compatible } = summarize(diffSpecs(v1, v2))
    expect(breaking).toBe(1)
    expect(added).toBe(1)
    expect(compatible).toBe(1)
  })

  it('formatReport announces breaking releases', () => {
    const v2 = mutate(s => { delete s.components.schemas.Owner })
    const report = formatReport(diffSpecs(v1, v2), 'v1.yaml', 'v2.yaml')
    expect(report).toContain('BREAKING (1):')
    expect(report).toContain('WILL break API consumers')
  })

  it('formatReport announces safe releases', () => {
    const report = formatReport(diffSpecs(v1, v1), 'v1.yaml', 'v1.yaml')
    expect(report).toContain('No differences found')
  })
})
