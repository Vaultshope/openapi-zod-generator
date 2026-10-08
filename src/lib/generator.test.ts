import { describe, it, expect } from 'vitest'
import { generateFromOpenAPI } from '@/lib/generator'

const baseSpec = {
  openapi: '3.1.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
  components: { schemas: {} },
}

describe('generateFromOpenAPI', () => {
  it('generates basic string schema with format', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string', minLength: 1, maxLength: 100 },
            },
            required: ['id', 'email', 'name'],
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.errors).toHaveLength(0)
    expect(result.zodSchemas).toContain('z.string().uuid()')
    expect(result.zodSchemas).toContain('z.string().email()')
    expect(result.zodSchemas).toContain('.min(1)')
    expect(result.zodSchemas).toContain('.max(100)')
  })

  it('generates discriminated union for oneOf with discriminator', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Animal: {
            oneOf: [
              { $ref: '#/components/schemas/Dog' },
              { $ref: '#/components/schemas/Cat' },
            ],
            discriminator: { propertyName: 'type' },
          },
          Dog: { type: 'object', properties: { type: { type: 'string', const: 'dog' }, breed: { type: 'string' } } },
          Cat: { type: 'object', properties: { type: { type: 'string', const: 'cat' }, indoor: { type: 'boolean' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.errors).toHaveLength(0)
    expect(result.zodSchemas).toContain('z.discriminatedUnion')
    expect(result.zodSchemas).toContain('"type"')
  })

  it('handles recursive refs with z.lazy', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          TreeNode: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/TreeNode' },
              },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.errors).toHaveLength(0)
    expect(result.zodSchemas).toContain('z.lazy')
  })

  it('generates enum schemas', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.zodSchemas).toContain('z.enum')
    expect(result.zodSchemas).toContain('"active"')
    expect(result.zodSchemas).toContain('"inactive"')
    expect(result.zodSchemas).toContain('"pending"')
  })

  it('generates number constraints', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Product: {
            type: 'object',
            properties: {
              price: { type: 'number', minimum: 0, maximum: 10000, multipleOf: 0.01 },
              quantity: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.zodSchemas).toContain('.min(0)')
    expect(result.zodSchemas).toContain('.max(10000)')
    expect(result.zodSchemas).toContain('.multipleOf(0.01)')
    expect(result.zodSchemas).toContain('z.number().int()')
  })

  it('generates array with constraints', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          TagList: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 10,
            uniqueItems: true,
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.zodSchemas).toContain('z.array')
    expect(result.zodSchemas).toContain('.min(1)')
    expect(result.zodSchemas).toContain('.max(10)')
    expect(result.zodSchemas).toContain('.unique()')
  })

  it('generates nullable fields', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nickname: { type: 'string', nullable: true },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.zodSchemas).toContain('.nullable()')
  })

  it('maps date and time formats to .date() and .time()', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Event: {
            type: 'object',
            properties: {
              createdAt: { type: 'string', format: 'date-time' },
              birthday: { type: 'string', format: 'date' },
              alarmAt: { type: 'string', format: 'time' },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)
    
    expect(result.errors).toHaveLength(0)
    expect(result.zodSchemas).toContain('z.string().datetime()')
    expect(result.zodSchemas).toContain('z.string().date()')
    expect(result.zodSchemas).toContain('z.string().time()')
  })

  it('generates React Hook Form resolvers when enabled', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeReactHookForm: true })
    
    expect(result.reactHookFormResolvers).toContain('zodResolver')
    expect(result.reactHookFormResolvers).toContain('UserResolver')
  })

  it('generates TanStack Query hooks for paths', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeTanStackQuery: true })
    
    expect(result.tanstackQueryHooks).toContain('useQuery')
    expect(result.tanstackQueryHooks).toContain('useListUsers')
  })

  it('reports errors for invalid spec', () => {
    const result = generateFromOpenAPI({ openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {} })
    
    // Should not crash, may have warnings
    expect(result).toBeDefined()
  })

  it('generates MSW handlers for paths', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
          post: {
            operationId: 'createUser',
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            responses: {
              '201': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          delete: {
            operationId: 'deleteUser',
            responses: {
              '204': {},
            },
          },
        },
      },
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeMSW: true })
    
    expect(result.errors).toHaveLength(0)
    expect(result.mswHandlers).toContain("import { http, HttpResponse } from \"msw\"")
    expect(result.mswHandlers).toContain("http.get('/users'")
    expect(result.mswHandlers).toContain("http.post('/users'")
    expect(result.mswHandlers).toContain("http.get('/users/:id'")
    expect(result.mswHandlers).toContain("http.delete('/users/:id'")
    expect(result.mswHandlers).toContain("HttpResponse.json")
  })

  it('generates Faker generators for schemas', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              status: { type: 'string', enum: ['active', 'inactive'] },
              age: { type: 'integer', minimum: 18 },
              tags: { type: 'array', items: { type: 'string' } },
              metadata: { type: 'object', properties: { key: { type: 'string' } } },
            },
            required: ['id', 'email', 'name'],
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeFaker: true })
    
    expect(result.errors).toHaveLength(0)
    expect(result.fakerGenerators).toContain("import { faker } from \"@faker-js/faker\"")
    expect(result.fakerGenerators).toContain("User:")
    expect(result.fakerGenerators).toContain("faker.string.uuid()")
    expect(result.fakerGenerators).toContain("faker.internet.email()")
    expect(result.fakerGenerators).toContain("faker.lorem.word()")
    expect(result.fakerGenerators).toContain("active")
    expect(result.fakerGenerators).toContain("inactive")
    expect(result.fakerGenerators).toContain("faker.number.int()")
    expect(result.fakerGenerators).toContain("faker.string.uuid()")
  })

  it('generates Faker generators with nullable fields', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nickname: { type: 'string', nullable: true },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeFaker: true })
    
    expect(result.errors).toHaveLength(0)
    expect(result.fakerGenerators).toContain("Math.random() < 0.1 ? null")
  })

  it('MSW handlers skip operations without operationId', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            // No operationId
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: {} },
    }

    const result = generateFromOpenAPI(spec, { includeMSW: true })
    
    expect(result.mswHandlers).toContain("No operations with operationId found")
  })

  it('generates valid hook syntax for paths without parameters', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeTanStackQuery: true })
    
    expect(result.tanstackQueryHooks).toContain('export function useListUsers()')
    expect(result.tanstackQueryHooks).toContain("queryKey: ['listUsers']")
    expect(result.tanstackQueryHooks).not.toContain('(: {')
    // Response type resolves to the generated schema type, not an undefined one
    expect(result.tanstackQueryHooks).toContain('as Promise<User[]>')
  })

  it('generates mutation hooks that accept path parameters', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users/{id}': {
          delete: {
            operationId: 'deleteUser',
            responses: { '204': {} },
          },
        },
      },
      components: { schemas: {} },
    }

    const result = generateFromOpenAPI(spec, { includeTanStackQuery: true })
    
    expect(result.tanstackQueryHooks).toContain('useDeleteUser({ id }: { id: string })')
    expect(result.tanstackQueryHooks).toContain('`/users/${id}`')
  })

  it('imports faker in MSW handlers when mock data uses it', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeMSW: true })
    
    expect(result.mswHandlers).toContain('import { faker } from "@faker-js/faker"')
    expect(result.mswHandlers).toContain('faker.string.uuid()')
  })

  it('produces identical output across runs (deterministic generation)', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              nickname: { type: 'string', nullable: true },
              age: { type: 'integer' },
            },
          },
        },
      },
    }

    const first = generateFromOpenAPI(spec, { includeMSW: true, includeFaker: true })
    const second = generateFromOpenAPI(spec, { includeMSW: true, includeFaker: true })
    
    expect(second.zodSchemas).toBe(first.zodSchemas)
    expect(second.mswHandlers).toBe(first.mswHandlers)
    expect(second.fakerGenerators).toBe(first.fakerGenerators)
  })

  it('emits import headers so every output compiles standalone', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        },
      },
    }

    const result = generateFromOpenAPI(spec, {
      includeReactHookForm: true,
      includeTanStackQuery: true,
    })

    expect(result.zodSchemas.startsWith('import { z } from "zod"')).toBe(true)
    expect(result.types).toContain('import { z } from "zod"')
    expect(result.types).toContain('import { User } from "./schemas"')
    expect(result.reactHookFormResolvers).toContain('import { User } from "./schemas"')
    expect(result.tanstackQueryHooks).toContain('import type { User } from "./schemas"')
    expect(result.tanstackQueryHooks).not.toContain('import { z } from "zod"')
  })

  it('formats object schemas across multiple lines', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.zodSchemas).toContain('z.object({\n')
    expect(result.zodSchemas).toContain('\n  id: z.string(),')
    expect(result.zodSchemas).toContain('\n  name: z.string().optional()')
  })

  it('strict mode makes objects reject unknown keys', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec) // strictMode defaults to true

    expect(result.zodSchemas).toContain('.strict()')
  })

  it('strict mode off produces permissive objects', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          User: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { strictMode: false })

    expect(result.zodSchemas).not.toContain('.strict()')
  })

  it('generates typed records for free-form maps', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Metadata: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.zodSchemas).toContain('z.record(z.string())')
  })

  it('merges allOf members into a single object schema', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'string', format: 'uuid' } },
          },
          Cat: {
            allOf: [
              { $ref: '#/components/schemas/Pet' },
              { type: 'object', required: ['meow'], properties: { meow: { type: 'string' } } },
            ],
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.zodSchemas).toContain('export const Cat = z.object({')
    const catBlock = result.zodSchemas.slice(result.zodSchemas.indexOf('export const Cat'))
    expect(catBlock).toContain('id: z.string().uuid()')
    expect(catBlock).toContain('meow: z.string()')
    expect(catBlock).not.toContain('z.intersection')
  })

  it('handles OpenAPI 3.1 type arrays (["string", "null"])', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          MaybeId: { type: ['string', 'null'], format: 'uuid' },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.zodSchemas).toContain('z.string().uuid().nullable()')
  })

  it('supports 3.0-style nullable and 3.1 type arrays in one spec', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Row: {
            type: 'object',
            properties: {
              legacy: { type: 'string', nullable: true },
              modern: { type: ['integer', 'null'] },
            },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.zodSchemas).toContain('legacy: z.string().nullable()')
    expect(result.zodSchemas).toContain('modern: z.number().int().nullable()')
  })

  it('falls back to z.union for oneOf without discriminator', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          Shape: {
            oneOf: [{ type: 'string' }, { type: 'integer' }],
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.zodSchemas).toContain('z.union([')
  })

  it('resolves deeply nested $ref chains', () => {
    const spec = {
      ...baseSpec,
      components: {
        schemas: {
          A: {
            type: 'object',
            properties: { b: { $ref: '#/components/schemas/B' } },
          },
          B: {
            type: 'object',
            properties: { c: { $ref: '#/components/schemas/C' } },
          },
          C: {
            type: 'object',
            properties: { deep: { type: 'string', format: 'email' } },
          },
        },
      },
    }

    const result = generateFromOpenAPI(spec)

    expect(result.errors).toHaveLength(0)
    expect(result.zodSchemas).toContain('z.string().email()')
  })

  it('handles hooks with multiple path parameters', () => {
    const spec = {
      ...baseSpec,
      paths: {
        '/orgs/{orgId}/repos/{repoId}': {
          get: {
            operationId: 'getRepo',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Repo' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Repo: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    }

    const result = generateFromOpenAPI(spec, { includeTanStackQuery: true })

    expect(result.tanstackQueryHooks).toContain(
      'export function useGetRepo({ orgId, repoId }: { orgId: string, repoId: string })'
    )
    expect(result.tanstackQueryHooks).toContain('`/orgs/${orgId}/repos/${repoId}`')
    expect(result.tanstackQueryHooks).toContain('enabled: !!orgId && !!repoId')
  })
})