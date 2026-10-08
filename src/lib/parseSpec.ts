import { parse } from 'yaml'

export type ParseResult =
  | { ok: true; spec: any }
  | { ok: false; error: string }

/**
 * Format a `yaml` library parse error with its position info, so users
 * can jump straight to the offending line instead of guessing.
 */
function formatYamlError(e: unknown): string {
  const err = e as { linePos?: Array<{ line: number; col: number }>; message?: string }
  if (err?.linePos?.[0]) {
    const { line, col } = err.linePos[0]
    const message = (err.message || 'syntax error').split('\n')[0]
    return `Invalid YAML at line ${line}, column ${col}: ${message}`
  }
  return 'Invalid OpenAPI spec (must be valid YAML or JSON)'
}

/**
 * Parse and validate an OpenAPI spec from a YAML/JSON string or object.
 * Runs entirely client-side — no server needed.
 */
export function parseSpecInput(spec: string | Record<string, unknown>): ParseResult {
  if (!spec || (typeof spec === 'string' && !spec.trim())) {
    return { ok: false, error: 'OpenAPI spec is required' }
  }

  let parsedSpec: any

  if (typeof spec === 'string') {
    try {
      parsedSpec = parse(spec)
    } catch (yamlError) {
      // A JSON string is also valid YAML, so reaching here means it's
      // neither — surface the YAML error (it carries the position info).
      try {
        parsedSpec = JSON.parse(spec)
      } catch {
        return { ok: false, error: formatYamlError(yamlError) }
      }
    }
  } else {
    parsedSpec = spec
  }

  if (!parsedSpec.openapi || !parsedSpec.info || !parsedSpec.paths) {
    return { ok: false, error: 'Invalid OpenAPI spec: missing required fields (openapi, info, paths)' }
  }

  return { ok: true, spec: parsedSpec }
}
