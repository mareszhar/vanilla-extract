/**
 * Diagnostics are a contract ([vanity-patterns.md §10]): exactly one per mistake,
 * naming the offending key and the fix. Stable `VANITY_*` codes are asserted
 * by the editor-DX suites; renaming one is a breaking change.
 */

export type VanityDiagnosticCode
  = | 'VANITY_TOKENS_CYCLE'
    | 'VANITY_TOKENS_CONTRAST'
    | 'VANITY_TOKENS_DUPLICATE'
    | 'VANITY_TOKENS_INVALID_COLOR'
    | 'VANITY_TOKENS_INVALID_OVERRIDE'
    | 'VANITY_TOKENS_UNKNOWN_REF'
    | 'VANITY_ENGINE_INCOMPATIBLE'
    | 'VANITY_ENGINE_COLLISION'
    | 'VANITY_SYSTEM_CONDITION_COLLISION'
    | 'VANITY_SYSTEM_INVALID_CONDITION'
    | 'VANITY_SYSTEM_INVALID_PREFIX'
    | 'VANITY_SYSTEM_INVALID_ROOT'
    | 'VANITY_SYSTEM_UNKNOWN_LAYER'
    | 'VANITY_CSS_INVALID_KEY'
    | 'VANITY_CSS_INVALID_RAW'
    | 'VANITY_CSS_INVALID_SELECTOR'
    | 'VANITY_CSS_INVALID_VALUE'
    | 'VANITY_CSS_UNKNOWN_CONDITION'
    | 'VANITY_CSS_UNKNOWN_PROPERTY'
    | 'VANITY_PORT_INVALID_DEFAULT'
    | 'VANITY_RECIPE_INVALID_KEY'
    | 'VANITY_RECIPE_UNKNOWN_VARIANT'
    | 'VANITY_RECIPE_UNKNOWN_VALUE'
    | 'VANITY_ANATOMY_UNKNOWN_PART'
    | 'VANITY_ANATOMY_INVALID_CONDITION'
    | 'VANITY_ATOMS_UNKNOWN_CONDITION'
    | 'VANITY_ATOMS_KEY_COLLISION'
    | 'VANITY_VITE_PLUGIN_MISSING'

export interface VanityDiagnostic {
  code: VanityDiagnosticCode
  /** The headline: what is wrong, naming the offending key or token path. */
  message: string
  /** Supporting detail lines (resolved values, comparisons). */
  detail?: string[]
  /** The dot path of the offending key, e.g. `color.onBrand`. */
  path?: string
  /** The style module being evaluated, when known. */
  file?: string
  /** One-based source line, present only when the compiler can prove it. */
  line?: number
  /** One-based source column, present only when the compiler can prove it. */
  column?: number
  /** The suggested fix. */
  fix?: string
}

function formatDiagnostic(diagnostic: VanityDiagnostic): string {
  const lines = [`✖ ${diagnostic.code}  ${diagnostic.message}`]

  for (const detail of diagnostic.detail ?? [])
    lines.push(`    ${detail}`)

  if (diagnostic.file) {
    const position = diagnostic.line === undefined
      ? ''
      : `:${diagnostic.line}${diagnostic.column === undefined ? '' : `:${diagnostic.column}`}`
    lines.push(`    at ${diagnostic.file}${position}`)
  }

  if (diagnostic.fix)
    lines.push(`  fix: ${diagnostic.fix}`)

  return lines.join('\n')
}

export class VanityError extends Error {
  readonly diagnostics: readonly VanityDiagnostic[]
  readonly code: VanityDiagnosticCode

  constructor(diagnostics: VanityDiagnostic | readonly VanityDiagnostic[]) {
    const input = Array.isArray(diagnostics) ? diagnostics as readonly VanityDiagnostic[] : [diagnostics as VanityDiagnostic]
    const all = input.map(enrichDiagnostic)
    super(all.map(formatDiagnostic).join('\n\n'))
    this.name = 'VanityError'
    this.diagnostics = all
    this.code = all[0].code
  }
}

interface VanitySourcePoint {
  line: number
  column: number
}

export interface VanitySourceLocation extends VanitySourcePoint {
  file: string
}

interface VanitySourceContext {
  file: string
  call: VanitySourcePoint
  locations: Record<string, VanitySourcePoint[]>
}

const SOURCE_MAPS = Symbol.for('vanity.sourceMaps')
const CURRENT_SOURCE = Symbol.for('vanity.currentSource')
const WITH_SOURCE = Symbol.for('vanity.withSource')

/** A style-module evaluation is one provenance universe; prior graphs cannot leak into it. */
export function resetDiagnosticSources(): void {
  const state = globalThis as typeof globalThis & Record<symbol, unknown>
  state[SOURCE_MAPS] = new Map<string, VanitySourceContext>()
  state[CURRENT_SOURCE] = undefined
  state[WITH_SOURCE] = <T>(context: VanitySourceContext, key: string, run: () => T): T => {
    state[CURRENT_SOURCE] = context
    const maps = state[SOURCE_MAPS] as Map<string, VanitySourceContext>
    maps.set(key, context)
    return run()
  }
}

function enrichDiagnostic(diagnostic: VanityDiagnostic): VanityDiagnostic {
  if (diagnostic.line !== undefined)
    return diagnostic

  const source = diagnosticSource(diagnostic.path)

  return source === undefined ? diagnostic : { ...diagnostic, ...source }
}

/** Exact compiler-owned provenance for manifests and diagnostics. */
export function diagnosticSource(path?: string): VanitySourceLocation | undefined {
  const state = globalThis as typeof globalThis & Record<symbol, unknown>
  const current = state[CURRENT_SOURCE] as VanitySourceContext | undefined
  const direct = current && pointFor(current, path)

  if (direct)
    return { file: current!.file, ...direct }

  const maps = state[SOURCE_MAPS]

  if (maps instanceof Map) {
    const matches: Array<{ context: VanitySourceContext, point: VanitySourcePoint }> = []

    for (const context of maps.values()) {
      const point = pointFor(context as VanitySourceContext, path)
      if (point)
        matches.push({ context: context as VanitySourceContext, point })
    }

    if (matches.length === 1)
      return { file: matches[0].context.file, ...matches[0].point }
  }

  // A call site is still trustworthy for diagnostics without a structural
  // path (setup/whole-call failures); never invent a property location.
  if (current && path === undefined)
    return { file: current.file, ...current.call }

  return undefined
}

function pointFor(context: VanitySourceContext, path: string | undefined): VanitySourcePoint | undefined {
  if (path === undefined)
    return undefined

  const exact = context.locations[path] ?? []

  if (exact.length === 1)
    return exact[0]

  const suffix = Object.entries(context.locations)
    .filter(([candidate]) => candidate.endsWith(`.${path}`))
    .flatMap(([, points]) => points)

  return suffix.length === 1 ? suffix[0] : undefined
}

/** `did you mean 'md'?` — the enumerable-fix suggestion, shared by overrides and checks. */
export function didYouMean(input: string, candidates: readonly string[]): string | undefined {
  let best: { candidate: string, distance: number } | undefined

  for (const candidate of candidates) {
    const distance = editDistance(input, candidate)

    if (distance <= Math.max(2, Math.floor(candidate.length / 3)) && (!best || distance < best.distance))
      best = { candidate, distance }
  }

  return best?.candidate
}

function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = Array.from<number>({ length: b.length + 1 }).fill(0)
    row[0] = i
    return row
  })

  for (let j = 0; j <= b.length; j++)
    rows[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }

  return rows[a.length][b.length]
}
