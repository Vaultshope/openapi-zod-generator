/**
 * Breaking-change detection between two OpenAPI specs (the Pro feature).
 *
 * Compares `components.schemas` and `paths` and classifies every
 * difference as:
 *   - breaking    consumers of the old spec will break
 *   - compatible   a safe, non-breaking change
 *   - added        purely additive (a subset of compatible)
 *
 * Pure functions — no I/O — so it is fully unit-tested in diff.test.ts.
 */

export type DiffKind = 'breaking' | 'compatible' | 'added'

export interface DiffFinding {
  path: string
  kind: DiffKind
  message: string
}

const MAX_DEPTH = 6

export function diffSpecs(oldSpec: any, newSpec: any): DiffFinding[] {
  const findings: DiffFinding[] = []
  diffSchemas(oldSpec?.components?.schemas ?? {}, newSpec?.components?.schemas ?? {}, findings)
  diffPaths(oldSpec?.paths ?? {}, newSpec?.paths ?? {}, findings)
  return findings
}

/* ── Schemas ─────────────────────────────────────────────── */

function diffSchemas(oldSchemas: Record<string, any>, newSchemas: Record<string, any>, findings: DiffFinding[]) {
  for (const [name, schema] of Object.entries(oldSchemas)) {
    if (!(name in newSchemas)) {
      findings.push({ path: name, kind: 'breaking', message: `schema '${name}' was removed` })
    } else {
      diffNode(name, schema, newSchemas[name], findings)
    }
  }
  for (const name of Object.keys(newSchemas)) {
    if (!(name in oldSchemas)) {
      findings.push({ path: name, kind: 'added', message: `schema '${name}' was added` })
    }
  }
}

function diffNode(path: string, oldNode: any, newNode: any, findings: DiffFinding[], depth = 0) {
  if (depth > MAX_DEPTH) return
  oldNode = oldNode ?? {}
  newNode = newNode ?? {}

  // $ref target change
  if (oldNode.$ref !== undefined || newNode.$ref !== undefined) {
    if (oldNode.$ref !== newNode.$ref) {
      findings.push({
        path,
        kind: 'breaking',
        message: `reference changed from '${oldNode.$ref ?? 'inline'}' to '${newNode.$ref ?? 'inline'}'`,
      })
    }
    return
  }

  // type change (OpenAPI 3.1 arrays like ["string","null"] normalized)
  const oldType = normalizeType(oldNode.type)
  const newType = normalizeType(newNode.type)
  if (oldType && newType && oldType !== newType) {
    findings.push({ path, kind: 'breaking', message: `type changed from '${oldType}' to '${newType}'` })
  }

  // nullable: true → false breaks; false → true is safe
  if (oldNode.nullable === true && newNode.nullable !== true && oldType) {
    findings.push({ path, kind: 'breaking', message: 'no longer nullable (null values will be rejected)' })
  } else if (oldNode.nullable !== true && newNode.nullable === true && oldType) {
    findings.push({ path, kind: 'compatible', message: 'now nullable' })
  }

  // format change
  if (oldNode.format && newNode.format && oldNode.format !== newNode.format) {
    findings.push({ path, kind: 'breaking', message: `format changed from '${oldNode.format}' to '${newNode.format}'` })
  }

  // enum values
  if (Array.isArray(oldNode.enum) && Array.isArray(newNode.enum)) {
    for (const value of oldNode.enum) {
      if (!newNode.enum.includes(value)) {
        findings.push({ path, kind: 'breaking', message: `enum value '${String(value)}' was removed` })
      }
    }
    for (const value of newNode.enum) {
      if (!oldNode.enum.includes(value)) {
        findings.push({ path, kind: 'compatible', message: `enum value '${String(value)}' was added` })
      }
    }
  }

  // constraints — tightening breaks, loosening is safe
  tightenedLowerBound('minimum', oldNode, newNode, path, findings)
  tightenedUpperBound('maximum', oldNode, newNode, path, findings)
  tightenedLowerBound('minLength', oldNode, newNode, path, findings)
  tightenedUpperBound('maxLength', oldNode, newNode, path, findings)
  tightenedLowerBound('minItems', oldNode, newNode, path, findings)
  tightenedUpperBound('maxItems', oldNode, newNode, path, findings)

  if (oldNode.multipleOf !== undefined && oldNode.multipleOf !== newNode.multipleOf) {
    findings.push({ path, kind: 'breaking', message: `multipleOf changed from ${oldNode.multipleOf} to ${newNode.multipleOf}` })
  }
  if (oldNode.pattern !== undefined && oldNode.pattern !== newNode.pattern) {
    findings.push({ path, kind: 'breaking', message: `pattern changed from '${oldNode.pattern}' to '${String(newNode.pattern)}'` })
  }

  // properties
  const oldProps = oldNode.properties ?? {}
  const newProps = newNode.properties ?? {}
  for (const [propName, prop] of Object.entries(oldProps)) {
    if (!(propName in newProps)) {
      findings.push({ path: `${path}.${propName}`, kind: 'breaking', message: `property '${propName}' was removed` })
    } else {
      diffNode(`${path}.${propName}`, prop, newProps[propName], findings, depth + 1)
    }
  }
  for (const propName of Object.keys(newProps)) {
    if (!(propName in oldProps)) {
      findings.push({ path: `${path}.${propName}`, kind: 'added', message: `property '${propName}' was added` })
    }
  }

  // required — newly required breaks, no-longer-required is safe
  const oldRequired: string[] = Array.isArray(oldNode.required) ? oldNode.required : []
  const newRequired: string[] = Array.isArray(newNode.required) ? newNode.required : []
  for (const req of newRequired) {
    if (!oldRequired.includes(req)) {
      findings.push({ path, kind: 'breaking', message: `property '${req}' is now required` })
    }
  }
  for (const req of oldRequired) {
    if (!newRequired.includes(req)) {
      findings.push({ path, kind: 'compatible', message: `property '${req}' is no longer required` })
    }
  }
}

/** minimum/minLength/minItems: raising the floor rejects previously valid values. */
function tightenedLowerBound(key: string, oldNode: any, newNode: any, path: string, findings: DiffFinding[]) {
  const oldV = oldNode[key]
  const newV = newNode[key]
  if (oldV === undefined && newV !== undefined) {
    findings.push({ path, kind: 'breaking', message: `${key} ${newV} constraint was added` })
  } else if (oldV !== undefined && newV !== undefined && newV > oldV) {
    findings.push({ path, kind: 'breaking', message: `${key} raised from ${oldV} to ${newV}` })
  } else if (oldV !== undefined && newV !== undefined && newV < oldV) {
    findings.push({ path, kind: 'compatible', message: `${key} lowered from ${oldV} to ${newV}` })
  }
}

/** maximum/maxLength/maxItems: lowering the ceiling rejects previously valid values. */
function tightenedUpperBound(key: string, oldNode: any, newNode: any, path: string, findings: DiffFinding[]) {
  const oldV = oldNode[key]
  const newV = newNode[key]
  if (oldV === undefined && newV !== undefined) {
    findings.push({ path, kind: 'breaking', message: `${key} ${newV} constraint was added` })
  } else if (oldV !== undefined && newV !== undefined && newV < oldV) {
    findings.push({ path, kind: 'breaking', message: `${key} lowered from ${oldV} to ${newV}` })
  } else if (oldV !== undefined && newV !== undefined && newV > oldV) {
    findings.push({ path, kind: 'compatible', message: `${key} raised from ${oldV} to ${newV}` })
  }
}

function normalizeType(type: any): string | undefined {
  if (type === undefined || type === null) return undefined
  if (Array.isArray(type)) return type.filter(t => t !== 'null').sort().join('|') || undefined
  return String(type)
}

/* ── Paths ────────────────────────────────────────────────── */

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

function diffPaths(oldPaths: Record<string, any>, newPaths: Record<string, any>, findings: DiffFinding[]) {
  for (const [path, methods] of Object.entries(oldPaths)) {
    if (!(path in newPaths)) {
      findings.push({ path, kind: 'breaking', message: `endpoint '${path}' was removed` })
      continue
    }
    for (const method of Object.keys(methods ?? {})) {
      if (HTTP_METHODS.includes(method) && !(method in (newPaths[path] ?? {}))) {
        findings.push({ path: `${method.toUpperCase()} ${path}`, kind: 'breaking', message: `operation was removed` })
      }
    }
  }
  for (const [path, methods] of Object.entries(newPaths)) {
    if (!(path in oldPaths)) {
      findings.push({ path, kind: 'added', message: `endpoint '${path}' was added` })
      continue
    }
    for (const method of Object.keys(methods ?? {})) {
      if (HTTP_METHODS.includes(method) && !(method in (oldPaths[path] ?? {}))) {
        findings.push({ path: `${method.toUpperCase()} ${path}`, kind: 'added', message: `operation was added` })
      }
    }
  }
}

/* ── Report formatting ────────────────────────────────────── */

export function summarize(findings: DiffFinding[]) {
  return {
    breaking: findings.filter(f => f.kind === 'breaking').length,
    compatible: findings.filter(f => f.kind === 'compatible').length,
    added: findings.filter(f => f.kind === 'added').length,
  }
}

export function formatReport(findings: DiffFinding[], oldName: string, newName: string): string {
  const { breaking, compatible, added } = summarize(findings)
  const lines: string[] = [`Comparing ${oldName} → ${newName}`, '']

  if (findings.length === 0) {
    lines.push('No differences found.')
    return lines.join('\n')
  }

  const breakingList = findings.filter(f => f.kind === 'breaking')
  if (breakingList.length > 0) {
    lines.push(`BREAKING (${breakingList.length}):`)
    breakingList.forEach(f => lines.push(`  ✖ ${f.path}: ${f.message}`))
    lines.push('')
  }

  const compatibleList = findings.filter(f => f.kind === 'compatible')
  if (compatibleList.length > 0) {
    lines.push(`Non-breaking (${compatibleList.length}):`)
    compatibleList.forEach(f => lines.push(`  ~ ${f.path}: ${f.message}`))
    lines.push('')
  }

  const addedList = findings.filter(f => f.kind === 'added')
  if (addedList.length > 0) {
    lines.push(`Added (${addedList.length}):`)
    addedList.forEach(f => lines.push(`  + ${f.path}: ${f.message}`))
    lines.push('')
  }

  if (breaking > 0) {
    lines.push(`${breaking} breaking change${breaking > 1 ? 's' : ''} — this release WILL break API consumers.`)
  } else {
    lines.push('No breaking changes — safe to release.')
  }
  lines.push(`${breaking} breaking · ${compatible} non-breaking · ${added} added`)
  return lines.join('\n')
}
