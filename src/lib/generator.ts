export interface GeneratorOptions {
  includeReactHookForm?: boolean
  includeTanStackQuery?: boolean
  includeMSW?: boolean
  includeFaker?: boolean
  strictMode?: boolean
}

export interface GenerationResult {
  zodSchemas: string
  types: string
  reactHookFormResolvers?: string
  tanstackQueryHooks?: string
  mswHandlers?: string
  fakerGenerators?: string
  errors: string[]
  warnings: string[]
}

interface OpenAPISpec {
  openapi: string
  info: { title: string; version: string }
  paths: Record<string, any>
  components?: {
    schemas?: Record<string, any>
    parameters?: Record<string, any>
    responses?: Record<string, any>
    requestBodies?: Record<string, any>
  }
}

interface SchemaContext {
  components: OpenAPISpec['components']
  visitedRefs: Set<string>
  currentPath: string[]
  options: GeneratorOptions
}

export function generateFromOpenAPI(
  spec: OpenAPISpec,
  options: GeneratorOptions = {}
): GenerationResult {
  const context: SchemaContext = {
    components: spec.components,
    visitedRefs: new Set(),
    currentPath: [],
    options: {
      includeReactHookForm: true,
      includeTanStackQuery: true,
      includeMSW: false,
      includeFaker: false,
      strictMode: true,
      ...options,
    },
  }

  const errors: string[] = []
  const warnings: string[] = []

  try {
    const schemas = spec.components?.schemas || {}
    const generatedSchemas: string[] = []
    const generatedTypes: string[] = []

    // Generate Zod schemas for each component
    for (const [name, schema] of Object.entries(schemas)) {
      context.currentPath = ['components', 'schemas', name]
      try {
        const { schema: zodSchema, type: tsType } = generateZodSchema(schema, name, context)
        generatedSchemas.push(zodSchema)
        generatedTypes.push(tsType)
      } catch (e) {
        errors.push(`Failed to generate schema for ${name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Generate React Hook Form resolvers
    let reactHookFormResolvers: string | undefined
    if (context.options.includeReactHookForm) {
      reactHookFormResolvers = generateReactHookFormResolvers(schemas, context)
    }

    // Generate TanStack Query hooks
    let tanstackQueryHooks: string | undefined
    if (context.options.includeTanStackQuery) {
      tanstackQueryHooks = generateTanStackQueryHooks(spec.paths, context)
    }

    // Generate MSW handlers
    let mswHandlers: string | undefined
    if (context.options.includeMSW) {
      mswHandlers = generateMSWHandlers(spec.paths, context)
    }

    // Generate Faker generators
    let fakerGenerators: string | undefined
    if (context.options.includeFaker) {
      fakerGenerators = generateFakerGenerators(schemas, context)
    }

    const schemaNames = Object.keys(schemas)

    // Import headers so every output file compiles standalone
    const zodOutput = generatedSchemas.length > 0
      ? [`import { z } from "zod"`, ...generatedSchemas].join('\n\n')
      : ''
    const typesOutput = generatedTypes.length > 0
      ? [
          `import { z } from "zod"`,
          `import { ${schemaNames.join(', ')} } from "./schemas"`,
          ...generatedTypes,
        ].join('\n\n')
      : ''

    return {
      zodSchemas: zodOutput,
      types: typesOutput,
      reactHookFormResolvers,
      tanstackQueryHooks,
      mswHandlers,
      fakerGenerators,
      errors,
      warnings,
    }
  } catch (e) {
    errors.push(`Generation failed: ${e instanceof Error ? e.message : String(e)}`)
    return {
      zodSchemas: '',
      types: '',
      errors,
      warnings,
    }
  }
}

function generateZodSchema(
  schema: any,
  name: string,
  context: SchemaContext,
  indent = ''
): { schema: string; type: string } {
  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() || ''
    if (context.visitedRefs.has(refName)) {
      // Circular reference - use lazy
      return {
        schema: `export const ${name} = z.lazy(() => ${refName})`,
        type: `export type ${name} = z.infer<typeof ${name}>`,
      }
    }
    context.visitedRefs.add(refName)
    const referencedSchema = context.components?.schemas?.[refName]
    if (referencedSchema) {
      return generateZodSchema(referencedSchema, name, context, indent)
    }
    return {
      schema: `export const ${name} = z.any() // Unresolved ref: ${refName}`,
      type: `export type ${name} = any`,
    }
  }

  let { type, nullable } = schema
  const { format, enum: enumValues, const: constValue, allOf, oneOf, anyOf, items, properties, required, additionalProperties, default: defaultValue, description, pattern, minimum, maximum, minLength, maxLength, minItems, maxItems, uniqueItems, multipleOf } = schema

  // OpenAPI 3.1: `type` may be an array, e.g. ["string", "null"].
  // Normalize before the switch: "null" becomes .nullable(), a single
  // concrete type wins; multiple concrete types fall through to unknown.
  if (Array.isArray(type)) {
    const concrete = type.filter((t: any) => t !== 'null')
    if (type.includes('null')) nullable = true
    type = concrete.length === 1 ? concrete[0] : undefined
  }

  // Handle discriminated unions (oneOf/anyOf with discriminator)
  if (oneOf || anyOf) {
    const variants = oneOf || anyOf
    const discriminator = schema.discriminator?.propertyName
    
    if (discriminator && variants.every((v: any) => v.$ref)) {
      // Generate discriminated union
      const variantNames = variants.map((v: any) => v.$ref.split('/').pop()!)
      const unionSchema = `z.discriminatedUnion("${discriminator}", [${variantNames.map((n: string) => n).join(', ')}])`
      return {
        schema: `export const ${name} = ${unionSchema}`,
        type: `export type ${name} = z.infer<typeof ${name}>`,
      }
    }

    // Regular union
    const variantSchemas = variants.map((v: any, i: number) => {
      const variantName = `${name}_${i}`
      return generateZodSchema(v, variantName, context, indent).schema.split('export const ')[1]?.split(' = ')[1] || 'z.unknown()'
    })
    return {
      schema: `export const ${name} = z.union([${variantSchemas.join(', ')}])`,
      type: `export type ${name} = z.infer<typeof ${name}>`,
    }
  }

  // Handle allOf: merge members into a single object when possible (the
  // classic inheritance pattern: $ref base + inline extension). Falls back
  // to z.intersection for members that are not resolvable objects.
  if (allOf) {
    const merged = tryMergeAllOf(allOf, context)
    if (merged) {
      return generateZodSchema(
        {
          ...schema,
          type: 'object',
          allOf: undefined,
          properties: merged.properties,
          required: merged.required,
        },
        name,
        context,
        indent
      )
    }

    // Fallback: intersection
    const intersectionSchemas = allOf.map((s: any, i: number) => {
      const variantName = `${name}_${i}`
      return generateZodSchema(s, variantName, context, indent).schema.split('export const ')[1]?.split(' = ')[1] || 'z.unknown()'
    })
    return {
      schema: `export const ${name} = z.intersection(${intersectionSchemas[0]}, ${intersectionSchemas[1]})${intersectionSchemas.slice(2).map((s: string) => `.and(${s})`).join('')}`,
      type: `export type ${name} = z.infer<typeof ${name}>`,
    }
  }

  // Try to flatten an allOf into one object: merges the properties (and
  // required lists) of every member. Returns null when any member is not
  // a resolvable object — the caller then falls back to z.intersection.
  function tryMergeAllOf(
    allOfMembers: any[],
    mergeContext: SchemaContext
  ): { properties: Record<string, any>; required: string[] } | null {
    const mergedProperties: Record<string, any> = {}
    const mergedRequired: string[] = []

    for (const member of allOfMembers) {
      let memberSchema = member
      if (memberSchema?.$ref) {
        const refName = memberSchema.$ref.split('/').pop() || ''
        if (mergeContext.visitedRefs.has(refName)) return null // circular — fallback handles it
        const referenced = mergeContext.components?.schemas?.[refName]
        if (!referenced) return null // unresolved — fallback emits z.any() with a comment
        memberSchema = referenced
      }
      if (!memberSchema || typeof memberSchema !== 'object' || !memberSchema.properties) return null
      Object.assign(mergedProperties, memberSchema.properties)
      if (Array.isArray(memberSchema.required)) mergedRequired.push(...memberSchema.required)
    }

    return { properties: mergedProperties, required: Array.from(new Set(mergedRequired)) }
  }

  // Build base schema
  let zodType: string
  let refinements: string[] = []

  switch (type) {
    case 'string':
      zodType = 'z.string()'
      if (format) {
        switch (format) {
          case 'date-time':
            zodType = 'z.string().datetime()'
            break
          case 'date':
            zodType = 'z.string().date()'
            break
          case 'time':
            zodType = 'z.string().time()'
            break
          case 'email':
            zodType = 'z.string().email()'
            break
          case 'uuid':
            zodType = 'z.string().uuid()'
            break
          case 'uri':
          case 'url':
            zodType = 'z.string().url()'
            break
          case 'ipv4':
            zodType = 'z.string().ipv4()'
            break
          case 'ipv6':
            zodType = 'z.string().ipv6()'
            break
          case 'regex':
            if (pattern) {
              zodType = `z.string().regex(${JSON.stringify(pattern)})`
            }
            break
          default:
            // Keep as string with description
            break
        }
      }
      if (pattern && format !== 'regex') {
        refinements.push(`.regex(${JSON.stringify(pattern)})`)
      }
      if (minLength !== undefined) {
        refinements.push(`.min(${minLength})`)
      }
      if (maxLength !== undefined) {
        refinements.push(`.max(${maxLength})`)
      }
      break

    case 'number':
    case 'integer':
      zodType = type === 'integer' ? 'z.number().int()' : 'z.number()'
      if (format === 'float') zodType = 'z.number()'
      if (format === 'double') zodType = 'z.number()'
      if (minimum !== undefined) {
        refinements.push(`.min(${minimum})`)
      }
      if (maximum !== undefined) {
        refinements.push(`.max(${maximum})`)
      }
      if (multipleOf !== undefined) {
        refinements.push(`.multipleOf(${multipleOf})`)
      }
      break

    case 'boolean':
      zodType = 'z.boolean()'
      break

    case 'array':
      if (items) {
        const itemSchema = generateZodSchema(items, `${name}_Item`, context, indent)
        const itemType = itemSchema.schema.split('export const ')[1]?.split(' = ')[1] || 'z.unknown()'
        zodType = `z.array(${itemType})`
        if (minItems !== undefined) refinements.push(`.min(${minItems})`)
        if (maxItems !== undefined) refinements.push(`.max(${maxItems})`)
        if (uniqueItems) refinements.push('.unique()')
      } else {
        zodType = 'z.array(z.unknown())'
      }
      break

    case 'object': {
      if (properties) {
        const inner = `${indent}  `
        const propEntries = Object.entries(properties).map(([propName, propSchema]: [string, any]) => {
          const isRequired = required?.includes(propName) ?? false
          const propResult = generateZodSchema(propSchema, `${name}_${propName}`, context, inner)
          const propZod = propResult.schema.split('export const ')[1]?.split(' = ')[1] || 'z.unknown()'
          return `${inner}${propName}: ${isRequired ? propZod : `${propZod}.optional()`}`
        })
        zodType = `z.object({\n${propEntries.join(',\n')}\n${indent}})`

        if (additionalProperties === false) {
          refinements.push('.strict()')
        } else if (additionalProperties && typeof additionalProperties === 'object') {
          const addPropSchema = generateZodSchema(additionalProperties, `${name}_Additional`, context, inner)
          const addPropZod = addPropSchema.schema.split('export const ')[1]?.split(' = ')[1] || 'z.unknown()'
          refinements.push(`.catchall(${addPropZod})`)
        } else if (context.options.strictMode) {
          // Strict Mode: objects reject unknown keys unless the spec explicitly allows them
          refinements.push('.strict()')
        }
      } else if (additionalProperties && typeof additionalProperties === 'object') {
        // Free-form map: `type: object` with only additionalProperties -> typed record
        const valueResult = generateZodSchema(additionalProperties, `${name}_Value`, context, indent)
        const valueZod = valueResult.schema.split('export const ')[1]?.split(' = ')[1] || 'z.unknown()'
        zodType = `z.record(${valueZod})`
      } else {
        zodType = 'z.record(z.unknown())'
      }
      break
    }

    default:
      zodType = 'z.unknown()'
  }

  // Handle enum
  if (enumValues && enumValues.length > 0) {
    const enumVals = enumValues.map((v: any) => JSON.stringify(v)).join(', ')
    zodType = `z.enum([${enumVals}])`
  }

  // Handle const
  if (constValue !== undefined) {
    zodType = `z.literal(${JSON.stringify(constValue)})`
  }

  // Handle nullable
  if (nullable) {
    zodType = `${zodType}.nullable()`
  }

  // Handle default
  if (defaultValue !== undefined) {
    refinements.push(`.default(${JSON.stringify(defaultValue)})`)
  }

  // Handle description
  if (description) {
    refinements.push(`.describe(${JSON.stringify(description)})`)
  }

  const finalSchema = `${zodType}${refinements.join('')}`
  
  return {
    schema: `export const ${name} = ${finalSchema}`,
    type: `export type ${name} = z.infer<typeof ${name}>`,
  }
}

function generateReactHookFormResolvers(
  schemas: Record<string, any>,
  context: SchemaContext
): string {
  const names = Object.keys(schemas)
  const imports = [
    `import { zodResolver } from "@hookform/resolvers/zod"`,
    `import { ${names.join(', ')} } from "./schemas"`,
  ].join('\n')
  const resolvers = names.map(name => {
    return `export const ${name}Resolver = zodResolver(${name})`
  })
  return [imports, ...resolvers].join('\n\n')
}

function generateTanStackQueryHooks(
  paths: Record<string, any>,
  context: SchemaContext
): string {
  // Track which schema types the hooks reference, so the import
  // header makes the file compile standalone.
  const usedTypes = new Set<string>()

  const hooks: string[] = []

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object' || operation === null || !('operationId' in operation)) continue
      const op = operation as any
      const operationId = op.operationId as string
      const isMutation = ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())
      
      // Extract request/response schemas
      const requestBody = op.requestBody?.content?.['application/json']?.schema
      const responses = op.responses || {}
      const successResponse = responses['200'] || responses['201'] || responses['204']
      const responseSchema = successResponse?.content?.['application/json']?.schema

      if (isMutation) {
        const hook = generateMutationHook(operationId, path, method, requestBody, responseSchema, context, usedTypes)
        hooks.push(hook)
      } else {
        const hook = generateQueryHook(operationId, path, method, responseSchema, context, usedTypes)
        hooks.push(hook)
      }
    }
  }

  const imports = [
    `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"`,
    usedTypes.size > 0
      ? `import type { ${Array.from(usedTypes).sort().join(', ')} } from "./schemas"`
      : '',
  ].filter(Boolean).join('\n')

  return [imports, ...hooks].join('\n\n')
}

function resolveTypeName(schema: any): string {
  if (!schema) return 'unknown'
  if (schema.$ref) return schema.$ref.split('/').pop() || 'unknown'
  if (schema.type === 'array') {
    if (schema.items?.$ref) return `${schema.items.$ref.split('/').pop()}[]`
    return 'unknown[]'
  }
  return 'unknown'
}

function addUsedType(typeName: string, used: Set<string>) {
  const base = typeName.replace(/\[\]$/, '')
  if (base !== 'unknown') used.add(base)
}

function generateQueryHook(
  operationId: string,
  path: string,
  method: string,
  responseSchema: any,
  context: SchemaContext,
  usedTypes: Set<string>
): string {
  const responseType = resolveTypeName(responseSchema)
  addUsedType(responseType, usedTypes)
  const params = extractPathParams(path)
  const hookName = `use${operationId.charAt(0).toUpperCase() + operationId.slice(1)}`
  const hasParams = params.length > 0

  const args = hasParams ? `{ ${params.join(', ')} }: { ${params.map(p => `${p}: string`).join(', ')} }` : ''
  const queryKey = hasParams ? `['${operationId}', ${params.join(', ')}]` : `['${operationId}']`
  const enabledLine = hasParams ? `\n    enabled: ${params.map(p => `!!${p}`).join(' && ')},` : ''
  const urlPath = path.replace(/{([^}]+)}/g, '${$1}')

  return `export function ${hookName}(${args}) {
  return useQuery({
    queryKey: ${queryKey},
    queryFn: async () => {
      const res = await fetch(\`${urlPath}\`, { method: '${method.toUpperCase()}' })
      if (!res.ok) throw new Error('Request failed')
      return res.json() as Promise<${responseType}>
    },${enabledLine}
  })
}`
}

function generateMutationHook(
  operationId: string,
  path: string,
  method: string,
  requestBody: any,
  responseSchema: any,
  context: SchemaContext,
  usedTypes: Set<string>
): string {
  const requestType = resolveTypeName(requestBody)
  const responseType = resolveTypeName(responseSchema)
  addUsedType(requestType, usedTypes)
  addUsedType(responseType, usedTypes)
  const urlPath = path.replace(/{([^}]+)}/g, '${$1}')
  const hookName = `use${operationId.charAt(0).toUpperCase() + operationId.slice(1)}`
  const params = extractPathParams(path)
  const hasParams = params.length > 0

  const args = hasParams ? `{ ${params.join(', ')} }: { ${params.map(p => `${p}: string`).join(', ')} }` : ''
  const dataArg = requestType === 'unknown' ? 'data' : `data: ${requestType}`

  return `export function ${hookName}(${args}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (${dataArg}) => {
      const res = await fetch(\`${urlPath}\`, {
        method: '${method.toUpperCase()}',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Request failed')
      return res.json() as Promise<${responseType}>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${operationId}'] })
    },
  })
}`
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/{([^}]+)}/g)
  return matches ? matches.map(m => m.slice(1, -1)) : []
}

function generateMSWHandlers(
  paths: Record<string, any>,
  context: SchemaContext
): string {
  const handlers: string[] = []
  
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object' || operation === null || !('operationId' in operation)) continue
      const op = operation as any
      const operationId = op.operationId as string
      const httpMethod = method.toLowerCase()
      
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(httpMethod)) continue
      
      // Extract success response schema
      const responses = op.responses || {}
      const successResponse = responses['200'] || responses['201'] || responses['204']
      const responseSchema = successResponse?.content?.['application/json']?.schema
      
      // Generate mock response data
      const mockResponse = responseSchema ? generateMockData(responseSchema, context) : '{}'
      
      // Convert OpenAPI path to MSW path (replace {param} with :param)
      const mswPath = path.replace(/{([^}]+)}/g, ':$1')
      
      const handler = `http.${httpMethod}('${mswPath}', () => HttpResponse.json(${mockResponse}))`
      handlers.push(handler)
    }
  }
  
  if (handlers.length === 0) {
    return `import { http, HttpResponse } from "msw"

export const handlers = [
  // No operations with operationId found in spec
]`
  }
  
  const usesFaker = handlers.some(h => h.includes('faker'))
  const fakerImport = usesFaker ? `\nimport { faker } from "@faker-js/faker"` : ''
  
  return `import { http, HttpResponse } from "msw"${fakerImport}

export const handlers = [
  ${handlers.join(',\n  ')}
]`
}

function generateFakerGenerators(
  schemas: Record<string, any>,
  context: SchemaContext
): string {
  const fakerEntries: string[] = []
  
  for (const [name, schema] of Object.entries(schemas)) {
    const factoryBody = generateFakerFactory(schema, name, context, new Set())
    fakerEntries.push(`  ${name}: () => ${factoryBody}`)
  }
  
  if (fakerEntries.length === 0) {
    return `import { faker } from "@faker-js/faker"

export const fakers = {
  // No schemas found in spec
}`
  }
  
  return `import { faker } from "@faker-js/faker"

export const fakers = {
${fakerEntries.join(',\n')}
}`
}

function generateMockData(schema: any, context: SchemaContext, depth = 0): string {
  if (depth > 5) return 'null'
  
  // Handle $ref - inline the referenced schema's mock data
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() || ''
    const referencedSchema = context.components?.schemas?.[refName]
    if (referencedSchema) {
      return generateMockData(referencedSchema, context, depth + 1)
    }
    return '{}'
  }
  
  const { type, format, enum: enumValues, const: constValue, items, properties, nullable } = schema
  
  // Handle enum
  if (enumValues && enumValues.length > 0) {
    const values = enumValues.map((v: any) => JSON.stringify(v)).join(', ')
    return `[${values}][Math.floor(Math.random() * ${enumValues.length})]`
  }
  
  // Handle const
  if (constValue !== undefined) {
    return JSON.stringify(constValue)
  }
  
  let expr: string
  switch (type) {
    case 'string':
      switch (format) {
        case 'uuid': expr = 'faker.string.uuid()'; break
        case 'email': expr = 'faker.internet.email()'; break
        case 'date-time': expr = 'faker.date.recent().toISOString()'; break
        case 'date': expr = 'faker.date.recent().toISOString().split("T")[0]'; break
        case 'uri':
        case 'url': expr = 'faker.internet.url()'; break
        case 'ipv4': expr = 'faker.internet.ipv4()'; break
        case 'ipv6': expr = 'faker.internet.ipv6()'; break
        default:
          expr = schema.pattern ? 'faker.string.alphanumeric({ length: 10 })' : 'faker.lorem.word()'
      }
      break
    
    case 'number':
    case 'integer':
      expr = (format === 'float' || format === 'double' || type === 'number') ? 'faker.number.float()' : 'faker.number.int()'
      break
    
    case 'boolean':
      expr = 'faker.datatype.boolean()'
      break
    
    case 'array':
      if (items) {
        const itemMock = generateMockData(items, context, depth + 1)
        expr = `Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ${itemMock})`
      } else {
        expr = '[]'
      }
      break
    
    case 'object': {
      if (properties) {
        const entries = Object.entries(properties).map(([propName, propSchema]: [string, any]) => {
          const propMock = generateMockData(propSchema, context, depth + 1)
          return `${propName}: ${propMock}`
        })
        expr = `({ ${entries.join(', ')} })`
      } else {
        expr = '({})'
      }
      break
    }
    
    default:
      return 'null'
  }
  
  // Deterministic output: nullable randomness lives in the generated code, not the generator
  return nullable ? `Math.random() < 0.1 ? null : ${expr}` : expr
}

function generateFakerFactory(
  schema: any,
  name: string,
  context: SchemaContext,
  visited: Set<string>
): string {
  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() || ''
    return `fakers.${refName}()`
  }
  
  const { type, format, enum: enumValues, const: constValue, items, properties, required, additionalProperties, nullable } = schema
  
  // Handle enum
  if (enumValues && enumValues.length > 0) {
    const values = enumValues.map((v: any) => JSON.stringify(v)).join(', ')
    return `[${values}][Math.floor(Math.random() * ${enumValues.length})]`
  }
  
  // Handle const
  if (constValue !== undefined) {
    return JSON.stringify(constValue)
  }
  
  switch (type) {
    case 'string': {
      let fakerCall = ''
      switch (format) {
        case 'uuid': fakerCall = 'faker.string.uuid()'; break
        case 'email': fakerCall = 'faker.internet.email()'; break
        case 'date-time': fakerCall = 'faker.date.recent().toISOString()'; break
        case 'date': fakerCall = 'faker.date.recent().toISOString().split("T")[0]'; break
        case 'uri':
        case 'url': fakerCall = 'faker.internet.url()'; break
        case 'ipv4': fakerCall = 'faker.internet.ipv4()'; break
        case 'ipv6': fakerCall = 'faker.internet.ipv6()'; break
        default:
          if (schema.pattern) fakerCall = 'faker.string.alphanumeric({ length: 10 })'
          else fakerCall = 'faker.lorem.word()'
      }
      if (nullable) {
        return `Math.random() < 0.1 ? null : ${fakerCall}`
      }
      return fakerCall
    }
    
    case 'number':
    case 'integer': {
      let fakerCall = type === 'integer' ? 'faker.number.int()' : 'faker.number.float()'
      if (format === 'float' || format === 'double') fakerCall = 'faker.number.float()'
      if (nullable) {
        return `Math.random() < 0.1 ? null : ${fakerCall}`
      }
      return fakerCall
    }
    
    case 'boolean': {
      if (nullable) {
        return `Math.random() < 0.1 ? null : faker.datatype.boolean()`
      }
      return `faker.datatype.boolean()`
    }
    
    case 'array': {
      if (items) {
        const itemFactory = generateFakerFactory(items, `${name}_Item`, context, visited)
        return `Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ${itemFactory})`
      }
      return `[]`
    }
    
    case 'object': {
      if (properties) {
        const propFactories = Object.entries(properties).map(([propName, propSchema]: [string, any]) => {
          const isRequired = required?.includes(propName) ?? false
          const propFactory = generateFakerFactory(propSchema, `${name}_${propName}`, context, visited)
          if (!isRequired) {
            return `${propName}: Math.random() < 0.3 ? undefined : ${propFactory}`
          }
          return `${propName}: ${propFactory}`
        })
        return `({ ${propFactories.join(', ')} })`
      }
      return `({})`
    }
    
    default:
      return `null`
  }
}